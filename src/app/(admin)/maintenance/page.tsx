"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DM_Sans } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import { listRequests } from "@/lib/api/maintenance";
import { listProperties, listUnits } from "@/lib/api/properties";
import type { MaintenanceCategory, MaintenanceRequest, Property, Unit } from "@/types/api";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";
import {
  FD,
  FINANCE_FIELD_CLASS,
  financeFsel,
  financePbtn,
} from "@/constants/financeDesign";
import { ROLE_ADMIN, ROLE_AGENT, ROLE_LANDLORD, ROLE_TENANT } from "@/constants/roles";
import PageLoader from "@/components/ui/PageLoader";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

const CATEGORIES: MaintenanceCategory[] = [
  "plumbing",
  "electrical",
  "carpentry",
  "painting",
  "masonry",
  "other",
];

function categoryVisual(cat: MaintenanceCategory): { bg: string; stroke: string; key: string } {
  switch (cat) {
    case "plumbing":
      return { bg: "#DBEAFE", stroke: "#1D4ED8", key: "plumb" };
    case "electrical":
      return { bg: "#FEF9C3", stroke: "#A16207", key: "elec" };
    case "masonry":
      return { bg: FD.r0, stroke: FD.r6, key: "struct" };
    case "carpentry":
      return { bg: FD.g1, stroke: FD.g7, key: "pest" };
    case "painting":
      return { bg: FD.b0, stroke: FD.b8, key: "appliance" };
    default:
      return { bg: FD.k0, stroke: FD.k5, key: "other" };
  }
}

function priorityBorder(p: string): string {
  if (p === "urgent") return FD.r6;
  if (p === "high" || p === "medium") return FD.a5;
  if (p === "low") return "#378ADD";
  return FD.g5;
}

function statusBadgeStyle(status: string): { bg: string; color: string; label: string } {
  switch (status) {
    case "submitted":
    case "open":
      return { bg: FD.a0, color: FD.a7, label: "Open" };
    case "assigned":
    case "in_progress":
      return { bg: FD.b0, color: FD.b8, label: "In progress" };
    case "completed":
      return { bg: FD.g1, color: FD.activeBadgeText, label: "Resolved" };
    case "cancelled":
      return { bg: FD.k0, color: FD.k5, label: "Cancelled" };
    case "rejected":
      return { bg: FD.r0, color: FD.r6, label: "Rejected" };
    default:
      return { bg: FD.k0, color: FD.k5, label: status.replace(/_/g, " ") };
  }
}

const TAG: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 500,
  lineHeight: "16px",
};

function priorityTag(p: string) {
  const urgent = p === "urgent";
  const low = p === "low";
  const bg = urgent ? FD.r0 : low ? FD.b0 : FD.a0;
  const color = urgent ? FD.r6 : low ? FD.b8 : FD.a7;
  const label = p.charAt(0).toUpperCase() + p.slice(1);
  return <span style={{ ...TAG, background: bg, color }}>{label}</span>;
}

function relativeAge(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function WrenchIcon({ stroke }: { stroke: string }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={1.8}
      strokeLinecap="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export default function MaintenancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const font = dmSans.style.fontFamily;

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [propFilter, setPropFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [reqs, props] = await Promise.all([
          listRequests(),
          [ROLE_LANDLORD, ROLE_ADMIN, ROLE_AGENT].includes(user?.role ?? 0)
            ? listProperties().catch(() => [])
            : Promise.resolve([] as Property[]),
        ]);
        if (!cancelled) {
          setRequests(reqs);
          setProperties(props);
        }
      } catch {
        if (!cancelled) setRequests([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (user) void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const propName = useMemo(() => {
    const m = new Map<number, string>();
    properties.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [properties]);

  const [unitNames, setUnitNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    if (requests.length === 0) return;
    const propIds = [...new Set(requests.map((r) => r.property))];
    const existing = new Set(unitNames.keys());
    const needFetch = propIds.filter((pid) => {
      const hasUnitsForProp = requests
        .filter((r) => r.property === pid && r.unit != null)
        .every((r) => existing.has(r.unit!));
      return !hasUnitsForProp;
    });
    if (needFetch.length === 0) return;
    Promise.all(needFetch.map((pid) => listUnits(pid).catch(() => [] as Unit[])))
      .then((results) => {
        setUnitNames((prev) => {
          const next = new Map(prev);
          results.flat().forEach((u) => next.set(u.id, u.name));
          return next;
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (propFilter && String(r.property) !== propFilter) return false;
      if (catFilter && r.category !== catFilter) return false;
      if (statusFilter) {
        if (statusFilter === "open_group") {
          if (!["submitted", "open"].includes(r.status)) return false;
        } else if (statusFilter === "progress_group") {
          if (!["assigned", "in_progress"].includes(r.status)) return false;
        } else if (r.status !== statusFilter) return false;
      }
      if (q.trim()) {
        const s = `${r.title} ${r.description} ${r.category}`.toLowerCase();
        if (!s.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [requests, propFilter, catFilter, statusFilter, q]);

  const stats = useMemo(() => {
    const open = requests.filter((r) => ["submitted", "open"].includes(r.status)).length;
    const progress = requests.filter((r) => ["assigned", "in_progress"].includes(r.status)).length;
    const completed = requests.filter((r) => r.status === "completed").length;
    return { open, progress, completed };
  }, [requests]);

  const canNew = user && [ROLE_TENANT, ROLE_LANDLORD, ROLE_ADMIN].includes(user.role);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div
      className={`${dmSans.className} -m-4 md:-m-6`}
      style={{ fontFamily: font, fontSize: 14, color: FD.k9, background: FD.surf, minHeight: "calc(100vh - 80px)" }}
    >
      <FinancePageTopBar
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Maintenance" },
        ]}
        right={
          canNew ? (
            <Link href="/maintenance/new" style={{ textDecoration: "none" }}>
              <button
                type="button"
                className="transition-colors hover:bg-[#085041]"
                style={financePbtn(font)}
              >
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                  strokeLinecap="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Log request
              </button>
            </Link>
          ) : undefined
        }
      />

      <div style={{ padding: "22px 24px" }}>
        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}
          className="max-lg:grid-cols-2 max-sm:grid-cols-1"
        >
          {[
            { label: "Open", value: stats.open, sub: "Awaiting assignment", color: FD.r6 },
            { label: "In progress", value: stats.progress, sub: "Artisan assigned", color: FD.b8 },
            { label: "Resolved this month", value: stats.completed, sub: `Avg ${stats.completed > 0 ? "—" : "—"} days`, color: FD.g7 },
            { label: "Est. cost (open)", value: "—", sub: `${stats.open} open request${stats.open !== 1 ? "s" : ""}`, color: FD.a7 },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rlg,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: FD.k5,
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                  marginBottom: 6,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filter toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 180px", maxWidth: 260, minWidth: 160 }}>
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke={FD.k5}
              strokeWidth={2}
              strokeLinecap="round"
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search requests…"
              className={FINANCE_FIELD_CLASS}
              style={{
                width: "100%",
                height: 34,
                padding: "0 10px 0 32px",
                background: FD.wh,
                border: `0.5px solid ${FD.bdm}`,
                borderRadius: FD.rmd,
                fontSize: 13,
                color: FD.k9,
                fontFamily: font,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Property filter */}
          {properties.length > 0 && (
            <select
              value={propFilter}
              onChange={(e) => setPropFilter(e.target.value)}
              className={FINANCE_FIELD_CLASS}
              style={financeFsel(font, 160)}
            >
              <option value="">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Category filter */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className={FINANCE_FIELD_CLASS}
            style={financeFsel(font, 140)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>

          {/* Status pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { id: "", label: "All" },
              { id: "open_group", label: "Open" },
              { id: "progress_group", label: "In progress" },
              { id: "completed", label: "Resolved" },
            ].map((p) => {
              const active = statusFilter === p.id;
              return (
                <button
                  key={p.id || "all"}
                  type="button"
                  onClick={() => setStatusFilter(p.id)}
                  style={{
                    height: 32,
                    padding: "0 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    border: `0.5px solid ${active ? FD.g7 : FD.bdm}`,
                    background: active ? FD.g7 : FD.wh,
                    color: active ? "#fff" : FD.k7,
                    fontFamily: font,
                    transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Request list */}
        {filtered.length === 0 ? (
          <div
            style={{
              background: FD.wh,
              border: `0.5px solid ${FD.bd}`,
              borderRadius: FD.rlg,
              padding: 48,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: FD.k0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke={FD.k5}
                strokeWidth={1.8}
                strokeLinecap="round"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: FD.k7, marginBottom: 4 }}>
              No maintenance requests
            </div>
            <div style={{ fontSize: 13, color: FD.k5 }}>
              No requests match your current filters.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((r) => {
              const cv = categoryVisual(r.category);
              const pri = priorityBorder(r.priority);
              const done = r.status === "completed" || r.status === "cancelled";
              const sb = statusBadgeStyle(r.status);
              const pLabel = propName.get(r.property) ?? `Property #${r.property}`;
              const catLabel = r.category.charAt(0).toUpperCase() + r.category.slice(1);
              const isOpen = ["submitted", "open"].includes(r.status);
              return (
                <div
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/maintenance/${r.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(`/maintenance/${r.id}`);
                  }}
                  className="transition-all hover:translate-y-[-1px]"
                  style={{
                    background: FD.wh,
                    border: `0.5px solid ${FD.bd}`,
                    borderLeft: `3px solid ${pri}`,
                    borderRadius: FD.rlg,
                    padding: "16px 18px",
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    cursor: "pointer",
                    opacity: done ? 0.75 : 1,
                  }}
                >
                  {/* Category icon */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: FD.rmd,
                      background: cv.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <WrenchIcon stroke={cv.stroke} />
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9, marginBottom: 3 }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: 12, color: FD.k5, marginBottom: 8 }}>
                      {r.unit != null ? `${unitNames.get(r.unit) ?? `Unit #${r.unit}`} · ` : ""}
                      {pLabel} · {catLabel}
                      {r.assigned_to != null ? ` · Assigned` : ""}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {priorityTag(r.priority)}
                      <span style={{ ...TAG, background: sb.bg, color: sb.color }}>
                        {sb.label}
                      </span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 12, color: FD.k5 }}>{relativeAge(r.created_at)}</div>
                    <div style={{ display: "flex", gap: 5 }}>
                      {isOpen && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/maintenance/${r.id}`);
                          }}
                          style={{
                            height: 26,
                            padding: "0 10px",
                            borderRadius: FD.rsm,
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                            fontFamily: font,
                            border: `0.5px solid ${FD.g7}`,
                            background: FD.g7,
                            color: "#fff",
                          }}
                        >
                          View bids
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/maintenance/${r.id}`);
                        }}
                        style={{
                          height: 26,
                          padding: "0 10px",
                          borderRadius: FD.rsm,
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: font,
                          border: `0.5px solid ${FD.bdm}`,
                          background: FD.wh,
                          color: FD.k7,
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
