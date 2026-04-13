"use client";
import React, { useEffect, useState } from "react";
import { listProperties } from "@/lib/api/properties";
import { getFinancialReport } from "@/lib/api/billing";
import type { Property, FinancialReport } from "@/types/api";

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
const AMBER = "#D97706";
const AMBERBG = "#FFFBEB";

const now = new Date();

const MONTH_OPTIONS = [
  { value: "", label: "Full Year" },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2024, i).toLocaleString("default", { month: "long" }),
  })),
];

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const y = now.getFullYear() - 2 + i;
  return { value: String(y), label: String(y) };
});

function fmtKES(v: string | number) {
  return `KES ${Number(v).toLocaleString()}`;
}
function capitalize(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReportsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProperties().then(setProperties).catch(() => {});
  }, []);

  async function handleGenerate() {
    if (!selectedProperty || !year) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const r = await getFinancialReport(
        Number(selectedProperty),
        Number(year),
        month ? Number(month) : undefined,
      );
      setReport(r);
    } catch {
      setError("Failed to load report. The selected period may have no data.");
    } finally {
      setLoading(false);
    }
  }

  const netPositive = report ? Number(report.net_income) >= 0 : true;
  const maxBar = report
    ? Math.max(Number(report.income?.total_income || 0), Number(report.expenses?.total || 0), 1)
    : 1;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: GRAY900, margin: 0 }}>Financial Reports</h1>
          <p style={{ fontSize: 13, color: GRAY500, marginTop: 2 }}>Analyse income, expenses, and net income by period</p>
        </div>
        <button
          onClick={() => alert("PDF export coming soon")}
          style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${GRAY200}`, background: WHITE, color: GRAY700, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          Export PDF
        </button>
      </div>

      {/* Controls bar */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: GRAY500, marginBottom: 5 }}>PROPERTY</label>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${GRAY200}`, fontSize: 13, color: GRAY900, minWidth: 220, background: WHITE }}
          >
            <option value="">Select property…</option>
            {properties.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: GRAY500, marginBottom: 5 }}>YEAR</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${GRAY200}`, fontSize: 13, color: GRAY900, background: WHITE }}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: GRAY500, marginBottom: 5 }}>MONTH</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${GRAY200}`, fontSize: 13, color: GRAY900, minWidth: 140, background: WHITE }}
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !selectedProperty}
          style={{
            padding: "9px 22px", borderRadius: 8, border: "none",
            background: !selectedProperty ? GRAY200 : GREEN,
            color: !selectedProperty ? GRAY500 : WHITE,
            fontSize: 13, fontWeight: 600, cursor: !selectedProperty ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating…" : "Generate Report"}
        </button>
      </div>

      {error && (
        <div style={{ background: REDBG, border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: RED, fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
          <span style={{ color: GRAY500 }}>Loading…</span>
        </div>
      )}

      {!report && !loading && !error && (
        <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, background: GRAY100, padding: "64px 24px", textAlign: "center" }}>
          <p style={{ color: GRAY400, fontSize: 15, margin: 0 }}>Select a property and period, then click Generate Report</p>
        </div>
      )}

      {report && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Period label */}
          <p style={{ fontSize: 13, color: GRAY500, margin: 0 }}>
            Report period: <strong style={{ color: GRAY900 }}>{report.period}</strong>
          </p>

          {/* Stats cards row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "16px 20px" }}>
              <p style={{ fontSize: 11, color: GRAY500, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Income</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: GREEN, fontFamily: "monospace", margin: 0 }}>
                {fmtKES(report.income?.total_income ?? 0)}
              </p>
            </div>
            <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "16px 20px" }}>
              <p style={{ fontSize: 11, color: GRAY500, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Expenses</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: RED, fontFamily: "monospace", margin: 0 }}>
                {fmtKES(report.expenses?.total ?? 0)}
              </p>
            </div>
            <div style={{
              border: `0.5px solid ${netPositive ? "#BBF7D0" : "#FECACA"}`,
              borderRadius: 16,
              backgroundColor: netPositive ? "#F0FDF4" : REDBG,
              padding: "16px 20px",
            }}>
              <p style={{ fontSize: 11, color: netPositive ? "#15803D" : RED, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Net Income</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: netPositive ? GREEN : RED, fontFamily: "monospace", margin: 0 }}>
                {fmtKES(report.net_income)}
              </p>
            </div>
          </div>

          {/* Visual bar chart */}
          <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "20px 24px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: GRAY900, marginBottom: 20 }}>Revenue vs Expenses</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Total Income",   value: Number(report.income?.total_income ?? 0),  color: GREEN },
                { label: "Rent Income",    value: Number(report.income?.rent_invoiced ?? 0),  color: "#059669" },
                { label: "Collected",      value: Number(report.income?.total_collected ?? 0), color: "#10B981" },
                { label: "Total Expenses", value: Number(report.expenses?.total ?? 0),        color: RED },
              ].map((bar) => (
                <div key={bar.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: GRAY700 }}>{bar.label}</span>
                    <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: GRAY900 }}>{fmtKES(bar.value)}</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 6, background: GRAY200, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min((bar.value / maxBar) * 100, 100)}%`, background: bar.color, borderRadius: 6, transition: "width 0.4s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Income breakdown + Expense breakdown side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Income breakdown */}
            <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "20px 24px" }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: GRAY900, marginBottom: 14 }}>Income Breakdown</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { label: "Rent Invoiced",    value: report.income?.rent_invoiced ?? "0" },
                  { label: "Late Fees",         value: report.income?.late_fees_invoiced ?? "0" },
                  { label: "Total Invoiced",    value: report.income?.total_invoiced ?? "0" },
                  { label: "Total Collected",   value: report.income?.total_collected ?? "0" },
                  { label: "Additional Income", value: report.income?.additional_income ?? "0" },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < arr.length - 1 ? `1px solid ${GRAY200}` : "none" }}>
                    <span style={{ fontSize: 13, color: GRAY500 }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontFamily: "monospace", color: GRAY900 }}>{fmtKES(row.value)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", borderTop: `2px solid ${GRAY200}`, marginTop: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: GRAY900 }}>Total Income</span>
                  <span style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 700, color: GREEN }}>{fmtKES(report.income?.total_income ?? 0)}</span>
                </div>
              </div>

              {/* Additional income by type */}
              {report.income?.additional_income_by_type && Object.keys(report.income.additional_income_by_type).length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${GRAY200}` }}>
                  <p style={{ fontSize: 11, color: GRAY500, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>By Type</p>
                  {Object.entries(report.income.additional_income_by_type).map(([name, amt]) => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${GRAY200}` }}>
                      <span style={{ fontSize: 12, color: GRAY700 }}>{name}</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace", color: GRAY900 }}>{fmtKES(amt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expense breakdown */}
            <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "20px 24px" }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: GRAY900, marginBottom: 14 }}>Expense Breakdown</h2>
              {report.expenses?.by_category && Object.keys(report.expenses.by_category).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {Object.entries(report.expenses.by_category)
                    .sort((a, b) => Number(b[1]) - Number(a[1]))
                    .map(([cat, amt], i, arr) => (
                      <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < arr.length - 1 ? `1px solid ${GRAY200}` : "none" }}>
                        <span style={{ fontSize: 13, color: GRAY500 }}>{capitalize(cat)}</span>
                        <span style={{ fontSize: 13, fontFamily: "monospace", color: GRAY900 }}>{fmtKES(amt)}</span>
                      </div>
                    ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", borderTop: `2px solid ${GRAY200}`, marginTop: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: GRAY900 }}>Total Expenses</span>
                    <span style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 700, color: RED }}>{fmtKES(report.expenses?.total ?? 0)}</span>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: GRAY400 }}>No expense data for this period.</p>
              )}
            </div>
          </div>

          {/* Invoice summary */}
          <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "20px 24px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: GRAY900, marginBottom: 16 }}>Invoice Summary</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {[
                { label: "Paid",      value: report.invoices?.paid ?? 0,      bg: "#F0FDF4", color: "#15803D" },
                { label: "Pending",   value: report.invoices?.pending ?? 0,    bg: AMBERBG,   color: AMBER },
                { label: "Overdue",   value: report.invoices?.overdue ?? 0,    bg: REDBG,     color: RED },
                { label: "Partial",   value: report.invoices?.partial ?? 0,    bg: "#EFF6FF", color: "#1D4ED8" },
                { label: "Cancelled", value: report.invoices?.cancelled ?? 0,  bg: GRAY100,   color: GRAY500 },
              ].map((s) => (
                <div key={s.label} style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 12, background: s.bg, padding: "12px 16px", textAlign: "center" }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: s.color, margin: "0 0 4px" }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: s.color, margin: 0, opacity: 0.85 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
