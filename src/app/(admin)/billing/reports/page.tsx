"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DM_Mono, DM_Sans } from "next/font/google";
import { listProperties } from "@/lib/api/properties";
import { getFinancialReport } from "@/lib/api/billing";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";
import { FD, financeFsel, financeGbtn } from "@/constants/financeDesign";
import PageLoader from "@/components/ui/PageLoader";
import type { FinancialReport, Property } from "@/types/api";
import { MonthlyRevenueExpenseBar, OccupancyTrendLine } from "./ReportCharts";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

type RangePreset = "6m" | "12m" | "month";

interface MonthRef {
  year: number;
  month: number;
}

function monthKey(m: MonthRef) {
  return `${m.year}-${String(m.month).padStart(2, "0")}`;
}

function monthLabelShort(m: MonthRef) {
  const d = new Date(m.year, m.month - 1);
  return d.toLocaleString("en-KE", { month: "short" });
}

/** Oldest → newest: `count` months ending at (endYear, endMonth). */
function rollingMonths(endYear: number, endMonth: number, count: number): MonthRef[] {
  const out: MonthRef[] = [];
  let y = endYear;
  let mo = endMonth;
  for (let i = 0; i < count; i++) {
    out.unshift({ year: y, month: mo });
    mo -= 1;
    if (mo < 1) {
      mo = 12;
      y -= 1;
    }
  }
  return out;
}

function fmtKES(v: string | number) {
  return `KES ${Number(v).toLocaleString()}`;
}

function capitalize(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function addMoney(a: number, s: string | undefined) {
  return a + Number(s ?? 0);
}

/** Sum category maps by key. */
function mergeMoneyMaps(
  maps: Record<string, string>[],
): Record<string, string> {
  const acc: Record<string, number> = {};
  for (const m of maps) {
    for (const [k, v] of Object.entries(m)) {
      acc[k] = (acc[k] ?? 0) + Number(v);
    }
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(acc)) {
    out[k] = v.toFixed(2);
  }
  return out;
}

/** Merge several single-period reports (e.g. all properties, same month). */
function mergeFinancialReports(reports: FinancialReport[], periodLabel: string): FinancialReport {
  if (reports.length === 0) {
    throw new Error("No reports to merge");
  }
  const first = reports[0];
  const rent = reports.reduce((s, r) => addMoney(s, r.income?.rent_invoiced), 0);
  const late = reports.reduce((s, r) => addMoney(s, r.income?.late_fees_invoiced), 0);
  const inv = reports.reduce((s, r) => addMoney(s, r.income?.total_invoiced), 0);
  const coll = reports.reduce((s, r) => addMoney(s, r.income?.total_collected), 0);
  const addl = reports.reduce((s, r) => addMoney(s, r.income?.additional_income), 0);
  const totalInc = reports.reduce((s, r) => addMoney(s, r.income?.total_income), 0);
  const expTotal = reports.reduce((s, r) => addMoney(s, r.expenses?.total), 0);
  const net = reports.reduce((s, r) => addMoney(s, r.net_income), 0);
  const addlByType = mergeMoneyMaps(
    reports.map((r) => r.income?.additional_income_by_type ?? {}),
  );
  const expByCat = mergeMoneyMaps(reports.map((r) => r.expenses?.by_category ?? {}));
  const invCounts = reports.reduce(
    (a, r) => ({
      paid: a.paid + (r.invoices?.paid ?? 0),
      pending: a.pending + (r.invoices?.pending ?? 0),
      overdue: a.overdue + (r.invoices?.overdue ?? 0),
      partial: a.partial + (r.invoices?.partial ?? 0),
      cancelled: a.cancelled + (r.invoices?.cancelled ?? 0),
    }),
    { paid: 0, pending: 0, overdue: 0, partial: 0, cancelled: 0 },
  );
  return {
    property: first.property,
    period: periodLabel,
    income: {
      rent_invoiced: rent.toFixed(2),
      late_fees_invoiced: late.toFixed(2),
      total_invoiced: inv.toFixed(2),
      total_collected: coll.toFixed(2),
      additional_income: addl.toFixed(2),
      additional_income_by_type: addlByType,
      total_income: totalInc.toFixed(2),
    },
    expenses: { total: expTotal.toFixed(2), by_category: expByCat },
    net_income: net.toFixed(2),
    invoices: invCounts,
    occupancy: null,
    occupancy_series: [],
    occupancy_avg_pct: null,
  };
}

interface MonthTotals {
  revenue: number;
  expense: number;
  net: number;
  invoiced: number;
  collected: number;
}

function totalsFromReport(r: FinancialReport): MonthTotals {
  return {
    revenue: Number(r.income?.total_income ?? 0),
    expense: Number(r.expenses?.total ?? 0),
    net: Number(r.net_income ?? 0),
    invoiced: Number(r.income?.total_invoiced ?? 0),
    collected: Number(r.income?.total_collected ?? 0),
  };
}

function sumMonthTotals(rows: MonthTotals[]): MonthTotals {
  return rows.reduce(
    (a, r) => ({
      revenue: a.revenue + r.revenue,
      expense: a.expense + r.expense,
      net: a.net + r.net,
      invoiced: a.invoiced + r.invoiced,
      collected: a.collected + r.collected,
    }),
    { revenue: 0, expense: 0, net: 0, invoiced: 0, collected: 0 },
  );
}

function collectionPct(t: MonthTotals) {
  return t.invoiced > 0 ? (t.collected / t.invoiced) * 100 : 0;
}

const ALL_VALUE = "__all__";

export default function ReportsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [scope, setScope] = useState<string>("");
  const [rangePreset, setRangePreset] = useState<RangePreset>("6m");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [multiMonths, setMultiMonths] = useState<MonthRef[] | null>(null);
  const [multiByMonth, setMultiByMonth] = useState<MonthTotals[] | null>(null);
  const [multiGrand, setMultiGrand] = useState<MonthTotals | null>(null);

  const [portfolioRows, setPortfolioRows] = useState<
    { id: number; name: string; t: MonthTotals; collectionPct: number }[]
  >([]);

  const [singleReport, setSingleReport] = useState<FinancialReport | null>(null);
  const [singleLabel, setSingleLabel] = useState<string>("");

  const font = dmSans.style.fontFamily;
  const mono = dmMono.style.fontFamily;

  useEffect(() => {
    listProperties()
      .then((list) => {
        setProperties(list);
        if (list.length > 1) setScope(ALL_VALUE);
        else if (list.length === 1) setScope(String(list[0].id));
      })
      .catch(() => {});
  }, []);

  const propertyIdsForScope = useMemo(() => {
    if (!properties.length) return [];
    if (scope === ALL_VALUE) return properties.map((p) => p.id);
    if (scope === "") return [];
    const id = Number(scope);
    return Number.isFinite(id) && id > 0 ? [id] : [];
  }, [properties, scope]);

  const propertyScopeKey = useMemo(
    () => propertyIdsForScope.join(","),
    [propertyIdsForScope],
  );

  const load = useCallback(async () => {
    if (properties.length === 0 || propertyIdsForScope.length === 0) return;

    const y = Number(year);
    const mo = Number(month);
    if (!y || mo < 1 || mo > 12) return;

    setLoading(true);
    setError(null);
    setMultiMonths(null);
    setMultiByMonth(null);
    setMultiGrand(null);
    setPortfolioRows([]);
    setSingleReport(null);
    setSingleLabel("");

    try {
      if (rangePreset === "month") {
        const reps = await Promise.all(
          propertyIdsForScope.map((pid) => getFinancialReport(pid, y, mo)),
        );
        const period = monthKey({ year: y, month: mo });
        const merged = mergeFinancialReports(reps, period);
        setSingleReport(merged);
        const names = propertyIdsForScope
          .map((id) => properties.find((p) => p.id === id)?.name ?? `Property ${id}`)
          .join(", ");
        setSingleLabel(
          scope === ALL_VALUE ? `All properties (${reps.length})` : names,
        );

        const monthRows = reps.map((r, i) => {
          const pid = propertyIdsForScope[i];
          const t = totalsFromReport(r);
          return {
            id: pid,
            name: properties.find((p) => p.id === pid)?.name ?? `Property ${pid}`,
            t,
            collectionPct: collectionPct(t),
          };
        });
        setPortfolioRows(monthRows.sort((a, b) => b.t.net - a.t.net));
      } else {
        const count = rangePreset === "6m" ? 6 : 12;
        const months = rollingMonths(y, mo, count);
        const byMonth: MonthTotals[] = months.map(() => ({
          revenue: 0,
          expense: 0,
          net: 0,
          invoiced: 0,
          collected: 0,
        }));

        const byProperty = await Promise.all(
          propertyIdsForScope.map((pid) =>
            Promise.all(months.map((m) => getFinancialReport(pid, m.year, m.month))),
          ),
        );

        for (const series of byProperty) {
          series.forEach((r, mi) => {
            const t = totalsFromReport(r);
            byMonth[mi].revenue += t.revenue;
            byMonth[mi].expense += t.expense;
            byMonth[mi].net += t.net;
            byMonth[mi].invoiced += t.invoiced;
            byMonth[mi].collected += t.collected;
          });
        }

        const grand = sumMonthTotals(byMonth);
        setMultiMonths(months);
        setMultiByMonth(byMonth);
        setMultiGrand(grand);

        const rollRows = propertyIdsForScope.map((pid, idx) => {
          const series = byProperty[idx];
          const t = sumMonthTotals(series.map(totalsFromReport));
          return {
            id: pid,
            name: properties.find((p) => p.id === pid)?.name ?? `Property ${pid}`,
            t,
            collectionPct: collectionPct(t),
          };
        });
        setPortfolioRows(rollRows.sort((a, b) => b.t.net - a.t.net));
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
          ? (e as Error).message
          : "Could not load this report. Try another property or period.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [properties, propertyIdsForScope, scope, year, month, rangePreset]);

  useEffect(() => {
    if (properties.length > 0 && propertyIdsForScope.length > 0) {
      void load();
    }
  }, [load, properties.length, propertyScopeKey, propertyIdsForScope.length]);

  const headlineSingle = singleReport ? totalsFromReport(singleReport) : null;
  const headlineMulti = multiGrand;
  const headlineTotals = headlineMulti ?? headlineSingle;

  const showMultiCharts = rangePreset !== "month" && multiMonths && multiByMonth && headlineMulti;
  const collectionBlended = headlineMulti ? collectionPct(headlineMulti) : headlineSingle ? collectionPct(headlineSingle) : 0;
  const marginPct =
    headlineMulti && headlineMulti.revenue > 0
      ? (headlineMulti.net / headlineMulti.revenue) * 100
      : headlineSingle && headlineSingle.revenue > 0
        ? (headlineSingle.net / headlineSingle.revenue) * 100
        : 0;

  const periodKpiHint =
    rangePreset === "month" ? "Selected month" : rangePreset === "6m" ? "Last 6 months" : "Last 12 months";
  const collectionHint =
    headlineTotals && headlineTotals.invoiced > 0
      ? `${fmtKES(headlineTotals.collected)} collected of ${fmtKES(headlineTotals.invoiced)} invoiced`
      : "No invoiced amount in this view";

  const maxBar = singleReport
    ? Math.max(
        Number(singleReport.income?.total_income ?? 0),
        Number(singleReport.expenses?.total ?? 0),
        1,
      )
    : 1;

  return (
    <div
      className={`${dmSans.className} -mx-4 md:-mx-6`}
      style={{
        fontFamily: font,
        fontSize: 14,
        color: FD.k9,
        background: FD.surf,
        minHeight: "100%",
      }}
    >
      <FinancePageTopBar
        className="-mt-4 md:-mt-6"
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Invoices", href: "/billing" },
          { label: "Financial reports" },
        ]}
        right={
          <>
            <select
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value as RangePreset)}
              title="Report range"
              style={financeFsel(font, 150)}
            >
              <option value="6m">Last 6 months</option>
              <option value="12m">Last 12 months</option>
              <option value="month">Single month</option>
            </select>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              title="Property"
              style={financeFsel(font, 200)}
            >
              {properties.length > 1 && <option value={ALL_VALUE}>All properties</option>}
              {properties.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              title={rangePreset === "month" ? "Month" : "End month"}
              style={financeFsel(font, 130)}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {new Date(2024, i).toLocaleString("en-KE", { month: "long" })}
                </option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(e.target.value)} title="Year" style={financeFsel(font, 88)}>
              {Array.from({ length: 7 }, (_, i) => {
                const yy = new Date().getFullYear() - 3 + i;
                return (
                  <option key={yy} value={String(yy)}>
                    {yy}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              onClick={() => alert("PDF export coming soon")}
              className="transition-colors hover:bg-[#F2F1EB]"
              style={financeGbtn(font)}
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="transition-colors hover:bg-[#F2F1EB] disabled:opacity-60"
              style={{
                ...financeGbtn(font),
                cursor: loading ? "wait" : "pointer",
              }}
            >
              Refresh
            </button>
          </>
        }
      />

      <div className="px-4 md:px-6" style={{ paddingTop: 22, paddingBottom: 24 }}>
        {error && (
          <div
            style={{
              background: FD.r0,
              border: `0.5px solid ${FD.r3}`,
              borderRadius: FD.rlg,
              padding: "12px 14px",
              color: FD.r6,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {loading && <PageLoader />}

        {!loading && (headlineMulti || headlineSingle) && (
          <>
            {(headlineMulti || headlineSingle) && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  gap: 10,
                  marginBottom: 16,
                }}
                className="max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1"
              >
                <StatCard
                  label="Gross revenue"
                  value={fmtKES((headlineMulti ?? headlineSingle)!.revenue)}
                  hint={periodKpiHint}
                  accent={FD.g7}
                  mono={mono}
                />
                <StatCard
                  label="Total expenses"
                  value={fmtKES((headlineMulti ?? headlineSingle)!.expense)}
                  hint={periodKpiHint}
                  accent={FD.r6}
                  mono={mono}
                />
                <StatCard
                  label="Net income"
                  value={fmtKES((headlineMulti ?? headlineSingle)!.net)}
                  hint={`${marginPct.toFixed(1)}% margin on revenue`}
                  accent={(headlineMulti ?? headlineSingle)!.net >= 0 ? FD.g7 : FD.r6}
                  mono={mono}
                />
                <StatCard
                  label="Avg occupancy"
                  value="—"
                  hint="Same period as above · not in this report yet"
                  accent={FD.k9}
                  mono={mono}
                />
                <StatCard
                  label="Collection rate"
                  value={`${collectionBlended.toFixed(1)}%`}
                  hint={collectionHint}
                  accent={collectionBlended >= 90 ? FD.g7 : collectionBlended >= 75 ? FD.a7 : FD.k7}
                  mono={mono}
                />
              </div>
            )}

            {showMultiCharts && multiMonths && multiByMonth && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
                className="max-lg:grid-cols-1"
              >
                <div style={card}>
                  <div style={cardHead}>
                    <span style={cardTitle}>Monthly revenue vs expenses</span>
                  </div>
                  <MonthlyRevenueExpenseBar
                    labels={multiMonths.map((m) => monthLabelShort(m))}
                    revenue={multiByMonth.map((r) => r.revenue)}
                    expenses={multiByMonth.map((r) => r.expense)}
                    fontSans={font}
                    fontMono={mono}
                  />
                </div>

                <div style={card}>
                  <div style={cardHead}>
                    <span style={cardTitle}>Occupancy trend</span>
                  </div>
                  <OccupancyTrendLine
                    labels={multiMonths.map((m) => monthLabelShort(m))}
                    occupancyPct={null}
                    fontSans={font}
                    fontMono={mono}
                  />
                </div>
              </div>
            )}

            {portfolioRows.length > 0 && (
              <div style={{ ...card, marginBottom: 14 }}>
                <div style={{ ...cardHead, marginBottom: 12 }}>
                  <span style={cardTitle}>Per-property breakdown</span>
                  <span style={{ fontSize: 12, color: FD.k5 }}>
                    {rangePreset === "month" ? "Same calendar month" : `${rangePreset === "6m" ? "6" : "12"}-month window`}
                  </span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                    <thead>
                      <tr>
                        {["Property", "Revenue", "Expenses", "Net", "Collection"].map((h) => (
                          <th key={h} style={thStyle(h === "Property")}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {portfolioRows.map((row) => (
                        <tr key={row.id}>
                          <td style={tdStyle(true)}>{row.name}</td>
                          <td className={dmMono.className} style={{ ...tdStyle(false), color: FD.g7, fontFamily: mono }}>
                            {fmtKES(row.t.revenue)}
                          </td>
                          <td className={dmMono.className} style={{ ...tdStyle(false), color: FD.r6, fontFamily: mono }}>
                            {fmtKES(row.t.expense)}
                          </td>
                          <td className={dmMono.className} style={{ ...tdStyle(false), color: FD.g7, fontFamily: mono, fontWeight: 500 }}>
                            {fmtKES(row.t.net)}
                          </td>
                          <td style={tdStyle(false)}>
                            <span
                              style={{
                                fontWeight: 500,
                                color: row.collectionPct >= 90 ? FD.g7 : row.collectionPct >= 75 ? FD.a7 : FD.r6,
                              }}
                            >
                              {row.collectionPct.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {singleReport && rangePreset === "month" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: 13, color: FD.k5, margin: 0 }}>
                  <strong style={{ color: FD.k9 }}>{singleReport.period}</strong>
                  {singleLabel ? ` · ${singleLabel}` : null}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="max-lg:grid-cols-1">
                  <div style={card}>
                    <h2 style={h2}>Income</h2>
                    {[
                      { label: "Rent invoiced", value: singleReport.income?.rent_invoiced ?? "0" },
                      { label: "Late fees", value: singleReport.income?.late_fees_invoiced ?? "0" },
                      { label: "Total invoiced", value: singleReport.income?.total_invoiced ?? "0" },
                      { label: "Collected", value: singleReport.income?.total_collected ?? "0" },
                      { label: "Additional income", value: singleReport.income?.additional_income ?? "0" },
                    ].map((row, i, arr) => (
                      <RowLine key={row.label} row={row} last={i === arr.length - 1} mono={mono} />
                    ))}
                    <div style={{ ...rowFlex, paddingTop: 12, marginTop: 4, borderTop: `0.5px solid ${FD.bd}` }}>
                      <span style={{ fontWeight: 500, color: FD.k9 }}>Total income</span>
                      <span className={dmMono.className} style={{ fontFamily: mono, fontWeight: 500, color: FD.g7 }}>
                        {fmtKES(singleReport.income?.total_income ?? 0)}
                      </span>
                    </div>
                    {singleReport.income?.additional_income_by_type &&
                      Object.keys(singleReport.income.additional_income_by_type).length > 0 && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `0.5px dashed ${FD.bd}` }}>
                          <p style={lbl2}>Additional income by type</p>
                          {Object.entries(singleReport.income.additional_income_by_type).map(([name, amt]) => (
                            <div key={name} style={rowFlex}>
                              <span style={{ color: FD.k5 }}>{name}</span>
                              <span className={dmMono.className} style={{ fontFamily: mono }}>
                                {fmtKES(amt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                  <div style={card}>
                    <h2 style={h2}>Expenses</h2>
                    {singleReport.expenses?.by_category &&
                    Object.keys(singleReport.expenses.by_category).length > 0 ? (
                      Object.entries(singleReport.expenses.by_category)
                        .sort((a, b) => Number(b[1]) - Number(a[1]))
                        .map(([cat, amt], i, arr) => (
                          <div
                            key={cat}
                            style={{
                              ...rowFlex,
                              borderBottom: i < arr.length - 1 ? `0.5px solid ${FD.bd}` : "none",
                              padding: "9px 0",
                            }}
                          >
                            <span style={{ color: FD.k5 }}>{capitalize(cat)}</span>
                            <span className={dmMono.className} style={{ fontFamily: mono }}>
                              {fmtKES(amt)}
                            </span>
                          </div>
                        ))
                    ) : (
                      <p style={{ color: FD.k5, fontSize: 13 }}>No expenses in this period.</p>
                    )}
                    <div style={{ ...rowFlex, paddingTop: 12, marginTop: 8, borderTop: `0.5px solid ${FD.bd}` }}>
                      <span style={{ fontWeight: 500 }}>Total</span>
                      <span className={dmMono.className} style={{ fontFamily: mono, fontWeight: 500, color: FD.r6 }}>
                        {fmtKES(singleReport.expenses?.total ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={card}>
                  <h2 style={h2}>Mix (vs largest line item)</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { label: "Total income", value: Number(singleReport.income?.total_income ?? 0), c: FD.g5 },
                      { label: "Collected", value: Number(singleReport.income?.total_collected ?? 0), c: FD.g7 },
                      { label: "Expenses", value: Number(singleReport.expenses?.total ?? 0), c: FD.r6 },
                    ].map((b) => (
                      <div key={b.label}>
                        <div style={rowFlex}>
                          <span style={{ fontSize: 12, color: FD.k7 }}>{b.label}</span>
                          <span className={dmMono.className} style={{ fontFamily: mono, fontWeight: 500 }}>
                            {fmtKES(b.value)}
                          </span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: FD.k1, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${Math.min(100, (b.value / maxBar) * 100)}%`,
                              height: "100%",
                              background: b.c,
                              borderRadius: 4,
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={card}>
                  <h2 style={h2}>Invoices in period</h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: 8,
                    }}
                    className="max-sm:grid-cols-2"
                  >
                    {[
                      { label: "Paid", n: singleReport.invoices?.paid ?? 0, bg: FD.g1, fg: FD.g7 },
                      { label: "Pending", n: singleReport.invoices?.pending ?? 0, bg: FD.a0, fg: FD.a7 },
                      { label: "Overdue", n: singleReport.invoices?.overdue ?? 0, bg: FD.r0, fg: FD.r6 },
                      { label: "Partial", n: singleReport.invoices?.partial ?? 0, bg: FD.b0, fg: FD.b8 },
                      { label: "Cancelled", n: singleReport.invoices?.cancelled ?? 0, bg: FD.k0, fg: FD.k5 },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          textAlign: "center",
                          padding: "12px 8px",
                          borderRadius: FD.rmd,
                          background: s.bg,
                          border: `0.5px solid ${FD.bd}`,
                        }}
                      >
                        <div className={dmMono.className} style={{ fontSize: 20, fontWeight: 500, color: s.fg, fontFamily: mono }}>
                          {s.n}
                        </div>
                        <div style={{ fontSize: 11, color: s.fg, marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && properties.length === 0 && (
          <p style={{ color: FD.k5 }}>No properties available for reports.</p>
        )}
      </div>
    </div>
  );
}

const lbl2: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
  color: FD.k5,
  marginBottom: 8,
};

const card: React.CSSProperties = {
  background: FD.wh,
  border: `0.5px solid ${FD.bd}`,
  borderRadius: FD.rlg,
  padding: "16px 18px",
};

const cardHead: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 4,
};

const cardTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.4px",
  textTransform: "uppercase",
  color: FD.k5,
};

const h2: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: FD.k9,
  margin: "0 0 12px",
};

const rowFlex: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 13,
};

function RowLine({
  row,
  last,
  mono,
}: {
  row: { label: string; value: string };
  last: boolean;
  mono: string;
}) {
  return (
    <div
      style={{
        ...rowFlex,
        padding: "9px 0",
        borderBottom: last ? "none" : `0.5px solid ${FD.bd}`,
      }}
    >
      <span style={{ color: FD.k5 }}>{row.label}</span>
      <span className={dmMono.className} style={{ fontFamily: mono, color: FD.k9 }}>
        {fmtKES(row.value)}
      </span>
    </div>
  );
}

function thStyle(left: boolean): React.CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.3px",
    textTransform: "uppercase",
    color: FD.k5,
    textAlign: left ? "left" : "right",
    padding: "8px 0 8px 8px",
    borderBottom: `0.5px solid ${FD.bd}`,
  };
}

function tdStyle(left: boolean): React.CSSProperties {
  return {
    fontSize: 13,
    textAlign: left ? "left" : "right",
    padding: "10px 0 10px 8px",
    borderBottom: `0.5px solid ${FD.bd}`,
    verticalAlign: "middle",
  };
}

function StatCard({
  label,
  value,
  hint,
  accent,
  mono,
}: {
  label: string;
  value: string;
  hint: string;
  accent: string;
  mono: string;
}) {
  return (
    <div
      style={{
        background: FD.wh,
        border: `0.5px solid ${FD.bd}`,
        borderRadius: FD.rlg,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 10, color: FD.k5, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 6 }}>
        {label}
      </div>
      <div className={dmMono.className} style={{ fontSize: 17, fontWeight: 500, color: accent, fontFamily: mono }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>{hint}</div>
    </div>
  );
}
