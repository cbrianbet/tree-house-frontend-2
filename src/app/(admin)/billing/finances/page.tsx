"use client";
import React, { useEffect, useState, FormEvent, useCallback } from "react";
import { listProperties } from "@/lib/api/properties";
import {
  listAdditionalIncome,
  createAdditionalIncome,
  deleteAdditionalIncome,
  listExpenses,
  createExpense,
  deleteExpense,
} from "@/lib/api/billing";
import { listChargeTypes } from "@/lib/api/billing";
import { listUnits } from "@/lib/api/properties";
import type { Property, AdditionalIncome, Expense, ExpenseCategory, ChargeType, Unit } from "@/types/api";

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

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "maintenance",    label: "Maintenance" },
  { value: "utility",        label: "Utility" },
  { value: "insurance",      label: "Insurance" },
  { value: "tax",            label: "Tax" },
  { value: "repair",         label: "Repair" },
  { value: "management_fee", label: "Management Fee" },
  { value: "other",          label: "Other" },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtKES(v: string | number) {
  return `KES ${Number(v).toLocaleString()}`;
}
function capitalize(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FinancesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [income, setIncome] = useState<AdditionalIncome[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [submittingIncome, setSubmittingIncome] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Income form
  const [incomeUnit, setIncomeUnit] = useState("");
  const [incomeChargeType, setIncomeChargeType] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState("");
  const [incomeDesc, setIncomeDesc] = useState("");

  // Expense form
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("other");

  useEffect(() => {
    listProperties().then(setProperties).catch(() => {});
  }, []);

  const propId = Number(selectedProperty);

  const fetchAll = useCallback(async () => {
    if (!propId) return;
    setLoading(true);
    setError(null);
    try {
      const [inc, exp, ct, u] = await Promise.all([
        listAdditionalIncome(propId),
        listExpenses(propId),
        listChargeTypes(propId),
        listUnits(propId),
      ]);
      setIncome(inc);
      setExpenses(exp);
      setChargeTypes(ct);
      setUnits(u);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [propId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleAddIncome(e: FormEvent) {
    e.preventDefault();
    if (!propId) return;
    setSubmittingIncome(true);
    try {
      await createAdditionalIncome(propId, {
        unit: Number(incomeUnit),
        charge_type: Number(incomeChargeType),
        amount: incomeAmount,
        date: incomeDate,
        description: incomeDesc,
      });
      setIncomeUnit(""); setIncomeChargeType(""); setIncomeAmount(""); setIncomeDate(""); setIncomeDesc("");
      await fetchAll();
    } catch {
      setError("Failed to record income.");
    } finally {
      setSubmittingIncome(false);
    }
  }

  async function handleDeleteIncome(id: number) {
    if (!confirm("Delete this income entry?")) return;
    try {
      await deleteAdditionalIncome(propId, id);
      setIncome((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError("Failed to delete.");
    }
  }

  async function handleAddExpense(e: FormEvent) {
    e.preventDefault();
    if (!propId) return;
    setSubmittingExpense(true);
    try {
      await createExpense(propId, {
        description: expenseDesc,
        amount: expenseAmount,
        date: expenseDate,
        category: expenseCategory,
      });
      setExpenseDesc(""); setExpenseAmount(""); setExpenseDate(""); setExpenseCategory("other");
      await fetchAll();
    } catch {
      setError("Failed to record expense.");
    } finally {
      setSubmittingExpense(false);
    }
  }

  async function handleDeleteExpense(id: number) {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense(propId, id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError("Failed to delete.");
    }
  }

  // Summary calculations
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalIncome = income.reduce((s, i) => s + Number(i.amount), 0);
  const net = totalIncome - totalExpenses;

  // By-category breakdown
  const byCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: GRAY900, margin: 0 }}>Expenses & Income</h1>
          <p style={{ fontSize: 13, color: GRAY500, marginTop: 2 }}>Track property expenses and additional income</p>
        </div>
        <button
          onClick={() => alert("Export coming soon")}
          style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${GRAY200}`, background: WHITE, color: GRAY700, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          Export CSV
        </button>
      </div>

      {/* Property selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: GRAY700, marginBottom: 6 }}>Property</label>
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${GRAY200}`, fontSize: 13, color: GRAY900, minWidth: 240, background: WHITE }}
        >
          <option value="">Select a property…</option>
          {properties.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ background: REDBG, border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: RED, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!selectedProperty && (
        <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, background: GRAY100, padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: GRAY400, fontSize: 15 }}>Select a property to view finances</p>
        </div>
      )}

      {selectedProperty && loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
          <span style={{ color: GRAY500 }}>Loading…</span>
        </div>
      )}

      {selectedProperty && !loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>
          {/* LEFT — expenses + income */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Expenses */}
            <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "20px 24px" }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: GRAY900, marginBottom: 14 }}>
                Expenses ({expenses.length})
              </h2>
              {expenses.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                  <thead>
                    <tr style={{ backgroundColor: GRAY100 }}>
                      {["Description", "Amount", "Date", "Category", ""].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: GRAY500, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id} style={{ borderBottom: `1px solid ${GRAY200}` }}>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: GRAY700 }}>{exp.description || "—"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "monospace", color: GRAY900 }}>{fmtKES(exp.amount)}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: GRAY500 }}>{fmtDate(exp.date)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 12, background: GRAY100, color: GRAY700, fontSize: 11, fontWeight: 500 }}>
                            {capitalize(exp.category)}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {!exp.maintenance_request && (
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              style={{ fontSize: 12, color: RED, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: 13, color: GRAY400, marginBottom: 20 }}>No expenses recorded yet.</p>
              )}

              {/* Add expense form */}
              <div style={{ borderTop: `1px solid ${GRAY200}`, paddingTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: GRAY700, marginBottom: 12 }}>Record Expense</p>
                <form onSubmit={handleAddExpense} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: GRAY500, display: "block", marginBottom: 4 }}>Description</label>
                      <input
                        type="text"
                        required
                        value={expenseDesc}
                        onChange={(e) => setExpenseDesc(e.target.value)}
                        placeholder="Annual insurance…"
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${GRAY200}`, fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: GRAY500, display: "block", marginBottom: 4 }}>Amount (KES)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        placeholder="15000.00"
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${GRAY200}`, fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: GRAY500, display: "block", marginBottom: 4 }}>Date</label>
                      <input
                        type="date"
                        required
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${GRAY200}`, fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: GRAY500, display: "block", marginBottom: 4 }}>Category</label>
                      <select
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${GRAY200}`, fontSize: 13, background: WHITE, boxSizing: "border-box" }}
                      >
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={submittingExpense}
                      style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: GREEN, color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      {submittingExpense ? "Adding…" : "Add Expense"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Additional income */}
            <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "20px 24px" }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: GRAY900, marginBottom: 14 }}>
                Additional Income ({income.length})
              </h2>
              {income.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                  <thead>
                    <tr style={{ backgroundColor: GRAY100 }}>
                      {["Source", "Amount", "Date", ""].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: GRAY500, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {income.map((inc) => (
                      <tr key={inc.id} style={{ borderBottom: `1px solid ${GRAY200}` }}>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: GRAY700 }}>
                          {units.find((u) => u.id === inc.unit)?.name || `Unit #${inc.unit}`}
                          {inc.description && <span style={{ fontSize: 11, color: GRAY400, display: "block" }}>{inc.description}</span>}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "monospace", color: GREEN }}>{fmtKES(inc.amount)}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: GRAY500 }}>{fmtDate(inc.date)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <button
                            onClick={() => handleDeleteIncome(inc.id)}
                            style={{ fontSize: 12, color: RED, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: 13, color: GRAY400, marginBottom: 20 }}>No additional income recorded yet.</p>
              )}

              {/* Add income form */}
              <div style={{ borderTop: `1px solid ${GRAY200}`, paddingTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: GRAY700, marginBottom: 12 }}>Add Income</p>
                <form onSubmit={handleAddIncome} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: GRAY500, display: "block", marginBottom: 4 }}>Unit</label>
                      <select
                        required
                        value={incomeUnit}
                        onChange={(e) => setIncomeUnit(e.target.value)}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${GRAY200}`, fontSize: 13, background: WHITE, boxSizing: "border-box" }}
                      >
                        <option value="">Select unit…</option>
                        {units.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: GRAY500, display: "block", marginBottom: 4 }}>Charge Type</label>
                      <select
                        required
                        value={incomeChargeType}
                        onChange={(e) => setIncomeChargeType(e.target.value)}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${GRAY200}`, fontSize: 13, background: WHITE, boxSizing: "border-box" }}
                      >
                        <option value="">Select type…</option>
                        {chargeTypes.map((ct) => <option key={ct.id} value={String(ct.id)}>{ct.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: GRAY500, display: "block", marginBottom: 4 }}>Amount (KES)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={incomeAmount}
                        onChange={(e) => setIncomeAmount(e.target.value)}
                        placeholder="5000.00"
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${GRAY200}`, fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: GRAY500, display: "block", marginBottom: 4 }}>Date</label>
                      <input
                        type="date"
                        required
                        value={incomeDate}
                        onChange={(e) => setIncomeDate(e.target.value)}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${GRAY200}`, fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: GRAY500, display: "block", marginBottom: 4 }}>Description</label>
                    <input
                      type="text"
                      value={incomeDesc}
                      onChange={(e) => setIncomeDesc(e.target.value)}
                      placeholder="e.g. March water reading…"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${GRAY200}`, fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={submittingIncome}
                      style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: GREEN, color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      {submittingIncome ? "Adding…" : "Add Income"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* RIGHT — summary + by category */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Summary */}
            <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "16px 20px" }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: GRAY500, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>Summary</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: GRAY500 }}>Total Expenses</span>
                  <span style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 600, color: RED }}>{fmtKES(totalExpenses)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: GRAY500 }}>Additional Income</span>
                  <span style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 600, color: GREEN }}>{fmtKES(totalIncome)}</span>
                </div>
                <div style={{ borderTop: `1px solid ${GRAY200}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: GRAY900 }}>Net</span>
                  <span style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 700, color: net >= 0 ? GREEN : RED }}>{fmtKES(net)}</span>
                </div>
              </div>
            </div>

            {/* By category */}
            {Object.keys(byCategory).length > 0 && (
              <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "16px 20px" }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: GRAY500, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>By Category</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amt]) => {
                      const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
                      return (
                        <div key={cat}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: GRAY700 }}>{capitalize(cat)}</span>
                            <span style={{ fontSize: 12, fontFamily: "monospace", color: GRAY900 }}>{fmtKES(amt)}</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 4, background: GRAY200, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: RED, borderRadius: 4 }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
