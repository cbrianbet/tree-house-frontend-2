"use client";

import React, { useCallback, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DM_Mono, DM_Sans } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import {
  getAccount,
  updateAccount,
  getMyProfile,
  updateMyProfile,
  changePassword,
} from "@/lib/api/auth";
import { listProperties, listUnits } from "@/lib/api/properties";
import type { AccountInfo, ApiErrorDetail, LandlordProfile } from "@/types/api";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";
import { FD, financeGbtn, financePbtn } from "@/constants/financeDesign";
import { AxiosError } from "axios";
import PageLoader from "@/components/ui/PageLoader";
import {
  ROLE_ADMIN,
  ROLE_TENANT,
  ROLE_LANDLORD,
  ROLE_AGENT,
  ROLE_ARTISAN,
  ROLE_MOVING,
} from "@/constants/roles";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: FD.k5,
  marginBottom: 5,
  letterSpacing: "0.4px",
  textTransform: "uppercase",
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: "0 12px",
  background: FD.k0,
  border: `0.5px solid ${FD.bdm}`,
  borderRadius: FD.rmd,
  fontSize: 13,
  color: FD.k9,
  height: 38,
  outline: "none",
  fontFamily: "inherit",
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

function initials(first: string, last: string) {
  const a = (first || "").trim()[0] ?? "";
  const b = (last || "").trim()[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, refreshUser, roleName, logout } = useAuth();
  const font = dmSans.style.fontFamily;
  const mono = dmMono.style.fontFamily;

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [landlordStats, setLandlordStats] = useState<{ props: number; units: number } | null>(null);

  const [pwNew, setPwNew] = useState("");
  const [pwStrength, setPwStrength] = useState({ w: 0, bg: "transparent", label: "Enter a new password", width: "0%" });

  const roleId = user?.role ?? 0;

  const load = useCallback(async () => {
    if (!user) return;
    const rid = user.role;
    try {
      const acc = await getAccount();
      setAccount(acc);
      const prof =
        rid !== ROLE_ADMIN ? ((await getMyProfile()) as Record<string, unknown>) : null;
      setProfile(prof);

      if (rid === ROLE_LANDLORD) {
        try {
          const props = await listProperties();
          const unitLists = await Promise.all(props.map((p) => listUnits(p.id).catch(() => [])));
          const units = unitLists.reduce((s, u) => s + u.length, 0);
          setLandlordStats({ props: props.length, units });
        } catch {
          setLandlordStats(null);
        }
      } else {
        setLandlordStats(null);
      }
    } catch {
      toast("Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  function checkPw(v: string) {
    if (!v) {
      setPwStrength({ w: 0, bg: "transparent", label: "Enter a new password", width: "0%" });
      return;
    }
    if (v.length < 8) {
      setPwStrength({ w: 0, bg: "#E24B4A", label: "Too short", width: "20%" });
      return;
    }
    let extra = 0;
    if (/[A-Z]/.test(v)) extra++;
    if (/[0-9]/.test(v)) extra++;
    if (/[^A-Za-z0-9]/.test(v)) extra++;
    const i = Math.min(extra, 3);
    const widths = ["40%", "60%", "80%", "100%"];
    const colors = ["#EF9F27", "#1D9E75", "#1D9E75", "#0F6E56"];
    const labels = ["Fair", "Good", "Good", "Strong"];
    setPwStrength({ w: i, bg: colors[i], label: labels[i], width: widths[i] });
  }

  async function handleAccountSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!account) return;
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const updated = await updateAccount({
        first_name: fd.get("first_name") as string,
        last_name: fd.get("last_name") as string,
        phone: fd.get("phone") as string,
        email: fd.get("email") as string,
      });
      setAccount(updated);
      await refreshUser();
      setDirty(false);
      toast("Account updated.");
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorDetail>;
      toast(axErr.response?.data?.detail ?? "Failed to update.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProfileSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    fd.forEach((v, k) => {
      data[k] = v as string;
    });
    if (roleId === ROLE_MOVING && typeof data.service_areas === "string") {
      data.service_areas = (data.service_areas as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    try {
      const updated = await updateMyProfile(data);
      setProfile(updated as Record<string, unknown>);
      setDirty(false);
      toast("Profile updated.");
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorDetail>;
      toast(axErr.response?.data?.detail ?? "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordChange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const old_password = fd.get("old_password") as string;
    const new_password1 = fd.get("new_password1") as string;
    const new_password2 = fd.get("new_password2") as string;
    if (new_password1 !== new_password2) {
      toast("New passwords do not match.");
      setSubmitting(false);
      return;
    }
    try {
      await changePassword({ old_password, new_password1, new_password2 });
      toast("Password changed.");
      e.currentTarget.reset();
      setPwNew("");
      setPwStrength({ w: 0, bg: "transparent", label: "Enter a new password", width: "0%" });
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorDetail>;
      const data = axErr.response?.data;
      const msg =
        data?.old_password?.[0] ??
        data?.new_password2?.[0] ??
        data?.detail ??
        "Failed to change password.";
      toast(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading || !account || !user) {
    return <PageLoader />;
  }

  const landlord = roleId === ROLE_LANDLORD && profile ? (profile as LandlordProfile) : null;
  const chips: string[] = [roleName(roleId)];
  if (roleId === ROLE_LANDLORD && landlordStats) {
    chips.push(`${landlordStats.props} propert${landlordStats.props === 1 ? "y" : "ies"} · ${landlordStats.units} units`);
  }

  const card: React.CSSProperties = {
    background: FD.wh,
    border: `0.5px solid ${FD.bd}`,
    borderRadius: FD.rlg,
    padding: "18px 20px",
  };

  return (
    <div
      className={`${dmSans.className} -mx-4 md:-mx-6`}
      style={{ fontFamily: font, fontSize: 14, color: FD.k9, background: FD.surf, minHeight: "100%" }}
    >
      <FinancePageTopBar
        className="-mt-4 md:-mt-6"
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Profile & settings" },
        ]}
        right={
          <button
            type="button"
            onClick={() => void logout().then(() => router.replace("/signin"))}
            style={financeGbtn(font)}
            className="transition-colors hover:bg-[#F2F1EB]"
          >
            Log out
          </button>
        }
      />

      <div style={{ padding: "22px 24px" }}>
        {/* Hero */}
        <div
          style={{
            background: FD.wh,
            border: `0.5px solid ${FD.bd}`,
            borderRadius: FD.rxl,
            padding: "22px 26px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: FD.g7,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 500,
                color: "#fff",
              }}
            >
              {initials(account.first_name, account.last_name)}
            </div>
            <button
              type="button"
              title="Photo upload coming soon"
              onClick={() => toast("Photo upload coming soon")}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: FD.wh,
                border: `1.5px solid ${FD.bd}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={FD.k5} strokeWidth={2} strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: FD.k9, marginBottom: 3 }}>
              {account.first_name} {account.last_name}
            </div>
            <div style={{ fontSize: 13, color: FD.k5 }}>
              {account.email}
              {account.phone ? ` · ${account.phone}` : ""}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {chips.map((c) => (
                <span
                  key={c}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 500,
                    background: c === roleName(roleId) ? FD.g1 : FD.k0,
                    color: c === roleName(roleId) ? "#085041" : FD.k7,
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            {roleId === ROLE_LANDLORD && landlord?.verified ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  background: FD.g1,
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#085041",
                }}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#085041" strokeWidth={2.5} strokeLinecap="round">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
                Verified
              </div>
            ) : null}
          </div>
        </div>

        {dirty && (
          <div
            style={{
              background: FD.a0,
              border: `0.5px solid ${FD.a1}`,
              borderRadius: FD.rlg,
              padding: "11px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 13, color: FD.a7 }}>You have unsaved changes — use Save in each section.</div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 18, alignItems: "start" }} className="max-lg:grid-cols-1">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Personal */}
            <div id="settings-personal" style={card}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9 }}>Personal information</div>
                <div style={{ fontSize: 12, color: FD.k5, marginTop: 2 }}>Your name and contact details</div>
              </div>
              <form onSubmit={handleAccountSave}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="max-sm:grid-cols-1">
                  <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>First name</label>
                    <input name="first_name" defaultValue={account.first_name} style={inp} onChange={() => setDirty(true)} required />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>Last name</label>
                    <input name="last_name" defaultValue={account.last_name} style={inp} onChange={() => setDirty(true)} required />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Email address</label>
                  <input name="email" type="email" defaultValue={account.email} style={inp} onChange={() => setDirty(true)} required />
                  <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>Used for invoices, notifications and login</div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Phone number</label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={account.phone}
                    style={{ ...inp, fontFamily: mono }}
                    onChange={() => setDirty(true)}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 14, borderTop: `0.5px solid ${FD.bd}` }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={financePbtn(font)}
                    onMouseEnter={(e) => {
                      if (!submitting) e.currentTarget.style.background = FD.primaryHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = FD.g7;
                    }}
                  >
                    {submitting ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </div>

            {/* Role profile */}
            {profile && roleId !== ROLE_ADMIN && (
              <div id="settings-company" style={card}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9 }}>
                    {roleId === ROLE_LANDLORD ? "Company & business details" : `${roleName(roleId)} profile`}
                  </div>
                  <div style={{ fontSize: 12, color: FD.k5, marginTop: 2 }}>
                    {roleId === ROLE_LANDLORD ? "Shown on invoices and lease documents" : "Role-specific information"}
                  </div>
                </div>
                <form onSubmit={handleProfileSave}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="max-sm:grid-cols-1">
                    {roleId === ROLE_TENANT && (
                      <>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>National ID</label>
                          <input name="national_id" defaultValue={String(profile.national_id ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>Emergency contact name</label>
                          <input name="emergency_contact_name" defaultValue={String(profile.emergency_contact_name ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                        <div style={{ marginBottom: 14 }} className="sm:col-span-2">
                          <label style={lbl}>Emergency contact phone</label>
                          <input name="emergency_contact_phone" defaultValue={String(profile.emergency_contact_phone ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                      </>
                    )}
                    {roleId === ROLE_LANDLORD && (
                      <>
                        <div style={{ marginBottom: 14 }} className="sm:col-span-2">
                          <label style={lbl}>Company / trading name</label>
                          <input name="company_name" defaultValue={String(profile.company_name ?? "")} style={inp} onChange={() => setDirty(true)} />
                          <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>Leave blank to use your full name on documents</div>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>KRA PIN / Tax ID</label>
                          <input name="tax_id" defaultValue={String(profile.tax_id ?? "")} style={{ ...inp, fontFamily: mono }} onChange={() => setDirty(true)} />
                        </div>
                      </>
                    )}
                    {roleId === ROLE_AGENT && (
                      <>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>Agency name</label>
                          <input name="agency_name" defaultValue={String(profile.agency_name ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>License number</label>
                          <input name="license_number" defaultValue={String(profile.license_number ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>Commission rate (%)</label>
                          <input name="commission_rate" defaultValue={String(profile.commission_rate ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                      </>
                    )}
                    {roleId === ROLE_ARTISAN && (
                      <>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>Trade</label>
                          <input name="trade" defaultValue={String(profile.trade ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                        <div style={{ marginBottom: 14 }} className="sm:col-span-2">
                          <label style={lbl}>Bio</label>
                          <input name="bio" defaultValue={String(profile.bio ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                      </>
                    )}
                    {roleId === ROLE_MOVING && (
                      <>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>Company name</label>
                          <input name="company_name" defaultValue={String(profile.company_name ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                        <div style={{ marginBottom: 14 }} className="sm:col-span-2">
                          <label style={lbl}>Description</label>
                          <input name="description" defaultValue={String(profile.description ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>Phone</label>
                          <input name="phone" defaultValue={String(profile.phone ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>City</label>
                          <input name="city" defaultValue={String(profile.city ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                        <div style={{ marginBottom: 14 }} className="sm:col-span-2">
                          <label style={lbl}>Address</label>
                          <input name="address" defaultValue={String(profile.address ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                        <div style={{ marginBottom: 14 }} className="sm:col-span-2">
                          <label style={lbl}>Service areas (comma-separated)</label>
                          <input
                            name="service_areas"
                            defaultValue={Array.isArray(profile.service_areas) ? (profile.service_areas as string[]).join(", ") : ""}
                            style={inp}
                            onChange={() => setDirty(true)}
                          />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>Base price (KES)</label>
                          <input name="base_price" defaultValue={String(profile.base_price ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>Price per km (KES)</label>
                          <input name="price_per_km" defaultValue={String(profile.price_per_km ?? "")} style={inp} onChange={() => setDirty(true)} />
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 14, borderTop: `0.5px solid ${FD.bd}` }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={financePbtn(font)}
                      onMouseEnter={(e) => {
                        if (!submitting) e.currentTarget.style.background = FD.primaryHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = FD.g7;
                      }}
                    >
                      {submitting ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Password */}
            <div id="settings-password" style={card}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9 }}>Change password</div>
                <div style={{ fontSize: 12, color: FD.k5, marginTop: 2 }}>Use a strong password you do not use elsewhere</div>
              </div>
              <form onSubmit={handlePasswordChange}>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Current password</label>
                  <input name="old_password" type="password" style={inp} autoComplete="current-password" required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>New password</label>
                  <input
                    name="new_password1"
                    type="password"
                    style={inp}
                    autoComplete="new-password"
                    value={pwNew}
                    onChange={(e) => {
                      setPwNew(e.target.value);
                      checkPw(e.target.value);
                    }}
                    required
                  />
                  <div style={{ height: 4, background: FD.k1, borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: pwNew ? pwStrength.width : "0%",
                        background: pwNew ? pwStrength.bg : "transparent",
                        borderRadius: 2,
                        transition: "width 0.3s, background 0.3s",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: FD.k5, marginTop: 3 }}>{pwStrength.label}</div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Confirm new password</label>
                  <input name="new_password2" type="password" style={inp} autoComplete="new-password" required />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 14, borderTop: `0.5px solid ${FD.bd}` }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={financePbtn(font)}
                    onMouseEnter={(e) => {
                      if (!submitting) e.currentTarget.style.background = FD.primaryHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = FD.g7;
                    }}
                  >
                    {submitting ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            </div>

            {/* Connected accounts — placeholder */}
            <div id="settings-connected" style={card}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9 }}>Connected accounts</div>
                <div style={{ fontSize: 12, color: FD.k5, marginTop: 2 }}>Linked payment and identity services</div>
              </div>
              <div style={{ fontSize: 12, color: FD.k5, lineHeight: 1.6 }}>
                Connect M-Pesa, bank, or card billing from{" "}
                <Link href="/billing/config" style={{ color: FD.g7, fontWeight: 500, textDecoration: "none" }}>
                  Billing configuration
                </Link>{" "}
                per property.
              </div>
            </div>

            {/* Danger */}
            <div
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.r3}`,
                borderRadius: FD.rlg,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: FD.r6, marginBottom: 4 }}>Danger zone</div>
              <div style={{ fontSize: 12, color: FD.k5, marginBottom: 14, lineHeight: 1.5 }}>
                These actions are permanent. Contact support to deactivate your account or export data.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => toast("Contact support to deactivate your account.")}
                  style={{
                    height: 36,
                    padding: "0 16px",
                    background: FD.r0,
                    color: FD.r6,
                    border: `0.5px solid ${FD.r3}`,
                    borderRadius: FD.rmd,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: font,
                  }}
                >
                  Deactivate account
                </button>
                <button
                  type="button"
                  onClick={() => toast("Data export — contact support.")}
                  style={{
                    height: 36,
                    padding: "0 16px",
                    background: FD.r0,
                    color: FD.r6,
                    border: `0.5px solid ${FD.r3}`,
                    borderRadius: FD.rmd,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: font,
                  }}
                >
                  Export my data
                </button>
              </div>
            </div>
          </div>

          {/* Side nav */}
          <div>
            <div
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rlg,
                overflow: "hidden",
                position: "sticky",
                top: 0,
              }}
            >
              {[
                { id: "settings-personal", label: "Personal info", icon: "user" as const },
                ...(profile && roleId !== ROLE_ADMIN
                  ? [{ id: "settings-company", label: roleId === ROLE_LANDLORD ? "Company & tax" : "Role profile", icon: "home" as const }]
                  : []),
                { id: "settings-password", label: "Password", icon: "lock" as const },
                { id: "settings-connected", label: "Connected accounts", icon: "link" as const },
              ].map((item, i, arr) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToId(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "11px 14px",
                    fontSize: 13,
                    color: FD.k7,
                    cursor: "pointer",
                    border: "none",
                    borderBottom: i < arr.length - 1 ? `0.5px solid ${FD.bd}` : "none",
                    width: "100%",
                    textAlign: "left",
                    background: FD.wh,
                    fontFamily: font,
                  }}
                  className="transition-colors hover:bg-[#F7F6F2]"
                >
                  <SideIcon kind={item.icon} />
                  {item.label}
                </button>
              ))}
              <Link
                href="/settings/notifications"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "11px 14px",
                  fontSize: 13,
                  color: FD.k7,
                  textDecoration: "none",
                  fontWeight: 500,
                  borderTop: `0.5px solid ${FD.bd}`,
                }}
                className="transition-colors hover:bg-[#F7F6F2]"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={FD.k7} strokeWidth={1.8}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Notifications
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideIcon({ kind }: { kind: "user" | "home" | "lock" | "link" }) {
  const stroke = FD.k7;
  if (kind === "user")
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  if (kind === "home")
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  if (kind === "lock")
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
