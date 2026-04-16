"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DM_Mono, DM_Sans } from "next/font/google";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ROLE_ADMIN,
  ROLE_AGENT,
  ROLE_LANDLORD,
  ROLE_TENANT,
} from "@/constants/roles";
import { listInvoices } from "@/lib/api/billing";
import {
  getDashboard,
  listProperties,
  listUnits,
  getUnitLease,
} from "@/lib/api/properties";
import type { Invoice, Lease, Property, Unit } from "@/types/api";
import PageLoader from "@/components/ui/PageLoader";

/** Design tokens — landlord-tenants.html (strict) */
const T = {
  g7: "#0F6E56",
  g5: "#1D9E75",
  g1: "#E1F5EE",
  a7: "#854F0B",
  a5: "#EF9F27",
  a0: "#FAEEDA",
  r6: "#A32D2D",
  r0: "#FCEBEB",
  k9: "#1A1A1A",
  k7: "#3D3D3D",
  k5: "#6B6B6B",
  k1: "#E8E7E1",
  k0: "#F2F1EB",
  surf: "#F7F6F2",
  wh: "#ffffff",
  bd: "rgba(0,0,0,0.07)",
  bdm: "rgba(0,0,0,0.12)",
  rsm: 6,
  rmd: 8,
  rlg: 14,
  primaryHover: "#085041",
  activeBadgeText: "#085041",
} as const;

const dmSans = DM_Sans({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

const SELECT_CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6B6B' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")";

const AVATAR_COLORS = [
  "#1D9E75",
  "#378ADD",
  "#D85A30",
  "#7F77DD",
  "#993556",
  "#185FA5",
  "#0F6E56",
];

type RowStatus = "active" | "overdue" | "expiring";

type TenantRow = {
  leaseId: number;
  tenantId: number;
  tenantLabel: string;
  unitName: string;
  propertyName: string;
  propertyId: number;
  unitId: number;
  endDate: string | null;
  balance: number;
  payPct: number;
  status: RowStatus;
};

function fmtKES(n: number) {
  return `KES ${n.toLocaleString()}`;
}

function leaseInvoiceStats(leaseId: number, invoices: Invoice[]) {
  const invs = invoices.filter((i) => i.lease === leaseId && i.status !== "cancelled");
  if (invs.length === 0) return { balance: 0, payPct: 100, hasOverdue: false };
  let balance = 0;
  let hasOverdue = false;
  for (const i of invs) {
    if (i.status === "overdue") hasOverdue = true;
    if (i.status === "paid") continue;
    const paid = Number(i.amount_paid ?? 0);
    const total = Number(i.total_amount);
    balance += Math.max(0, total - paid);
  }
  const paidCount = invs.filter((i) => i.status === "paid").length;
  const payPct = Math.round((paidCount / invs.length) * 100);
  return { balance, payPct, hasOverdue };
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (24 * 3600 * 1000));
}

function rowStatus(
  lease: Lease,
  hasOverdue: boolean,
  balance: number,
): RowStatus {
  if (hasOverdue || balance > 0) return "overdue";
  const d = daysUntil(lease.end_date);
  if (d !== null && d >= 0 && d <= 60) return "expiring";
  return "active";
}

/** Mock payColor(p): 100 → g5, ≥80 → a5, else r6 */
function payBarColor(pct: number) {
  if (pct === 100) return T.g5;
  if (pct >= 80) return T.a5;
  return T.r6;
}

export default function LandlordTenantsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dashOccupied, setDashOccupied] = useState(0);
  const [dashPropertyCount, setDashPropertyCount] = useState(0);
  const [dashOverdueCount, setDashOverdueCount] = useState(0);
  const [dashOutstanding, setDashOutstanding] = useState("0");
  const [dashExpiringCount, setDashExpiringCount] = useState(0);

  const canView =
    user &&
    [ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT].includes(user.role);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const [dashboard, properties, invoices] = await Promise.all([
        getDashboard(),
        listProperties(),
        listInvoices(),
      ]);
      setDashOccupied(dashboard.properties.occupied_units);
      setDashPropertyCount(dashboard.properties.total);
      setDashOverdueCount(dashboard.billing.overdue_invoices);
      setDashOutstanding(dashboard.billing.outstanding);
      setDashExpiringCount(dashboard.leases_ending_soon.length);

      const collected: {
        lease: Lease;
        unit: Unit;
        property: Property;
      }[] = [];

      for (const p of properties) {
        let units: Unit[] = [];
        try {
          units = await listUnits(p.id);
        } catch {
          continue;
        }
        const occupied = units.filter((u) => u.is_occupied);
        const leaseResults = await Promise.allSettled(
          occupied.map((u) => getUnitLease(u.id)),
        );
        leaseResults.forEach((result, idx) => {
          if (result.status !== "fulfilled") return;
          const lease = result.value;
          if (!lease.is_active) return;
          collected.push({ lease, unit: occupied[idx], property: p });
        });
      }

      const nextRows: TenantRow[] = collected.map(({ lease, unit, property }) => {
        const { balance, payPct, hasOverdue } = leaseInvoiceStats(
          lease.id,
          invoices,
        );
        const status = rowStatus(lease, hasOverdue, balance);
        return {
          leaseId: lease.id,
          tenantId: lease.tenant,
          tenantLabel: `Tenant #${lease.tenant}`,
          unitName: unit.name,
          propertyName: property.name,
          propertyId: property.id,
          unitId: unit.id,
          endDate: lease.end_date,
          balance,
          payPct,
          status,
        };
      });

      setRows(nextRows);
    } catch {
      setError("Could not load tenants.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (!user) return;
    if (user.role === ROLE_TENANT) {
      router.replace("/tenant/dashboard");
      return;
    }
    if (![ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT].includes(user.role)) {
      router.replace("/");
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    if ([ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT].includes(user.role)) {
      load();
    } else {
      setLoading(false);
    }
  }, [user, load]);

  const propertyOptions = useMemo(() => {
    const names = [...new Set(rows.map((r) => r.propertyName))].sort();
    return names;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchQ =
        !q ||
        r.tenantLabel.toLowerCase().includes(q) ||
        r.unitName.toLowerCase().includes(q) ||
        r.propertyName.toLowerCase().includes(q);
      const matchProp = !propertyFilter || r.propertyName === propertyFilter;
      const matchStatus =
        !statusFilter ||
        (statusFilter === "On time" && r.status === "active") ||
        (statusFilter === "Overdue" && r.status === "overdue") ||
        (statusFilter === "Expiring soon" && r.status === "expiring");
      return matchQ && matchProp && matchStatus;
    });
  }, [rows, search, propertyFilter, statusFilter]);

  const activeLeaseCount = rows.length;

  const baseFont = { fontFamily: dmSans.style.fontFamily, fontSize: 14, color: T.k9 };

  if (!user || ![ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT].includes(user.role)) {
    return (
      <div
        className={dmSans.className}
        style={{
          ...baseFont,
          display: "flex",
          minHeight: 200,
          alignItems: "center",
          justifyContent: "center",
          color: T.k5,
        }}
      >
        Redirecting…
      </div>
    );
  }

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div
      className={dmSans.className}
      style={{
        ...baseFont,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* Top bar — .topbar pattern: white strip, actions right */}
      <div
        className="-mx-4 -mt-4 md:-mx-6 md:-mt-6"
        style={{
          background: T.wh,
          borderBottom: `0.5px solid ${T.bd}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.k5 }}>
          <Link href="/" style={{ color: T.k5, textDecoration: "none" }}>
            Dashboard
          </Link>
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke={T.k5} strokeWidth={2} strokeLinecap="round">
            <polyline points="4,2 8,6 4,10" />
          </svg>
          <span style={{ color: T.k9, fontWeight: 500 }}>Tenants</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => router.push("/properties")}
            style={{
              height: 34,
              padding: "0 14px",
              background: T.g7,
              color: T.wh,
              border: "none",
              borderRadius: T.rmd,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: dmSans.style.fontFamily,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = T.g7;
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={T.wh} strokeWidth={2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Invite tenant
          </button>
        </div>
      </div>

      <div style={{ paddingTop: 22, paddingBottom: 24 }}>
        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: "10px 16px",
              borderRadius: T.rmd,
              border: `0.5px solid ${T.bdm}`,
              background: T.r0,
              color: T.r6,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {/* Stats — .stats / .stat */}
        <div
          className="grid grid-cols-2 gap-[10px] lg:grid-cols-4"
          style={{ marginBottom: 20 }}
        >
          {[
            {
              label: "Total tenants",
              value: String(dashOccupied),
              sub: `Across ${dashPropertyCount} propert${dashPropertyCount === 1 ? "y" : "ies"}`,
              valueColor: T.k9,
            },
            {
              label: "Active leases",
              value: String(activeLeaseCount),
              sub:
                dashOccupied > 0
                  ? `of ${dashOccupied} occupied unit${dashOccupied === 1 ? "" : "s"}`
                  : "No occupied units",
              valueColor: T.g7,
            },
            {
              label: "Overdue payments",
              value: String(dashOverdueCount),
              sub: `${fmtKES(Number(dashOutstanding))} outstanding`,
              valueColor: T.r6,
            },
            {
              label: "Leases expiring",
              value: String(dashExpiringCount),
              sub: "Within 60 days",
              valueColor: T.a7,
            },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                background: T.wh,
                border: `0.5px solid ${T.bd}`,
                borderRadius: T.rlg,
                padding: "14px 16px",
                animation: `tenantStatIn 0.25s ease ${0.03 * (i + 1)}s both`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: T.k5,
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                  marginBottom: 6,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.valueColor }}>{s.value}</div>
              <div style={{ fontSize: 11, color: T.k5, marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Toolbar — .toolbar / .sw / .si / .fsel */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
            <svg
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 14,
                height: 14,
                pointerEvents: "none",
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke={T.k5}
              strokeWidth={2}
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder="Search tenants…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 34,
                padding: "0 10px 0 32px",
                background: T.wh,
                border: `0.5px solid ${T.bdm}`,
                borderRadius: T.rmd,
                fontSize: 13,
                color: T.k9,
                fontFamily: dmSans.style.fontFamily,
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = T.g5;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = T.bdm;
              }}
            />
          </div>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            style={{
              height: 34,
              padding: "0 26px 0 10px",
              background: T.wh,
              border: `0.5px solid ${T.bdm}`,
              borderRadius: T.rmd,
              fontSize: 13,
              color: T.k7,
              fontFamily: dmSans.style.fontFamily,
              outline: "none",
              cursor: "pointer",
              appearance: "none",
              backgroundImage: SELECT_CHEVRON,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
            }}
          >
            <option value="">All properties</option>
            {propertyOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 34,
              padding: "0 26px 0 10px",
              background: T.wh,
              border: `0.5px solid ${T.bdm}`,
              borderRadius: T.rmd,
              fontSize: 13,
              color: T.k7,
              fontFamily: dmSans.style.fontFamily,
              outline: "none",
              cursor: "pointer",
              appearance: "none",
              backgroundImage: SELECT_CHEVRON,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
            }}
          >
            <option value="">All statuses</option>
            <option>On time</option>
            <option>Overdue</option>
            <option>Expiring soon</option>
          </select>
        </div>

        {/* Table — .tbl-wrap */}
        <div
          style={{
            background: T.wh,
            border: `0.5px solid ${T.bd}`,
            borderRadius: T.rlg,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 800, borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  {["Tenant", "Unit", "Property", "Lease end", "Payment history", "Balance", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.3px",
                        textTransform: "uppercase",
                        color: T.k5,
                        textAlign: "left",
                        padding: "10px 16px",
                        background: T.k0,
                        borderBottom: `0.5px solid ${T.bd}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 0, borderBottom: "none" }}>
                      <div style={{ textAlign: "center", padding: "50px 20px" }}>
                        <svg
                          width={36}
                          height={36}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#D3D1C7"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          style={{ margin: "0 auto 12px", display: "block" }}
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        <div style={{ fontSize: 15, fontWeight: 500, color: T.k7, marginBottom: 5 }}>No tenants found</div>
                        <div style={{ fontSize: 13, color: T.k5 }}>Try adjusting your filters or invite a tenant from a unit.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, rowIdx) => {
                    const avatarBg = AVATAR_COLORS[r.tenantId % AVATAR_COLORS.length];
                    const initials = `T${r.tenantId % 100}`;
                    const endLabel = r.endDate
                      ? new Date(r.endDate).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";
                    const isLast = rowIdx === filtered.length - 1;
                    return (
                      <tr
                        key={`${r.leaseId}-${r.unitId}`}
                        onClick={() => router.push(`/properties/${r.propertyId}`)}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={(e) => {
                          Array.from(e.currentTarget.querySelectorAll("td")).forEach((td) => {
                            (td as HTMLTableCellElement).style.background = T.surf;
                          });
                        }}
                        onMouseLeave={(e) => {
                          Array.from(e.currentTarget.querySelectorAll("td")).forEach((td) => {
                            (td as HTMLTableCellElement).style.background = "";
                          });
                        }}
                      >
                        <td
                          style={{
                            fontSize: 13,
                            color: T.k9,
                            padding: "12px 16px",
                            borderBottom: isLast ? "none" : `0.5px solid ${T.bd}`,
                            verticalAlign: "middle",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 500,
                                color: T.wh,
                                flexShrink: 0,
                                background: avatarBg,
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: T.k9 }}>{r.tenantLabel}</div>
                              <div style={{ fontSize: 11, color: T.k5, marginTop: 1 }}>User ID {r.tenantId}</div>
                            </div>
                          </div>
                        </td>
                        <td
                          className={dmMono.className}
                          style={{
                            fontSize: 12,
                            color: T.k9,
                            padding: "12px 16px",
                            borderBottom: isLast ? "none" : `0.5px solid ${T.bd}`,
                            verticalAlign: "middle",
                          }}
                        >
                          {r.unitName}
                        </td>
                        <td
                          style={{
                            fontSize: 13,
                            color: T.k5,
                            padding: "12px 16px",
                            borderBottom: isLast ? "none" : `0.5px solid ${T.bd}`,
                            verticalAlign: "middle",
                          }}
                        >
                          {r.propertyName}
                        </td>
                        <td
                          style={{
                            fontSize: 13,
                            color: T.k9,
                            padding: "12px 16px",
                            borderBottom: isLast ? "none" : `0.5px solid ${T.bd}`,
                            verticalAlign: "middle",
                          }}
                        >
                          {endLabel}
                          {r.status === "expiring" && (
                            <div style={{ fontSize: 10, color: T.a7, marginTop: 2 }}>
                              Expiring soon
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            borderBottom: isLast ? "none" : `0.5px solid ${T.bd}`,
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            style={{
                              width: 60,
                              height: 4,
                              background: T.k1,
                              borderRadius: 2,
                              overflow: "hidden",
                              marginBottom: 3,
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                borderRadius: 2,
                                width: `${r.payPct}%`,
                                background: payBarColor(r.payPct),
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 10, color: T.k5 }}>{r.payPct}% on time</div>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            borderBottom: isLast ? "none" : `0.5px solid ${T.bd}`,
                            verticalAlign: "middle",
                          }}
                        >
                          {r.balance > 0 ? (
                            <span
                              className={dmMono.className}
                              style={{ fontSize: 12, fontWeight: 500, color: T.r6 }}
                            >
                              {fmtKES(Math.round(r.balance))}
                            </span>
                          ) : (
                            <span className={dmMono.className} style={{ fontSize: 12, color: T.g7 }}>
                              KES 0
                            </span>
                          )}
                        </td>
                        <td
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: "12px 16px",
                            borderBottom: isLast ? "none" : `0.5px solid ${T.bd}`,
                            verticalAlign: "middle",
                          }}
                        >
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                            {/* .bdg — mock labels: Active / Overdue / Expiring soon */}
                            {r.status === "overdue" ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  background: T.r0,
                                  color: T.r6,
                                }}
                              >
                                Overdue
                              </span>
                            ) : r.status === "expiring" ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  background: T.a0,
                                  color: T.a7,
                                }}
                              >
                                Expiring soon
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  background: T.g1,
                                  color: T.activeBadgeText,
                                }}
                              >
                                Active
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => router.push("/messages")}
                              style={{
                                height: 24,
                                padding: "0 9px",
                                borderRadius: T.rsm,
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: "pointer",
                                fontFamily: dmSans.style.fontFamily,
                                border: `0.5px solid ${T.bdm}`,
                                background: T.wh,
                                color: T.k7,
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = T.k0;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = T.wh;
                              }}
                            >
                              Message
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/properties/${r.propertyId}`)}
                              style={{
                                height: 24,
                                padding: "0 9px",
                                borderRadius: T.rsm,
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: "pointer",
                                fontFamily: dmSans.style.fontFamily,
                                border: `0.5px solid ${T.g7}`,
                                background: T.g7,
                                color: T.wh,
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = T.primaryHover;
                                e.currentTarget.style.borderColor = T.primaryHover;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = T.g7;
                                e.currentTarget.style.borderColor = T.g7;
                              }}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tenantStatIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
