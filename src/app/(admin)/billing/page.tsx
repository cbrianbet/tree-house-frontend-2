"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DM_Mono, DM_Sans } from "next/font/google";
import { useRouter } from "next/navigation";
import { createInvoice, listInvoices } from "@/lib/api/billing";
import { buildLeaseIndex, type LeaseLocation } from "@/lib/leaseIndex";
import { useAuth } from "@/context/AuthContext";
import { ROLE_ADMIN, ROLE_AGENT, ROLE_LANDLORD } from "@/constants/roles";
import type { Invoice, InvoiceStatus } from "@/types/api";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";
import { FD, financeFsel, financeGbtn, financePbtn } from "@/constants/financeDesign";
import PageLoader from "@/components/ui/PageLoader";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

const PAGE_SIZE = 10;

function fmtKES(n: number) {
  return `KES ${Math.round(n).toLocaleString()}`;
}

function fmtKESCompact(n: number): string {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `KES ${(n / 1000).toFixed(2)}k`;
  return fmtKES(n);
}

function fmtDue(d: string) {
  return new Date(d).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthKey(d: string) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}

function invDisplayId(id: number) {
  return `INV-${String(id).padStart(4, "0")}`;
}

function toISODateLocal(d: Date) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function defaultMonthDates() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const period_start = toISODateLocal(start);
  const period_end = toISODateLocal(end);
  return { period_start, period_end, due_date: period_start };
}

function parseCreateInvoiceError(e: unknown): string {
  if (!axios.isAxiosError(e)) return "Could not create invoice.";
  const data = e.response?.data as Record<string, unknown> | string | undefined;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    if (typeof data.detail === "string") return data.detail;
    const det = data.detail;
    if (Array.isArray(det) && det.length) return String(det[0]);
    const firstKey = Object.keys(data).find((k) => k !== "detail");
    if (firstKey) {
      const v = data[firstKey];
      if (Array.isArray(v) && v.length) return `${firstKey}: ${v[0]}`;
      if (typeof v === "string") return v;
    }
  }
  if (e.response?.status === 403) return "You don't have permission to create invoices.";
  return "Could not create invoice.";
}

type PillStatus = "" | "paid" | "pending" | "overdue";

function statusMatchesPill(status: InvoiceStatus, pill: PillStatus): boolean {
  if (!pill) return true;
  if (pill === "paid") return status === "paid";
  if (pill === "overdue") return status === "overdue";
  if (pill === "pending") return status === "pending" || status === "partial";
  return true;
}

function badgeStyle(status: InvoiceStatus): { bg: string; color: string; label: string } {
  if (status === "paid") return { bg: FD.g1, color: FD.activeBadgeText, label: "Paid" };
  if (status === "overdue") return { bg: FD.r0, color: FD.r6, label: "Overdue" };
  if (status === "cancelled") return { bg: FD.k0, color: FD.k7, label: "Cancelled" };
  return { bg: FD.a0, color: FD.a7, label: "Pending" };
}

export default function InvoicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [pillStatus, setPillStatus] = useState<PillStatus>("");
  const [page, setPage] = useState(1);
  const [leaseMap, setLeaseMap] = useState<Map<number, LeaseLocation>>(new Map());
  const [createOpen, setCreateOpen] = useState(false);
  const [createLeaseId, setCreateLeaseId] = useState("");
  const [createPeriodStart, setCreatePeriodStart] = useState("");
  const [createPeriodEnd, setCreatePeriodEnd] = useState("");
  const [createDueDate, setCreateDueDate] = useState("");
  const [createRent, setCreateRent] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createFormError, setCreateFormError] = useState<string | null>(null);

  const canCreateInvoice =
    user != null && [ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT].includes(user.role);

  const leaseOptions = useMemo(() => {
    const rows: { id: number; label: string; loc: LeaseLocation }[] = [];
    leaseMap.forEach((loc, id) => {
      if (!loc.lease.is_active) return;
      rows.push({
        id,
        label: `${loc.property.name} — ${loc.unit.name} · Tenant #${loc.lease.tenant}`,
        loc,
      });
    });
    rows.sort((a, b) => a.label.localeCompare(b.label));
    return rows;
  }, [leaseMap]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, map] = await Promise.all([listInvoices(), buildLeaseIndex()]);
      setInvoices(inv);
      setLeaseMap(map);
    } catch {
      setError("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const enriched = useMemo(() => {
    return invoices.map((inv) => {
      const loc = leaseMap.get(inv.lease);
      const tenantLabel = loc ? `Tenant #${loc.lease.tenant}` : `Lease #${inv.lease}`;
      const unitLabel = loc?.unit.name ?? "—";
      const propName = loc?.property.name ?? "—";
      const typeLabel = Number(inv.late_fee_amount) > 0 && Number(inv.rent_amount) === 0 ? "Fees" : "Rent";
      return { inv, tenantLabel, unitLabel, propName, typeLabel };
    });
  }, [invoices, leaseMap]);

  const monthOptions = useMemo(() => {
    const keys = new Set<string>();
    invoices.forEach((i) => keys.add(monthKey(i.due_date)));
    return [...keys].sort().reverse();
  }, [invoices]);

  const propertyNames = useMemo(() => {
    const names = new Set(enriched.map((e) => e.propName).filter((n) => n !== "—"));
    return [...names].sort();
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((e) => {
      const { inv } = e;
      const matchQ =
        !q ||
        invDisplayId(inv.id).toLowerCase().includes(q) ||
        e.tenantLabel.toLowerCase().includes(q) ||
        e.unitLabel.toLowerCase().includes(q) ||
        e.propName.toLowerCase().includes(q);
      const matchProp = !propertyFilter || e.propName === propertyFilter;
      const matchMonth = !monthFilter || monthKey(inv.due_date) === monthFilter;
      const matchPill = statusMatchesPill(inv.status, pillStatus);
      return matchQ && matchProp && matchMonth && matchPill;
    });
  }, [enriched, search, propertyFilter, monthFilter, pillStatus]);

  useEffect(() => {
    setPage(1);
  }, [search, propertyFilter, monthFilter, pillStatus]);

  function openCreateModal() {
    const d = defaultMonthDates();
    setCreatePeriodStart(d.period_start);
    setCreatePeriodEnd(d.period_end);
    setCreateDueDate(d.due_date);
    setCreateLeaseId("");
    setCreateRent("");
    setCreateFormError(null);
    setCreateOpen(true);
  }

  useEffect(() => {
    if (!createLeaseId) return;
    const id = Number(createLeaseId);
    const loc = leaseMap.get(id);
    if (loc) setCreateRent(loc.lease.rent_amount);
  }, [createLeaseId, leaseMap]);

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    const leaseNum = Number(createLeaseId);
    if (!leaseNum) {
      setCreateFormError("Select a lease.");
      return;
    }
    setCreateSubmitting(true);
    setCreateFormError(null);
    try {
      const inv = await createInvoice({
        lease: leaseNum,
        period_start: createPeriodStart,
        period_end: createPeriodEnd,
        due_date: createDueDate,
        rent_amount: createRent.trim() ? createRent.trim() : undefined,
      });
      setCreateOpen(false);
      await load();
      router.push(`/billing/${inv.id}`);
    } catch (err) {
      setCreateFormError(parseCreateInvoiceError(err));
    } finally {
      setCreateSubmitting(false);
    }
  }

  const stats = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const inMonth = invoices.filter((i) => monthKey(i.due_date) === ym || monthKey(i.period_start) === ym);
    const basis = inMonth.length ? inMonth : invoices;
    const totalInvoiced = basis.reduce((s, i) => s + Number(i.total_amount), 0);
    const paid = basis.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0);
    const rate = totalInvoiced > 0 ? ((paid / totalInvoiced) * 100).toFixed(1) : "0";
    const outstanding = basis
      .filter((i) => i.status === "pending" || i.status === "partial")
      .reduce((s, i) => {
        const paidPart = Number(i.amount_paid ?? 0);
        return s + Math.max(0, Number(i.total_amount) - paidPart);
      }, 0);
    const overdueAmt = basis
      .filter((i) => i.status === "overdue")
      .reduce((s, i) => s + Number(i.total_amount), 0);
    const pendingCount = basis.filter((i) => i.status === "pending" || i.status === "partial").length;
    const overdueCount = basis.filter((i) => i.status === "overdue").length;
    const labelMonth = inMonth.length ? now.toLocaleDateString("en-KE", { month: "long", year: "numeric" }) : "All periods";
    return { totalInvoiced, paid, rate, outstanding, overdueAmt, pendingCount, overdueCount, labelMonth };
  }, [invoices]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className={dmSans.className} style={{ fontFamily: dmSans.style.fontFamily, fontSize: 14, color: FD.k9, maxWidth: 1200, margin: "0 auto" }}>
      <FinancePageTopBar
        className="-mx-4 -mt-4 md:-mx-6 md:-mt-6"
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Invoices" },
        ]}
        right={
          <>
            <button
              type="button"
              onClick={() => alert("Export CSV coming soon")}
              className="transition-colors hover:bg-[#F2F1EB]"
              style={financeGbtn(dmSans.style.fontFamily)}
            >
              <IconDownload />
              Export CSV
            </button>
            {canCreateInvoice && (
              <button
                type="button"
                onClick={openCreateModal}
                style={financePbtn(dmSans.style.fontFamily)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = FD.primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = FD.g7;
                }}
              >
                <IconPlus />
                New invoice
              </button>
            )}
          </>
        }
      />

      {createOpen && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => !createSubmitting && setCreateOpen(false)}
        >
          <div
            role="dialog"
            aria-modal
            aria-labelledby="create-inv-title"
            className={dmSans.className}
            style={{
              fontFamily: dmSans.style.fontFamily,
              background: FD.wh,
              borderRadius: FD.rlg,
              border: `0.5px solid ${FD.bd}`,
              maxWidth: 440,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: "20px 22px",
              boxSizing: "border-box",
            }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="create-inv-title" style={{ fontSize: 16, fontWeight: 500, color: FD.k9, marginBottom: 6 }}>
              New invoice
            </h2>
            <p style={{ fontSize: 12, color: FD.k5, marginBottom: 16, lineHeight: 1.45 }}>
              Issue a manual rent invoice for an active lease. The property must have billing config. Duplicate{" "}
              <code style={{ fontSize: 11 }}>period_start</code> for the same lease is rejected.
            </p>
            {createFormError && (
              <div
                style={{
                  marginBottom: 12,
                  padding: "8px 12px",
                  borderRadius: FD.rmd,
                  background: FD.r0,
                  color: FD.r6,
                  fontSize: 13,
                }}
              >
                {createFormError}
              </div>
            )}
            <form onSubmit={handleCreateInvoice} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: FD.k5 }}>
                Lease
                <select
                  required
                  value={createLeaseId}
                  onChange={(e) => setCreateLeaseId(e.target.value)}
                  style={{
                    ...financeFsel(dmSans.style.fontFamily, 1),
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                  }}
                >
                  <option value="">Select lease…</option>
                  {leaseOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="max-sm:grid-cols-1">
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: FD.k5 }}>
                  Period start
                  <input
                    type="date"
                    required
                    value={createPeriodStart}
                    onChange={(e) => setCreatePeriodStart(e.target.value)}
                    style={{
                      height: 34,
                      padding: "0 10px",
                      border: `0.5px solid ${FD.bdm}`,
                      borderRadius: FD.rmd,
                      fontSize: 13,
                      fontFamily: dmSans.style.fontFamily,
                      color: FD.k9,
                    }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: FD.k5 }}>
                  Period end
                  <input
                    type="date"
                    required
                    value={createPeriodEnd}
                    onChange={(e) => setCreatePeriodEnd(e.target.value)}
                    style={{
                      height: 34,
                      padding: "0 10px",
                      border: `0.5px solid ${FD.bdm}`,
                      borderRadius: FD.rmd,
                      fontSize: 13,
                      fontFamily: dmSans.style.fontFamily,
                      color: FD.k9,
                    }}
                  />
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: FD.k5 }}>
                Due date
                <input
                  type="date"
                  required
                  value={createDueDate}
                  onChange={(e) => setCreateDueDate(e.target.value)}
                  style={{
                    height: 34,
                    padding: "0 10px",
                    border: `0.5px solid ${FD.bdm}`,
                    borderRadius: FD.rmd,
                    fontSize: 13,
                    fontFamily: dmSans.style.fontFamily,
                    color: FD.k9,
                  }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: FD.k5 }}>
                Rent amount (optional)
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Uses lease default if empty"
                  value={createRent}
                  onChange={(e) => setCreateRent(e.target.value)}
                  style={{
                    height: 34,
                    padding: "0 10px",
                    border: `0.5px solid ${FD.bdm}`,
                    borderRadius: FD.rmd,
                    fontSize: 13,
                    fontFamily: dmMono.style.fontFamily,
                    color: FD.k9,
                  }}
                />
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  disabled={createSubmitting}
                  onClick={() => setCreateOpen(false)}
                  className="transition-colors hover:bg-[#F2F1EB]"
                  style={financeGbtn(dmSans.style.fontFamily)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting || leaseOptions.length === 0}
                  style={financePbtn(dmSans.style.fontFamily)}
                >
                  {createSubmitting ? "Creating…" : "Create invoice"}
                </button>
              </div>
              {leaseOptions.length === 0 && (
                <p style={{ fontSize: 12, color: FD.a7, margin: 0 }}>
                  No active leases found in your portfolio. Create a lease on a unit first.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      <div style={{ paddingTop: 22, paddingBottom: 24 }}>
        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 16px",
              borderRadius: FD.rmd,
              border: `0.5px solid ${FD.bdm}`,
              background: FD.r0,
              color: FD.r6,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-[10px] lg:grid-cols-4" style={{ marginBottom: 20 }}>
          {[
            { sl: "Total invoiced", sv: fmtKESCompact(stats.totalInvoiced), ss: stats.labelMonth, svClass: undefined },
            { sl: "Collected", sv: fmtKESCompact(stats.paid), ss: `${stats.rate}% collection rate`, svClass: FD.g7 },
            { sl: "Outstanding", sv: fmtKES(Math.round(stats.outstanding)), ss: `${stats.pendingCount} invoices pending`, svClass: FD.a7 },
            { sl: "Overdue", sv: fmtKES(Math.round(stats.overdueAmt)), ss: `${stats.overdueCount} invoices overdue`, svClass: FD.r6 },
          ].map((s, i) => (
            <div
              key={s.sl}
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rlg,
                padding: "14px 16px",
                animation: `invStatIn 0.25s ease ${0.03 * (i + 1)}s both`,
              }}
            >
              <div style={{ fontSize: 11, color: FD.k5, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 6 }}>{s.sl}</div>
              <div className={dmMono.className} style={{ fontSize: 20, fontWeight: 500, color: s.svClass ?? FD.k9 }}>
                {s.sv}
              </div>
              <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>{s.ss}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 280 }}>
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
              stroke={FD.k5}
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder="Search tenant or unit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 34,
                padding: "0 10px 0 32px",
                background: FD.wh,
                border: `0.5px solid ${FD.bdm}`,
                borderRadius: FD.rmd,
                fontSize: 13,
                color: FD.k9,
                fontFamily: dmSans.style.fontFamily,
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = FD.g5;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = FD.bdm;
              }}
            />
          </div>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            style={financeFsel(dmSans.style.fontFamily, 160)}
          >
            <option value="">All properties</option>
            {propertyNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            style={financeFsel(dmSans.style.fontFamily, 160)}
          >
            <option value="">All months</option>
            {monthOptions.map((k) => (
              <option key={k} value={k}>
                {monthLabel(k)}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(
              [
                { key: "" as PillStatus, label: "All" },
                { key: "paid", label: "Paid" },
                { key: "pending", label: "Pending" },
                { key: "overdue", label: "Overdue" },
              ] as const
            ).map((p) => (
              <button
                key={p.key || "all"}
                type="button"
                onClick={() => setPillStatus(p.key)}
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: dmSans.style.fontFamily,
                  border: `0.5px solid ${pillStatus === p.key ? FD.g7 : FD.bdm}`,
                  background: pillStatus === p.key ? FD.g7 : FD.wh,
                  color: pillStatus === p.key ? FD.wh : FD.k7,
                  transition: "all 0.15s",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: FD.wh, border: `0.5px solid ${FD.bd}`, borderRadius: FD.rlg, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Invoice", "Tenant", "Unit", "Type", "Amount", "Due date", "Status", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.3px",
                      textTransform: "uppercase",
                      color: FD.k5,
                      textAlign: "left",
                      padding: "10px 16px",
                      background: FD.k0,
                      borderBottom: `0.5px solid ${FD.bd}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px 16px", textAlign: "center", color: FD.k5, fontSize: 13 }}>
                    No invoices match your filters.
                  </td>
                </tr>
              ) : (
                slice.map(({ inv, tenantLabel, unitLabel, typeLabel }, idx) => {
                  const isLast = idx === slice.length - 1;
                  const bd = isLast ? "none" : `0.5px solid ${FD.bd}`;
                  const b = badgeStyle(inv.status);
                  const amtColor = inv.status === "overdue" ? FD.r6 : inv.status === "paid" ? FD.g7 : FD.k9;
                  return (
                    <tr
                      key={inv.id}
                      className="data-row"
                      onClick={() => router.push(`/billing/${inv.id}`)}
                      onMouseEnter={(e) => {
                        Array.from(e.currentTarget.querySelectorAll("td")).forEach((td) => {
                          (td as HTMLTableCellElement).style.background = FD.surf;
                        });
                      }}
                      onMouseLeave={(e) => {
                        Array.from(e.currentTarget.querySelectorAll("td")).forEach((td) => {
                          (td as HTMLTableCellElement).style.background = "";
                        });
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <td className={dmMono.className} style={{ fontSize: 12, color: FD.k9, padding: "11px 16px", borderBottom: bd, verticalAlign: "middle" }}>
                        {invDisplayId(inv.id)}
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 500, color: FD.k9, padding: "11px 16px", borderBottom: bd, verticalAlign: "middle" }}>{tenantLabel}</td>
                      <td className={dmMono.className} style={{ fontSize: 12, color: FD.k9, padding: "11px 16px", borderBottom: bd, verticalAlign: "middle" }}>
                        {unitLabel}
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: bd, verticalAlign: "middle" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            background: FD.k0,
                            color: FD.k7,
                          }}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className={dmMono.className} style={{ fontSize: 12, fontWeight: 500, color: amtColor, padding: "11px 16px", borderBottom: bd, verticalAlign: "middle" }}>
                        {fmtKES(Number(inv.total_amount))}
                      </td>
                      <td style={{ color: FD.k5, fontSize: 12, padding: "11px 16px", borderBottom: bd, verticalAlign: "middle" }}>{fmtDue(inv.due_date)}</td>
                      <td style={{ padding: "11px 16px", borderBottom: bd, verticalAlign: "middle" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: b.bg, color: b.color }}>
                          {b.label}
                        </span>
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: bd, verticalAlign: "middle" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 5 }}>
                          {inv.status !== "paid" && inv.status !== "cancelled" && (
                            <button
                              type="button"
                              onClick={() => alert(`Reminder for ${invDisplayId(inv.id)} (connect notification API)`)}
                              style={abPrimaryStyle(dmSans.style.fontFamily)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = FD.primaryHover;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = FD.g7;
                              }}
                            >
                              Remind
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => router.push(`/billing/${inv.id}`)}
                            style={abGhostStyle(dmSans.style.fontFamily)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = FD.k0;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = FD.wh;
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: `0.5px solid ${FD.bd}` }}>
            <div style={{ fontSize: 12, color: FD.k5 }}>
              Showing {filtered.length === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtered.length)} of {filtered.length} invoices
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <button
                type="button"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={pgBtnStyle(dmSans.style.fontFamily, pageSafe <= 1)}
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pn) => (
                <button
                  key={pn}
                  type="button"
                  onClick={() => setPage(pn)}
                  style={{
                    ...pgBtnStyle(dmSans.style.fontFamily, false),
                    ...(pn === pageSafe
                      ? { background: FD.g7, color: FD.wh, borderColor: FD.g7 }
                      : {}),
                  }}
                >
                  {pn}
                </button>
              ))}
              <button
                type="button"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={pgBtnStyle(dmSans.style.fontFamily, pageSafe >= totalPages)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes invStatIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function IconDownload() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function abGhostStyle(font: string): React.CSSProperties {
  return {
    height: 24,
    padding: "0 9px",
    borderRadius: FD.rsm,
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: font,
    border: `0.5px solid ${FD.bdm}`,
    background: FD.wh,
    color: FD.k7,
    transition: "all 0.15s",
  };
}

function abPrimaryStyle(font: string): React.CSSProperties {
  return {
    height: 24,
    padding: "0 9px",
    borderRadius: FD.rsm,
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: font,
    border: `0.5px solid ${FD.g7}`,
    background: FD.g7,
    color: FD.wh,
    transition: "all 0.15s",
  };
}

function pgBtnStyle(font: string, disabled: boolean): React.CSSProperties {
  return {
    height: 30,
    padding: "0 12px",
    background: FD.wh,
    border: `0.5px solid ${FD.bdm}`,
    borderRadius: FD.rmd,
    fontSize: 12,
    fontWeight: 500,
    color: FD.k7,
    cursor: disabled ? "default" : "pointer",
    fontFamily: font,
    opacity: disabled ? 0.4 : 1,
    transition: "all 0.15s",
  };
}
