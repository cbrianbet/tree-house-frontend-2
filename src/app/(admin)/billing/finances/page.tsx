"use client";

import React, { useCallback, useEffect, useMemo, useState, FormEvent } from "react";
import { DM_Mono, DM_Sans } from "next/font/google";
import { listProperties, listUnits } from "@/lib/api/properties";
import {
  listAdditionalIncome,
  createAdditionalIncome,
  deleteAdditionalIncome,
  listExpenses,
  createExpense,
  deleteExpense,
  listChargeTypes,
} from "@/lib/api/billing";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";
import PageLoader from "@/components/ui/PageLoader";
import { FD, SELECT_CHEVRON, financeFsel, financeGbtn } from "@/constants/financeDesign";
import type { Property, AdditionalIncome, Expense, ExpenseCategory, ChargeType, Unit } from "@/types/api";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

const ALL_VALUE = "__all__";

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "maintenance", label: "Maintenance" },
  { value: "utility", label: "Utilities" },
  { value: "insurance", label: "Insurance" },
  { value: "tax", label: "Tax" },
  { value: "repair", label: "Repair" },
  { value: "management_fee", label: "Management" },
  { value: "other", label: "Other" },
];

function catColor(c: ExpenseCategory): string {
  switch (c) {
    case "maintenance":
      return FD.a5;
    case "utility":
      return "#378ADD";
    case "insurance":
      return FD.g5;
    case "management_fee":
      return "#7F77DD";
    case "repair":
      return FD.g3;
    case "tax":
      return FD.b8;
    default:
      return "#B4B2A9";
  }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtKES(v: string | number) {
  return `KES ${Number(v).toLocaleString()}`;
}

function capitalize(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function monthKeyFromDate(iso: string) {
  return iso.slice(0, 7);
}

function rollingMonthOptions() {
  const out: { value: string; label: string }[] = [{ value: "", label: "All months" }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-KE", { month: "long", year: "numeric" });
    out.push({ value, label });
  }
  return out;
}

type IncomeRow = { row: AdditionalIncome; propertyId: number; propertyName: string };

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
  height: 36,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

export default function FinancesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [filterProperty, setFilterProperty] = useState<string>(ALL_VALUE);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "">("");

  const [expenseFormPropertyId, setExpenseFormPropertyId] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("other");
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const [incomePropertyId, setIncomePropertyId] = useState("");
  const [incomeUnit, setIncomeUnit] = useState("");
  const [incomeChargeType, setIncomeChargeType] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState("");
  const [incomeDesc, setIncomeDesc] = useState("");
  const [submittingIncome, setSubmittingIncome] = useState(false);

  const font = dmSans.style.fontFamily;

  const propName = useCallback(
    (id: number) => properties.find((p) => p.id === id)?.name ?? `Property ${id}`,
    [properties],
  );

  useEffect(() => {
    listProperties()
      .then((list) => {
        setProperties(list);
        if (list.length === 1) {
          setFilterProperty(String(list[0].id));
          setExpenseFormPropertyId(String(list[0].id));
          setIncomePropertyId(String(list[0].id));
        } else if (list.length > 1) {
          setExpenseFormPropertyId(String(list[0].id));
          setIncomePropertyId(String(list[0].id));
        }
      })
      .catch(() => {});
  }, []);

  const loadAll = useCallback(async () => {
    if (properties.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const packs = await Promise.all(
        properties.map(async (p) => {
          const [ex, inc, ct, u] = await Promise.all([
            listExpenses(p.id),
            listAdditionalIncome(p.id),
            listChargeTypes(p.id),
            listUnits(p.id),
          ]);
          return { p, ex, inc, ct, u };
        }),
      );
      setExpenses(packs.flatMap((x) => x.ex));
      setIncomeRows(
        packs.flatMap((x) =>
          x.inc.map((row) => ({ row, propertyId: x.p.id, propertyName: x.p.name })),
        ),
      );
      const primary = packs[0];
      if (primary) {
        setChargeTypes(primary.ct);
        setUnits(primary.u);
      }
    } catch {
      setError("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [properties]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const pid = Number(incomePropertyId);
    if (!Number.isFinite(pid) || pid <= 0) return;
    (async () => {
      try {
        const [ct, u] = await Promise.all([listChargeTypes(pid), listUnits(pid)]);
        setChargeTypes(ct);
        setUnits(u);
      } catch {
        /* ignore */
      }
    })();
  }, [incomePropertyId]);

  useEffect(() => {
    if (!expenseDate && properties.length) {
      setExpenseDate(new Date().toISOString().split("T")[0]);
    }
  }, [expenseDate, properties.length]);

  const filteredExpenses = useMemo(() => {
    let rows = expenses;
    if (filterProperty !== ALL_VALUE) {
      const id = Number(filterProperty);
      rows = rows.filter((e) => e.property === id);
    }
    if (filterMonth) {
      rows = rows.filter((e) => monthKeyFromDate(e.date) === filterMonth);
    }
    if (filterCategory) {
      rows = rows.filter((e) => e.category === filterCategory);
    }
    return rows;
  }, [expenses, filterProperty, filterMonth, filterCategory]);

  const filteredIncome = useMemo(() => {
    let rows = incomeRows;
    if (filterProperty !== ALL_VALUE) {
      const id = Number(filterProperty);
      rows = rows.filter((r) => r.propertyId === id);
    }
    if (filterMonth) {
      rows = rows.filter((r) => monthKeyFromDate(r.row.date) === filterMonth);
    }
    return rows;
  }, [incomeRows, filterProperty, filterMonth]);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalIncome = filteredIncome.reduce((s, r) => s + Number(r.row.amount), 0);
  const net = totalIncome - totalExpenses;

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      m[e.category] = (m[e.category] || 0) + Number(e.amount);
    });
    return m;
  }, [filteredExpenses]);

  const largestCat = useMemo(() => {
    const entries = Object.entries(byCategory);
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    const [k, v] = entries[0];
    const pct = totalExpenses > 0 ? Math.round((v / totalExpenses) * 100) : 0;
    return { key: k as ExpenseCategory, amount: v, pct };
  }, [byCategory, totalExpenses]);

  const periodLabel = useMemo(() => {
    const monthOpt = rollingMonthOptions().find((o) => o.value === filterMonth);
    const monthPart = monthOpt?.label ?? "All periods";
    const propPart =
      filterProperty === ALL_VALUE ? "All properties" : propName(Number(filterProperty));
    return `${monthPart} · ${propPart}`;
  }, [filterMonth, filterProperty, propName]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function handleAddExpense(e: FormEvent) {
    e.preventDefault();
    const pid = Number(expenseFormPropertyId) || properties[0]?.id || 0;
    if (!pid) {
      showToast("Select a property for this expense.");
      return;
    }
    const desc = [expenseDesc.trim(), expenseNotes.trim()].filter(Boolean).join(" — ") || expenseDesc.trim();
    if (!desc) {
      showToast("Add a description.");
      return;
    }
    setSubmittingExpense(true);
    try {
      await createExpense(pid, {
        description: desc,
        amount: expenseAmount,
        date: expenseDate,
        category: expenseCategory,
      });
      setExpenseDesc("");
      setExpenseNotes("");
      setExpenseAmount("");
      setExpenseCategory("other");
      showToast(`Expense recorded · ${fmtKES(expenseAmount)}`);
      await loadAll();
    } catch {
      setError("Failed to record expense.");
    } finally {
      setSubmittingExpense(false);
    }
  }

  async function handleDeleteExpense(exp: Expense) {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense(exp.property, exp.id);
      setExpenses((prev) => prev.filter((x) => !(x.id === exp.id && x.property === exp.property)));
      showToast("Expense removed");
    } catch {
      setError("Failed to delete.");
    }
  }

  async function handleAddIncome(e: FormEvent) {
    e.preventDefault();
    const pid = Number(incomePropertyId);
    if (!pid) return;
    setSubmittingIncome(true);
    try {
      await createAdditionalIncome(pid, {
        unit: Number(incomeUnit),
        charge_type: Number(incomeChargeType),
        amount: incomeAmount,
        date: incomeDate,
        description: incomeDesc,
      });
      setIncomeUnit("");
      setIncomeChargeType("");
      setIncomeAmount("");
      setIncomeDate("");
      setIncomeDesc("");
      await loadAll();
      showToast("Income recorded");
    } catch {
      setError("Failed to record income.");
    } finally {
      setSubmittingIncome(false);
    }
  }

  async function handleDeleteIncome(ir: IncomeRow) {
    if (!confirm("Delete this income entry?")) return;
    try {
      await deleteAdditionalIncome(ir.propertyId, ir.row.id);
      setIncomeRows((prev) =>
        prev.filter((x) => !(x.row.id === ir.row.id && x.propertyId === ir.propertyId)),
      );
    } catch {
      setError("Failed to delete.");
    }
  }

  function exportCsv() {
    const lines = [
      ["description", "amount", "date", "category", "property"].join(","),
      ...filteredExpenses.map((e) =>
        [
          JSON.stringify(e.description ?? ""),
          e.amount,
          e.date,
          e.category,
          JSON.stringify(propName(e.property)),
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exporting expenses…");
  }

  const monthOptions = rollingMonthOptions();

  return (
    <div
      className={`${dmSans.className} -mx-4 md:-mx-6`}
      style={{ fontFamily: font, fontSize: 14, color: FD.k9, background: FD.surf, minHeight: "100%" }}
    >
      <FinancePageTopBar
        className="-mt-4 md:-mt-6"
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Invoices", href: "/billing" },
          { label: "Expenses" },
        ]}
        right={
          <button
            type="button"
            onClick={exportCsv}
            className="transition-colors hover:bg-[#F2F1EB]"
            style={financeGbtn(font)}
          >
            Export CSV
          </button>
        }
      />

      <div
        className="flex flex-col gap-6 px-4 sm:gap-7 md:px-6"
        style={{ paddingTop: 24, paddingBottom: 32 }}
      >
        {error && (
          <div
            role="alert"
            style={{
              padding: "12px 14px",
              borderRadius: FD.rlg,
              border: `0.5px solid ${FD.r3}`,
              background: FD.r0,
              color: FD.r6,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {properties.length === 0 && !loading && (
          <div
            style={{
              border: `0.5px solid ${FD.bd}`,
              borderRadius: FD.rlg,
              background: FD.k0,
              padding: 48,
              textAlign: "center",
              color: FD.k5,
            }}
          >
            No properties available.
          </div>
        )}

        {properties.length > 0 && loading && (
          <PageLoader />
        )}

        {properties.length > 0 && !loading && (
          <div className="flex flex-col gap-6 sm:gap-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-4">
              <div
                style={{
                  background: FD.wh,
                  border: `0.5px solid ${FD.bd}`,
                  borderRadius: FD.rlg,
                  padding: "16px 18px",
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
                  Total expenses
                </div>
                <div className={dmMono.className} style={{ fontSize: 20, fontWeight: 500, color: FD.r6 }}>
                  {fmtKES(totalExpenses)}
                </div>
                <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>{periodLabel}</div>
              </div>
              <div
                style={{
                  background: FD.wh,
                  border: `0.5px solid ${FD.bd}`,
                  borderRadius: FD.rlg,
                  padding: "16px 18px",
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
                  Net income
                </div>
                <div
                  className={dmMono.className}
                  style={{ fontSize: 20, fontWeight: 500, color: net >= 0 ? FD.g7 : FD.r6 }}
                >
                  {fmtKES(net)}
                </div>
                <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>Revenue minus expenses</div>
              </div>
              <div
                style={{
                  background: FD.wh,
                  border: `0.5px solid ${FD.bd}`,
                  borderRadius: FD.rlg,
                  padding: "16px 18px",
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
                  Largest category
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: FD.k9 }}>
                  {largestCat ? capitalize(largestCat.key) : "—"}
                </div>
                <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>
                  {largestCat
                    ? `${fmtKES(largestCat.amount)} · ${largestCat.pct}%`
                    : "No expenses in this view"}
                </div>
              </div>
            </div>

            <div
              className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:gap-6"
              style={{ alignItems: "start" }}
            >
              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <select
                    value={filterProperty}
                    onChange={(e) => setFilterProperty(e.target.value)}
                    title="Property"
                    style={financeFsel(font, 180)}
                  >
                    {properties.length > 1 && <option value={ALL_VALUE}>All properties</option>}
                    {properties.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    title="Month"
                    style={financeFsel(font, 160)}
                  >
                    {monthOptions.map((o) => (
                      <option key={o.value || "all"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory((e.target.value || "") as ExpenseCategory | "")}
                    title="Category"
                    style={financeFsel(font, 150)}
                  >
                    <option value="">All categories</option>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    background: FD.wh,
                    border: `0.5px solid ${FD.bd}`,
                    borderRadius: FD.rlg,
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.4px",
                        textTransform: "uppercase",
                        color: FD.k5,
                      }}
                    >
                      Expense records
                    </div>
                    <div style={{ fontSize: 12, color: FD.k5 }}>
                      Showing {filteredExpenses.length} entries
                    </div>
                  </div>
                  {filteredExpenses.length === 0 ? (
                    <p style={{ fontSize: 13, color: FD.k5, margin: 0 }}>No expenses in this view.</p>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <div
                        key={`${exp.property}-${exp.id}`}
                        className="group flex items-center gap-3 border-b py-3 last:border-b-0"
                        style={{ borderColor: FD.bd }}
                      >
                        <div
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ background: catColor(exp.category) }}
                        />
                        <div className="min-w-0 flex-1">
                          <div style={{ fontSize: 13, fontWeight: 500, color: FD.k9 }}>
                            {exp.description || "—"}
                          </div>
                          <div style={{ fontSize: 11, color: FD.k5, marginTop: 1 }}>
                            {fmtDate(exp.date)} · {capitalize(exp.category)} · {propName(exp.property)}
                          </div>
                        </div>
                        <div
                          className={dmMono.className}
                          style={{ fontSize: 13, fontWeight: 500, color: FD.r6, textAlign: "right" }}
                        >
                          −{fmtKES(exp.amount)}
                        </div>
                        {!exp.maintenance_request ? (
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => void handleDeleteExpense(exp)}
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border opacity-0 transition-opacity group-hover:opacity-100"
                            style={{
                              background: FD.k0,
                              borderColor: FD.bdm,
                              cursor: "pointer",
                            }}
                          >
                            <svg width={12} height={12} viewBox="0 0 14 14" fill="none" stroke={FD.r6} strokeWidth={2}>
                              <line x1="2" y1="2" x2="12" y2="12" />
                              <line x1="12" y1="2" x2="2" y2="12" />
                            </svg>
                          </button>
                        ) : (
                          <span className="w-6 flex-shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
                <form
                  onSubmit={handleAddExpense}
                  style={{
                    background: FD.wh,
                    border: `0.5px solid ${FD.bd}`,
                    borderRadius: FD.rlg,
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.4px",
                      textTransform: "uppercase",
                      color: FD.k5,
                      marginBottom: 12,
                    }}
                  >
                    Record expense
                  </div>
                  {properties.length > 1 && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={lbl}>Property</label>
                      <select
                        required
                        value={expenseFormPropertyId}
                        onChange={(e) => setExpenseFormPropertyId(e.target.value)}
                        style={{ ...inp, appearance: "none", backgroundImage: SELECT_CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: 28 }}
                      >
                        {properties.map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>Description</label>
                    <input
                      type="text"
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                      placeholder="e.g. Plumbing repair Unit 2B"
                      style={inp}
                    />
                  </div>
                  <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label style={lbl}>Amount (KES)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        min={0}
                        style={inp}
                      />
                    </div>
                    <div>
                      <label style={lbl}>Date</label>
                      <input
                        type="date"
                        required
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        style={inp}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>Category</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                      style={{ ...inp, appearance: "none", backgroundImage: SELECT_CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: 28 }}
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>Notes (optional)</label>
                    <textarea
                      value={expenseNotes}
                      onChange={(e) => setExpenseNotes(e.target.value)}
                      placeholder="Vendor name, invoice number, etc."
                      rows={3}
                      style={{
                        ...inp,
                        height: 70,
                        padding: "8px 12px",
                        resize: "vertical",
                        lineHeight: 1.5,
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingExpense}
                    style={{
                      width: "100%",
                      height: 38,
                      background: FD.g7,
                      color: "#fff",
                      border: "none",
                      borderRadius: FD.rmd,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: submittingExpense ? "wait" : "pointer",
                      fontFamily: font,
                      marginTop: 4,
                    }}
                    className="transition-colors hover:bg-[#085041] disabled:opacity-60"
                  >
                    {submittingExpense ? "Adding…" : "Add expense"}
                  </button>
                </form>

                <div
                  style={{
                    background: FD.wh,
                    border: `0.5px solid ${FD.bd}`,
                    borderRadius: FD.rlg,
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.4px",
                      textTransform: "uppercase",
                      color: FD.k5,
                      marginBottom: 14,
                    }}
                  >
                    By category
                  </div>
                  {Object.keys(byCategory).length === 0 ? (
                    <p style={{ fontSize: 13, color: FD.k5, margin: 0 }}>No data for this view.</p>
                  ) : (
                    Object.entries(byCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, amt]) => {
                        const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
                        const c = cat as ExpenseCategory;
                        const col = catColor(c);
                        return (
                          <div
                            key={cat}
                            className="flex items-center gap-2.5 border-b py-2 last:border-b-0"
                            style={{ borderColor: FD.bd }}
                          >
                            <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: col }} />
                            <div className="flex-1 text-[13px]" style={{ color: FD.k9 }}>
                              {capitalize(cat)}
                            </div>
                            <div className="w-20 flex-shrink-0">
                              <div className="h-[5px] overflow-hidden rounded-sm" style={{ background: FD.k1 }}>
                                <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: col }} />
                              </div>
                            </div>
                            <div
                              className={dmMono.className}
                              style={{ minWidth: 80, textAlign: "right", fontSize: 13, fontWeight: 500 }}
                            >
                              {fmtKES(amt)}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Additional income — kept below main mock layout */}
            <div
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rlg,
                padding: "18px 20px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                  color: FD.k5,
                  marginBottom: 12,
                }}
              >
                Additional income
              </div>
              {filteredIncome.length > 0 ? (
                <div className="mb-4 space-y-2">
                  {filteredIncome.map((ir) => (
                    <div
                      key={`${ir.propertyId}-${ir.row.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0"
                      style={{ borderColor: FD.bd }}
                    >
                      <div>
                                               <div style={{ fontSize: 13, color: FD.k9 }}>
                          Unit #{ir.row.unit}
                          {properties.length > 1 && (
                            <span style={{ color: FD.k5 }}> · {ir.propertyName}</span>
                          )}
                        </div>
                        {ir.row.description && (
                          <div style={{ fontSize: 11, color: FD.k5 }}>{ir.row.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={dmMono.className} style={{ color: FD.g7, fontWeight: 500 }}>
                          +{fmtKES(ir.row.amount)}
                        </span>
                        <span style={{ fontSize: 12, color: FD.k5 }}>{fmtDate(ir.row.date)}</span>
                        <button
                          type="button"
                          onClick={() => void handleDeleteIncome(ir)}
                          style={{ fontSize: 12, color: FD.r6, background: "none", border: "none", cursor: "pointer" }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: FD.k5, marginBottom: 16 }}>No additional income in this view.</p>
              )}
              <form onSubmit={handleAddIncome} className="space-y-3 border-t pt-4" style={{ borderColor: FD.bd }}>
                {properties.length > 1 && (
                  <div>
                    <label style={lbl}>Property</label>
                    <select
                      required
                      value={incomePropertyId}
                      onChange={(e) => setIncomePropertyId(e.target.value)}
                      style={{ ...inp, appearance: "none", backgroundImage: SELECT_CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: 28 }}
                    >
                      {properties.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label style={lbl}>Unit</label>
                    <select
                      required
                      value={incomeUnit}
                      onChange={(e) => setIncomeUnit(e.target.value)}
                      style={{ ...inp, appearance: "none", backgroundImage: SELECT_CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: 28 }}
                    >
                      <option value="">Select unit…</option>
                      {units.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Charge type</label>
                    <select
                      required
                      value={incomeChargeType}
                      onChange={(e) => setIncomeChargeType(e.target.value)}
                      style={{ ...inp, appearance: "none", backgroundImage: SELECT_CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: 28 }}
                    >
                      <option value="">Select…</option>
                      {chargeTypes.map((ct) => (
                        <option key={ct.id} value={String(ct.id)}>
                          {ct.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Amount (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={incomeAmount}
                      onChange={(e) => setIncomeAmount(e.target.value)}
                      style={inp}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Date</label>
                    <input
                      type="date"
                      required
                      value={incomeDate}
                      onChange={(e) => setIncomeDate(e.target.value)}
                      style={inp}
                    />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Description</label>
                  <input
                    type="text"
                    value={incomeDesc}
                    onChange={(e) => setIncomeDesc(e.target.value)}
                    style={inp}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingIncome}
                  style={{
                    height: 36,
                    padding: "0 16px",
                    background: FD.g7,
                    color: "#fff",
                    border: "none",
                    borderRadius: FD.rmd,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: submittingIncome ? "wait" : "pointer",
                    fontFamily: font,
                  }}
                  className="hover:bg-[#085041] disabled:opacity-60"
                >
                  {submittingIncome ? "Adding…" : "Add income"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: FD.k9,
            color: "#fff",
            padding: "9px 16px",
            borderRadius: FD.rmd,
            fontSize: 13,
            fontWeight: 500,
            zIndex: 200,
            animation: "fadeUp 0.2s ease both",
          }}
        >
          {toast}
        </div>
      )}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
