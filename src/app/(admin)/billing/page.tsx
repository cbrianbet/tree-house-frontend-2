"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listInvoices } from "@/lib/api/billing";
import type { Invoice, InvoiceStatus } from "@/types/api";

const GREEN = "#1D9E75";
const GRAY900 = "#111827";
const GRAY700 = "#374151";
const GRAY500 = "#6B7280";
const GRAY400 = "#9CA3AF";
const GRAY200 = "#E5E7EB";
const GRAY100 = "#F9FAFB";
const WHITE = "#FFFFFF";
const RED = "#EF4444";
const REDBG = "#FEF2F2";

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; color: string }> = {
  paid:      { bg: "#F0FDF4", color: "#15803D" },
  pending:   { bg: "#FFFBEB", color: "#D97706" },
  overdue:   { bg: REDBG,     color: RED },
  partial:   { bg: "#EFF6FF", color: "#1D4ED8" },
  cancelled: { bg: GRAY100,   color: GRAY500 },
};

const STATUS_LABELS: InvoiceStatus[] = ["paid", "pending", "overdue", "partial", "cancelled"];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtPeriod(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const sm = s.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  const em = e.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return sm === em ? sm : `${sm} – ${em}`;
}

function fmtKES(v: string | number) {
  return `KES ${Number(v).toLocaleString()}`;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

  useEffect(() => {
    listInvoices()
      .then(setInvoices)
      .catch(() => setError("Failed to load invoices."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = invoices.filter((inv) => {
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      String(inv.id).includes(q) ||
      String(inv.lease).includes(q);
    return matchStatus && matchSearch;
  });

  const totalCount = invoices.length;
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const pendingCount = invoices.filter((i) => i.status === "pending").length;
  const overdueAmount = invoices
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.total_amount), 0);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <span style={{ color: GRAY500 }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: GRAY900, margin: 0 }}>Invoices</h1>
          <p style={{ fontSize: 13, color: GRAY500, marginTop: 2 }}>Manage and track all property invoices</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => alert("Export coming soon")}
            style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${GRAY200}`, background: WHITE, color: GRAY700, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            Export CSV
          </button>
          <button
            onClick={() => alert("Invoice creation not available via API")}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: GREEN, color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            + New Invoice
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: REDBG, border: `1px solid #FECACA`, borderRadius: 8, padding: "10px 14px", color: RED, fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Invoices", value: totalCount, mono: false },
          { label: "Paid", value: paidCount, mono: false, accent: GREEN },
          { label: "Pending", value: pendingCount, mono: false, accent: "#D97706" },
          { label: "Overdue Amount", value: fmtKES(overdueAmount), mono: true, accent: RED },
        ].map((s) => (
          <div key={s.label} style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "16px 20px" }}>
            <p style={{ fontSize: 12, color: GRAY500, marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: s.mono ? 18 : 28, fontWeight: 700, color: s.accent || GRAY900, fontFamily: s.mono ? "monospace" : "inherit", margin: 0 }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter toolbar */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by invoice ID or lease ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 240px", padding: "8px 12px", borderRadius: 8, border: `1px solid ${GRAY200}`, fontSize: 13, color: GRAY700, outline: "none" }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", ...STATUS_LABELS] as (InvoiceStatus | "all")[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
                border: statusFilter === s ? `1.5px solid ${GREEN}` : `1px solid ${GRAY200}`,
                background: statusFilter === s ? "#F0FDF4" : WHITE,
                color: statusFilter === s ? GREEN : GRAY700,
              }}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: GRAY100 }}>
              {["Invoice ID", "Lease", "Period", "Due Date", "Amount", "Status", "Actions"].map((col) => (
                <th key={col} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: GRAY500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "48px 0", color: GRAY400, fontSize: 14 }}>
                  {search || statusFilter !== "all" ? "No invoices match your filters." : "No invoices found."}
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const s = STATUS_STYLES[inv.status] || STATUS_STYLES.cancelled;
                return (
                  <tr
                    key={inv.id}
                    style={{ borderBottom: `1px solid ${GRAY200}`, transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = GRAY100)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 13, color: GRAY900 }}>
                      #{inv.id}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: GRAY700 }}>
                      Lease #{inv.lease}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: GRAY700 }}>
                      {fmtPeriod(inv.period_start, inv.period_end)}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: GRAY700 }}>
                      {fmtDate(inv.due_date)}
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: GRAY900 }}>
                      {fmtKES(inv.total_amount)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => router.push(`/billing/${inv.id}`)}
                        style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${GRAY200}`, background: WHITE, color: GRAY700, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: GRAY400, marginTop: 12 }}>
        Showing {filtered.length} of {totalCount} invoices
      </p>
    </div>
  );
}
