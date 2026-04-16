"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DM_Mono, DM_Sans } from "next/font/google";
import { getAccount, getNotificationPreferences, updateNotificationPreferences } from "@/lib/api/auth";
import type { AccountInfo, NotificationPreferences } from "@/types/api";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";
import { FD, financeGbtn, financePbtn } from "@/constants/financeDesign";
import PageLoader from "@/components/ui/PageLoader";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

type PrefKey = keyof Omit<NotificationPreferences, "updated_at">;

const ALL_PREF_KEYS: PrefKey[] = [
  "email_notifications",
  "payment_due_reminder",
  "payment_received",
  "maintenance_updates",
  "new_maintenance_request",
  "new_application",
  "application_status_change",
  "lease_expiry_notice",
];

type RowDef = {
  label: string;
  sub: string;
  key: PrefKey | null;
};

type CatDef = {
  id: string;
  title: string;
  sub: string;
  iconBg: string;
  iconStroke: string;
  icon: React.ReactNode;
  rows: RowDef[];
};

function toast(msg: string) {
  const div = document.createElement("div");
  div.textContent = msg;
  Object.assign(div.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: FD.k9,
    color: "#fff",
    padding: "9px 16px",
    borderRadius: `${FD.rmd}px`,
    fontSize: "13px",
    fontWeight: "500",
    zIndex: "9999",
  });
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2200);
}

function CheckIcon() {
  return (
    <svg width={11} height={11} viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
      <polyline points="2,6 5,9 10,3" />
    </svg>
  );
}

function ChannelToggle({
  on,
  disabled,
  onClick,
  title: titleAttr,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          border: `0.5px solid ${on ? FD.g7 : FD.bdm}`,
          background: on ? FD.g7 : FD.wh,
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.45 : 1,
          padding: 0,
        }}
        title={titleAttr ?? (disabled ? "Not available for this alert type yet" : undefined)}
      >
        {on && !disabled ? <CheckIcon /> : null}
      </button>
    </div>
  );
}

const CATEGORIES: CatDef[] = [
  {
    id: "payments",
    title: "Payments & invoices",
    sub: "Rent receipts, overdue alerts, invoice actions",
    iconBg: FD.g1,
    iconStroke: FD.g7,
    icon: (
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    rows: [
      { label: "Payment received", sub: "When a tenant pays an invoice", key: "payment_received" },
      { label: "Invoice overdue", sub: "When a tenant's payment is late", key: "payment_due_reminder" },
      { label: "Invoice generated", sub: "When monthly invoices are auto-created", key: null },
      { label: "Monthly financial summary", sub: "Revenue, expenses and occupancy digest", key: null },
    ],
  },
  {
    id: "tenants",
    title: "Tenants & leases",
    sub: "Applications, lease expiry, move-in/out",
    iconBg: FD.b0,
    iconStroke: FD.b8,
    icon: (
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
    rows: [
      { label: "New application received", sub: "When someone applies for a vacant unit", key: "new_application" },
      { label: "Lease expiring soon", sub: "Before a lease ends", key: "lease_expiry_notice" },
      { label: "Application status updates", sub: "Approved, rejected, or pending changes", key: "application_status_change" },
      { label: "Tenant move-out notice", sub: "When a tenant gives notice to vacate", key: null },
    ],
  },
  {
    id: "maintenance",
    title: "Maintenance",
    sub: "Requests, bids, completions",
    iconBg: FD.a0,
    iconStroke: FD.a7,
    icon: (
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    rows: [
      { label: "New maintenance request", sub: "When a tenant logs a new issue", key: "new_maintenance_request" },
      { label: "Maintenance updates", sub: "Bids, completions, and status changes", key: "maintenance_updates" },
    ],
  },
  {
    id: "disputes",
    title: "Disputes & messages",
    sub: "Tenant disputes, direct messages",
    iconBg: FD.r0,
    iconStroke: FD.r6,
    icon: (
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    rows: [
      { label: "New dispute raised", sub: "When a tenant opens a dispute", key: null },
      { label: "Direct message", sub: "When someone messages you", key: null },
    ],
  },
];

function fmtSaved(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export default function NotificationPreferencesPage() {
  const font = dmSans.style.fontFamily;

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [quietOn, setQuietOn] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [acc, p] = await Promise.all([getAccount(), getNotificationPreferences()]);
      setAccount(acc);
      setPrefs(p);
    } catch {
      toast("Could not load preferences.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const masterOn = useMemo(() => {
    if (!prefs) return true;
    return ALL_PREF_KEYS.every((k) => prefs[k] === true);
  }, [prefs]);

  async function patchPrefs(patch: Partial<Omit<NotificationPreferences, "updated_at">>) {
    if (!prefs) return;
    try {
      const updated = await updateNotificationPreferences(patch);
      setPrefs(updated);
    } catch {
      toast("Could not update preferences.");
    }
  }

  async function toggleMaster() {
    if (!prefs) return;
    const next = !masterOn;
    const patch = Object.fromEntries(ALL_PREF_KEYS.map((k) => [k, next])) as Partial<
      Omit<NotificationPreferences, "updated_at">
    >;
    await patchPrefs(patch);
    toast(next ? "All notifications enabled" : "All notifications paused");
  }

  async function toggleRow(key: PrefKey, current: boolean) {
    await patchPrefs({ [key]: !current });
  }

  async function resetDefaults() {
    const patch = Object.fromEntries(ALL_PREF_KEYS.map((k) => [k, true])) as Partial<
      Omit<NotificationPreferences, "updated_at">
    >;
    await patchPrefs(patch);
    toast("Preferences reset to defaults");
  }

  function scrollToCat(id: string) {
    document.getElementById(`notif-cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading || !prefs) {
    return <PageLoader />;
  }

  return (
    <div
      className={`${dmSans.className} -mx-4 md:-mx-6`}
      style={{ fontFamily: font, fontSize: 14, color: FD.k9, background: FD.surf, minHeight: "100%" }}
    >
      <FinancePageTopBar
        className="-mt-4 md:-mt-6"
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Profile", href: "/settings" },
          { label: "Notification preferences" },
        ]}
        right={
          <button
            type="button"
            onClick={() => void load().then(() => toast("Preferences saved"))}
            style={financePbtn(font)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = FD.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = FD.g7;
            }}
          >
            Save preferences
          </button>
        }
      />

      <div style={{ padding: "22px 24px" }}>
        {/* Master switch */}
        <div
          style={{
            background: FD.g7,
            borderRadius: FD.rxl,
            padding: "20px 24px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#fff", marginBottom: 2 }}>All notifications</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              Turn off to pause notification types below (delivery is primarily email today)
            </div>
          </div>
          <button
            type="button"
            onClick={() => void toggleMaster()}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: masterOn ? FD.g3 : "rgba(255,255,255,0.25)",
              cursor: "pointer",
              position: "relative",
              border: "none",
              padding: 0,
              flexShrink: 0,
            }}
            aria-pressed={masterOn}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: 2,
                left: masterOn ? 22 : 2,
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 18, alignItems: "start" }} className="max-lg:grid-cols-1">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                id={`notif-cat-${cat.id}`}
                style={{
                  background: FD.wh,
                  border: `0.5px solid ${FD.bd}`,
                  borderRadius: FD.rlg,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 18px",
                    borderBottom: `0.5px solid ${FD.bd}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: FD.rsm,
                      background: cat.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: cat.iconStroke,
                    }}
                  >
                    {cat.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: FD.k9 }}>{cat.title}</div>
                    <div style={{ fontSize: 11, color: FD.k5, marginTop: 1 }}>{cat.sub}</div>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 70px 70px 70px",
                    padding: "7px 18px",
                    background: FD.k0,
                    alignItems: "center",
                  }}
                  className="max-sm:grid-cols-1 max-sm:gap-1 max-sm:hidden"
                >
                  <div />
                  <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px", color: FD.k5, textAlign: "center" }}>
                    Email
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px", color: FD.k5, textAlign: "center" }}>
                    Push
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px", color: FD.k5, textAlign: "center" }}>
                    SMS
                  </div>
                </div>
                {cat.rows.map((row, ri) => {
                  const on = row.key ? prefs[row.key] === true : false;
                  const disabled = row.key == null;
                  const toggle = () => {
                    if (row.key) void toggleRow(row.key, on);
                  };
                  return (
                    <div
                      key={`${cat.id}-${ri}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 70px 70px 70px",
                        gap: 0,
                        padding: "12px 18px",
                        borderBottom: ri < cat.rows.length - 1 ? `0.5px solid ${FD.bd}` : "none",
                        alignItems: "center",
                      }}
                      className="max-sm:grid-cols-1 max-sm:gap-2"
                    >
                      <div>
                        <div style={{ fontSize: 13, color: FD.k9 }}>{row.label}</div>
                        <div style={{ fontSize: 11, color: FD.k5, marginTop: 2 }}>{row.sub}</div>
                      </div>
                      <ChannelToggle
                        on={on}
                        disabled={disabled}
                        onClick={() => {
                          if (!disabled) toggle();
                        }}
                      />
                      <ChannelToggle on={false} disabled title="Push delivery — backend support pending" onClick={() => {}} />
                      <ChannelToggle on={false} disabled title="SMS delivery — backend support pending" onClick={() => {}} />
                    </div>
                  );
                })}
              </div>
            ))}

            <div id="notif-quiet" style={{ background: FD.wh, border: `0.5px solid ${FD.bd}`, borderRadius: FD.rlg, padding: "18px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9, marginBottom: 4 }}>Quiet hours</div>
              <div style={{ fontSize: 12, color: FD.k5, marginBottom: 16, lineHeight: 1.5 }}>
                Pause push and SMS during these hours (UI preview only —{" "}
                <span className={dmMono.className} style={{ fontSize: 11 }}>
                  not saved to server yet
                </span>
                ).
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: FD.k9 }}>Enable quiet hours</div>
                <button
                  type="button"
                  onClick={() => setQuietOn((q) => !q)}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    background: quietOn ? FD.g5 : FD.k2,
                    cursor: "pointer",
                    position: "relative",
                    border: "none",
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute",
                      top: 2,
                      left: quietOn ? 20 : 2,
                      transition: "left 0.2s",
                    }}
                  />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, opacity: quietOn ? 1 : 0.45, pointerEvents: quietOn ? "auto" : "none" }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: FD.k5, marginBottom: 5, letterSpacing: "0.4px", textTransform: "uppercase" }}>
                    From
                  </label>
                  <select style={{ width: "100%", height: 36, padding: "0 10px", background: FD.k0, border: `0.5px solid ${FD.bdm}`, borderRadius: FD.rmd, fontSize: 13, fontFamily: font, color: FD.k9 }}>
                    <option>10:00 PM</option>
                    <option>9:00 PM</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: FD.k5, marginBottom: 5, letterSpacing: "0.4px", textTransform: "uppercase" }}>
                    Until
                  </label>
                  <select style={{ width: "100%", height: 36, padding: "0 10px", background: FD.k0, border: `0.5px solid ${FD.bdm}`, borderRadius: FD.rmd, fontSize: 13, fontFamily: font, color: FD.k9 }}>
                    <option>7:00 AM</option>
                    <option>8:00 AM</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ background: FD.wh, border: `0.5px solid ${FD.bd}`, borderRadius: FD.rlg, overflow: "hidden", position: "sticky", top: 0 }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCat(cat.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "11px 14px",
                    fontSize: 13,
                    color: FD.k7,
                    cursor: "pointer",
                    border: "none",
                    borderBottom: `0.5px solid ${FD.bd}`,
                    width: "100%",
                    textAlign: "left",
                    background: FD.wh,
                    fontFamily: font,
                  }}
                  className="transition-colors hover:bg-[#F7F6F2]"
                >
                  <span style={{ color: FD.k7, display: "flex" }}>{cat.icon}</span>
                  <span>{cat.title}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => document.getElementById("notif-quiet")?.scrollIntoView({ behavior: "smooth" })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "11px 14px",
                  fontSize: 13,
                  color: FD.k7,
                  cursor: "pointer",
                  border: "none",
                  width: "100%",
                  textAlign: "left",
                  background: FD.wh,
                  fontFamily: font,
                }}
                className="transition-colors hover:bg-[#F7F6F2]"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={FD.k7} strokeWidth={1.8}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Quiet hours
              </button>
            </div>

            <div
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rlg,
                padding: 16,
                marginTop: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                  color: FD.k5,
                  marginBottom: 10,
                }}
              >
                Delivery channels
              </div>
              <div style={{ fontSize: 12, color: FD.k7, lineHeight: 1.6 }}>
                <strong>Email:</strong> {account?.email ?? "—"}
                <br />
                <strong>Phone:</strong>{" "}
                <span className={dmMono.className} style={{ fontSize: 12 }}>
                  {account?.phone || "—"}
                </span>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: FD.k5 }}>
                Update contact details in{" "}
                <Link href="/settings" style={{ color: FD.g7, textDecoration: "none", fontWeight: 500 }}>
                  Profile settings
                </Link>
                .
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          background: FD.wh,
          borderTop: `0.5px solid ${FD.bd}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 12, color: FD.k5 }}>Last saved: {fmtSaved(prefs.updated_at)}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => void resetDefaults()} style={financeGbtn(font)}>
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={() => void load().then(() => toast("Preferences saved"))}
            style={financePbtn(font)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = FD.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = FD.g7;
            }}
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}
