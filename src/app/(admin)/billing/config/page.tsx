"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DM_Mono, DM_Sans } from "next/font/google";
import {
  createChargeType,
  deleteChargeType,
  getBillingConfig,
  getBillingPreview,
  listChargeTypes,
  saveBillingConfig,
} from "@/lib/api/billing";
import { listProperties, listUnits } from "@/lib/api/properties";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";
import PageLoader from "@/components/ui/PageLoader";
import { FD, SELECT_CHEVRON } from "@/constants/financeDesign";
import type { BillingConfig, BillingPreview, ChargeType, LateFeeMode, Property } from "@/types/api";

function billingConfigFallback(propertyId: number): BillingConfig {
  return {
    configured: false,
    property: propertyId,
    rent_due_day: 1,
    grace_period_days: 5,
    late_fee_percentage: "5.00",
    late_fee_max_percentage: "20.00",
    invoice_lead_days: 0,
    late_fee_mode: "percentage",
    late_fee_fixed_amount: null,
    mpesa_paybill: "",
    mpesa_account_label: "",
    bank_name: "",
    bank_account: "",
    payment_notes: "",
    notification_settings: null,
  };
}

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

function dueDayLabel(d: number) {
  const j = d % 10;
  const k = d % 100;
  let suf = "th";
  if (j === 1 && k !== 11) suf = "st";
  else if (j === 2 && k !== 12) suf = "nd";
  else if (j === 3 && k !== 13) suf = "rd";
  return `${d}${suf} of month`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function nextDuePreview(rentDueDay: number): Date {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let candidate = new Date(y, m, rentDueDay);
  if (candidate.getTime() <= now.getTime()) {
    candidate = new Date(y, m + 1, rentDueDay);
  }
  return candidate;
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: FD.k5,
  marginBottom: 5,
  letterSpacing: "0.4px",
  textTransform: "uppercase" as const,
};

const fieldInput: React.CSSProperties = {
  width: "100%",
  padding: "0 12px",
  background: FD.k0,
  border: `0.5px solid ${FD.bdm}`,
  borderRadius: FD.rmd,
  fontSize: 13,
  color: FD.k9,
  height: 38,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

export default function BillingConfigPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([]);
  const [unitCount, setUnitCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [newChargeName, setNewChargeName] = useState("");
  const [addingCharge, setAddingCharge] = useState(false);

  const [rentDueDay, setRentDueDay] = useState("1");
  const [gracePeriod, setGracePeriod] = useState("5");
  const [lateFee, setLateFee] = useState("5.00");
  const [lateFeeMax, setLateFeeMax] = useState("20.00");
  const [lateFeesOn, setLateFeesOn] = useState(true);
  const [invoiceLeadDays, setInvoiceLeadDays] = useState("0");
  const [lateFeeMode, setLateFeeMode] = useState<LateFeeMode>("percentage");
  const [lateFeeFixed, setLateFeeFixed] = useState("");
  const [mpesaPaybill, setMpesaPaybill] = useState("");
  const [mpesaAccountLabel, setMpesaAccountLabel] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [remindBeforeDue, setRemindBeforeDue] = useState("3");
  const [remindAfterOverdue, setRemindAfterOverdue] = useState("0");
  const [sendReceiptOnPayment, setSendReceiptOnPayment] = useState(true);
  const [billingPreview, setBillingPreview] = useState<BillingPreview | null>(null);

  const [baseline, setBaseline] = useState<string | null>(null);

  const serializeForm = useCallback(() => {
    return JSON.stringify({
      rentDueDay,
      gracePeriod,
      lateFee,
      lateFeeMax,
      lateFeesOn,
      invoiceLeadDays,
      lateFeeMode,
      lateFeeFixed,
      mpesaPaybill,
      mpesaAccountLabel,
      bankName,
      bankAccount,
      paymentNotes,
      remindBeforeDue,
      remindAfterOverdue,
      sendReceiptOnPayment,
    });
  }, [
    rentDueDay,
    gracePeriod,
    lateFee,
    lateFeeMax,
    lateFeesOn,
    invoiceLeadDays,
    lateFeeMode,
    lateFeeFixed,
    mpesaPaybill,
    mpesaAccountLabel,
    bankName,
    bankAccount,
    paymentNotes,
    remindBeforeDue,
    remindAfterOverdue,
    sendReceiptOnPayment,
  ]);

  const dirty = baseline !== null && serializeForm() !== baseline;

  useEffect(() => {
    listProperties().then(setProperties).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProperty) {
      setConfig(null);
      setChargeTypes([]);
      setUnitCount(null);
      setBaseline(null);
      return;
    }
    const pid = Number(selectedProperty);
    setLoading(true);
    setError(null);
    setConfig(null);
    setChargeTypes([]);
    setUnitCount(null);
    setBaseline(null);
    setBillingPreview(null);

    Promise.all([
      getBillingConfig(pid).catch(() => billingConfigFallback(pid)),
      listChargeTypes(pid).catch(() => [] as ChargeType[]),
      listUnits(pid).catch(() => []),
      getBillingPreview(pid).catch(() => null),
    ])
      .then(([cfg, ct, units, preview]) => {
        const c = cfg as BillingConfig;
        setConfig(c);
        setChargeTypes(ct as ChargeType[]);
        setUnitCount(units.length);
        setBillingPreview(preview);
        setRentDueDay(String(c.rent_due_day));
        setGracePeriod(String(c.grace_period_days));
        setInvoiceLeadDays(String(c.invoice_lead_days ?? 0));
        setLateFeeMode(c.late_fee_mode === "fixed" ? "fixed" : "percentage");
        setLateFeeFixed(
          c.late_fee_fixed_amount != null && c.late_fee_fixed_amount !== ""
            ? String(c.late_fee_fixed_amount)
            : "",
        );
        setLateFee(c.late_fee_percentage);
        setLateFeeMax(
          c.late_fee_max_percentage != null && c.late_fee_max_percentage !== ""
            ? String(c.late_fee_max_percentage)
            : "",
        );
        const on =
          c.late_fee_mode === "fixed"
            ? Number(c.late_fee_fixed_amount) > 0
            : Number(c.late_fee_percentage) > 0;
        setLateFeesOn(on);
        setMpesaPaybill(c.mpesa_paybill ?? "");
        setMpesaAccountLabel(c.mpesa_account_label ?? "");
        setBankName(c.bank_name ?? "");
        setBankAccount(c.bank_account ?? "");
        setPaymentNotes(c.payment_notes ?? "");
        const ns = c.notification_settings;
        if (ns) {
          setRemindBeforeDue(
            ns.remind_before_due_days != null ? String(ns.remind_before_due_days) : "",
          );
          setRemindAfterOverdue(
            ns.remind_after_overdue_days != null ? String(ns.remind_after_overdue_days) : "0",
          );
          setSendReceiptOnPayment(ns.send_receipt_on_payment !== false);
        } else {
          setRemindBeforeDue("3");
          setRemindAfterOverdue("0");
          setSendReceiptOnPayment(true);
        }
        const snap = {
          rentDueDay: String(c.rent_due_day),
          gracePeriod: String(c.grace_period_days),
          lateFee: c.late_fee_percentage,
          lateFeeMax:
            c.late_fee_max_percentage != null && c.late_fee_max_percentage !== ""
              ? String(c.late_fee_max_percentage)
              : "",
          lateFeesOn: on,
          invoiceLeadDays: String(c.invoice_lead_days ?? 0),
          lateFeeMode: (c.late_fee_mode === "fixed" ? "fixed" : "percentage") as LateFeeMode,
          lateFeeFixed:
            c.late_fee_fixed_amount != null && c.late_fee_fixed_amount !== ""
              ? String(c.late_fee_fixed_amount)
              : "",
          mpesaPaybill: c.mpesa_paybill ?? "",
          mpesaAccountLabel: c.mpesa_account_label ?? "",
          bankName: c.bank_name ?? "",
          bankAccount: c.bank_account ?? "",
          paymentNotes: c.payment_notes ?? "",
          remindBeforeDue: ns
            ? ns.remind_before_due_days != null
              ? String(ns.remind_before_due_days)
              : ""
            : "3",
          remindAfterOverdue: ns
            ? ns.remind_after_overdue_days != null
              ? String(ns.remind_after_overdue_days)
              : "0"
            : "0",
          sendReceiptOnPayment: ns ? ns.send_receipt_on_payment !== false : true,
        };
        setBaseline(JSON.stringify(snap));
      })
      .finally(() => setLoading(false));
  }, [selectedProperty]);

  const selectedProp = properties.find((p) => String(p.id) === selectedProperty);

  const previewNextDue = useMemo(
    () => nextDuePreview(Number(rentDueDay) || 1),
    [rentDueDay],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedProperty) return;
    setSubmitting(true);
    setError(null);
    try {
      const mode = lateFeeMode;
      const pct =
        mode === "percentage" ? (lateFeesOn ? lateFee : "0.00") : "0.00";
      const fixedAmt =
        mode === "fixed" && lateFeesOn
          ? (lateFeeFixed.trim() || "0.00")
          : null;
      const maxPct =
        lateFeeMax.trim() === "" ? null : lateFeeMax.trim();
      const payload = {
        rent_due_day: Number(rentDueDay),
        grace_period_days: Number(gracePeriod),
        late_fee_percentage: pct,
        late_fee_max_percentage: maxPct,
        invoice_lead_days: Math.min(27, Math.max(0, Number(invoiceLeadDays) || 0)),
        late_fee_mode: mode,
        late_fee_fixed_amount: fixedAmt,
        mpesa_paybill: mpesaPaybill.trim(),
        mpesa_account_label: mpesaAccountLabel.trim(),
        bank_name: bankName.trim(),
        bank_account: bankAccount.trim(),
        payment_notes: paymentNotes.trim(),
        notification_settings: {
          remind_before_due_days:
            remindBeforeDue.trim() === "" ? null : Number(remindBeforeDue),
          remind_after_overdue_days:
            remindAfterOverdue.trim() === ""
              ? null
              : Number(remindAfterOverdue),
          send_receipt_on_payment: sendReceiptOnPayment,
        },
      };
      const saved = await saveBillingConfig(Number(selectedProperty), payload);
      setConfig(saved);
      try {
        setBillingPreview(await getBillingPreview(Number(selectedProperty)));
      } catch {
        /* ignore preview refresh */
      }
      const on =
        saved.late_fee_mode === "fixed"
          ? Number(saved.late_fee_fixed_amount) > 0
          : Number(saved.late_fee_percentage) > 0;
      const ns = saved.notification_settings;
      const snap = {
        rentDueDay: String(saved.rent_due_day),
        gracePeriod: String(saved.grace_period_days),
        lateFee: saved.late_fee_percentage,
        lateFeeMax:
          saved.late_fee_max_percentage != null &&
          saved.late_fee_max_percentage !== ""
            ? String(saved.late_fee_max_percentage)
            : "",
        lateFeesOn: on,
        invoiceLeadDays: String(saved.invoice_lead_days ?? 0),
        lateFeeMode: (saved.late_fee_mode === "fixed" ? "fixed" : "percentage") as LateFeeMode,
        lateFeeFixed:
          saved.late_fee_fixed_amount != null &&
          saved.late_fee_fixed_amount !== ""
            ? String(saved.late_fee_fixed_amount)
            : "",
        mpesaPaybill: saved.mpesa_paybill ?? "",
        mpesaAccountLabel: saved.mpesa_account_label ?? "",
        bankName: saved.bank_name ?? "",
        bankAccount: saved.bank_account ?? "",
        paymentNotes: saved.payment_notes ?? "",
        remindBeforeDue: ns
          ? ns.remind_before_due_days != null
            ? String(ns.remind_before_due_days)
            : ""
          : "3",
        remindAfterOverdue: ns
          ? ns.remind_after_overdue_days != null
            ? String(ns.remind_after_overdue_days)
            : "0"
          : "0",
        sendReceiptOnPayment: ns ? ns.send_receipt_on_payment !== false : true,
      };
      setBaseline(JSON.stringify(snap));
      setLateFeesOn(on);
      setToast("Billing configuration saved");
      setTimeout(() => setToast(null), 2200);
    } catch {
      setError("Failed to save billing configuration.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddChargeType() {
    if (!newChargeName.trim() || !selectedProperty) return;
    setAddingCharge(true);
    setError(null);
    try {
      await createChargeType(Number(selectedProperty), {
        name: newChargeName.trim(),
        charge_kind: "variable",
      });
      setNewChargeName("");
      const ct = await listChargeTypes(Number(selectedProperty));
      setChargeTypes(ct);
      setToast("Charge type added");
      setTimeout(() => setToast(null), 2200);
    } catch {
      setError("Failed to add charge type.");
    } finally {
      setAddingCharge(false);
    }
  }

  async function handleDeleteChargeType(id: number) {
    if (!selectedProperty || !confirm("Delete this charge type?")) return;
    setError(null);
    try {
      await deleteChargeType(Number(selectedProperty), id);
      setChargeTypes((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "status" in err.response &&
        err.response.status === 400
          ? "Cannot delete: deactivate this charge type instead (income exists), or remove linked income first."
          : "Failed to delete charge type.";
      setError(msg);
    }
  }

  function toggleLateFees(on: boolean) {
    setLateFeesOn(on);
    if (!on) setLateFee("0.00");
    else if (Number(lateFee) === 0) setLateFee("5.00");
  }

  const font = dmSans.style.fontFamily;
  const summaryLate = !lateFeesOn
    ? "Off"
    : lateFeeMode === "fixed"
      ? `KES ${lateFeeFixed || "0"} fixed`
      : `${lateFee}% (cap ${lateFeeMax || "—"}%)`;

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
          { label: "Billing configuration" },
        ]}
        right={
          <button
            type="submit"
            form="billing-config-form"
            disabled={!selectedProperty || submitting || !config || loading}
            style={{
              height: 34,
              padding: "0 14px",
              background: !selectedProperty || !config ? FD.k2 : FD.g7,
              color: "#fff",
              border: "none",
              borderRadius: FD.rmd,
              fontSize: 13,
              fontWeight: 500,
              cursor: !selectedProperty || !config ? "not-allowed" : "pointer",
              fontFamily: font,
              transition: "background 0.15s",
            }}
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        }
      />

      <div
        className="px-4 md:px-6"
        style={{ paddingTop: 22, paddingBottom: 24, maxWidth: 1120, margin: "0 auto" }}
      >
        {dirty && (
          <div
            style={{
              background: FD.g1,
              border: `0.5px solid ${FD.g3}`,
              borderRadius: FD.rlg,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 13, color: FD.activeBadgeText }}>You have unsaved changes</div>
            <button
              type="submit"
              form="billing-config-form"
              disabled={submitting || !config}
              style={{
                height: 32,
                padding: "0 14px",
                background: FD.g7,
                color: "#fff",
                border: "none",
                borderRadius: FD.rmd,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              Save now
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 14px",
              borderRadius: FD.rmd,
              background: FD.r0,
              border: `0.5px solid ${FD.r3}`,
              color: FD.r6,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 280px",
            gap: 18,
            alignItems: "start",
          }}
          className="max-lg:grid-cols-1"
        >
          <form id="billing-config-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Invoice timing */}
            <div
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rlg,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9, marginBottom: 4 }}>Invoice timing</div>
              <div style={{ fontSize: 12, color: FD.k5, marginBottom: 18 }}>
                When rent is due and how the monthly billing job runs
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="max-sm:grid-cols-1">
                <div style={{ marginBottom: 0 }}>
                  <label style={fieldLabel}>Rent due day</label>
                  <select
                    value={rentDueDay}
                    onChange={(e) => setRentDueDay(e.target.value)}
                    disabled={!config}
                    style={{
                      ...fieldInput,
                      appearance: "none",
                      backgroundImage: SELECT_CHEVRON,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 10px center",
                      paddingRight: 28,
                      cursor: config ? "pointer" : "not-allowed",
                      opacity: config ? 1 : 0.6,
                    }}
                  >
                    {DAY_OPTIONS.map((d) => (
                      <option key={d} value={String(d)}>
                        {dueDayLabel(d)}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>
                    Calendar day of month for rent (1–28). The daily <code style={{ fontSize: 10 }}>process_billing</code> job uses this with lead days to generate invoices.
                  </div>
                </div>
                <div>
                  <label style={fieldLabel}>Grace period (days)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(e.target.value)}
                    disabled={!config}
                    style={{
                      ...fieldInput,
                      opacity: config ? 1 : 0.6,
                    }}
                  />
                  <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>
                    Added to the rent anchor date to compute each invoice&apos;s due date.
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={fieldLabel}>Invoice lead days (0–27)</label>
                <input
                  type="number"
                  min={0}
                  max={27}
                  value={invoiceLeadDays}
                  onChange={(e) => setInvoiceLeadDays(e.target.value)}
                  disabled={!config}
                  style={{
                    ...fieldInput,
                    maxWidth: 200,
                    opacity: config ? 1 : 0.6,
                    fontFamily: dmMono.style.fontFamily,
                  }}
                />
                <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>
                  Generate invoices this many days before the due day (clamped to the 1st of the month). Use 0 for same-day generation.
                </div>
              </div>
            </div>

            {/* Late fees */}
            <div
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rlg,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9, marginBottom: 4 }}>Late fees</div>
              <div style={{ fontSize: 12, color: FD.k5, marginBottom: 14 }}>
                Applied by <code style={{ fontSize: 10 }}>process_billing</code> when an invoice is overdue (after grace)
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>Late fee mode</label>
                <select
                  value={lateFeeMode}
                  onChange={(e) => setLateFeeMode(e.target.value as LateFeeMode)}
                  disabled={!config}
                  style={{
                    ...fieldInput,
                    maxWidth: 280,
                    appearance: "none",
                    backgroundImage: SELECT_CHEVRON,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 10px center",
                    paddingRight: 28,
                    cursor: config ? "pointer" : "not-allowed",
                    opacity: config ? 1 : 0.6,
                  }}
                >
                  <option value="percentage">Percentage of rent</option>
                  <option value="fixed">Fixed amount (KES)</option>
                </select>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: `0.5px solid ${FD.bd}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: FD.k9 }}>Enable late fees</div>
                  <div style={{ fontSize: 11, color: FD.k5, marginTop: 2 }}>
                    {lateFeeMode === "percentage" ? "Apply percentage (and optional cap) to overdue balance" : "Apply a fixed KES amount when overdue"}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={lateFeesOn}
                  onClick={() => toggleLateFees(!lateFeesOn)}
                  disabled={!config}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    border: "none",
                    background: lateFeesOn ? FD.g5 : FD.k2,
                    cursor: config ? "pointer" : "not-allowed",
                    position: "relative",
                    flexShrink: 0,
                    transition: "background 0.2s",
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
                      left: lateFeesOn ? 20 : 2,
                      transition: "left 0.2s",
                    }}
                  />
                </button>
              </div>
              {lateFeeMode === "percentage" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }} className="max-sm:grid-cols-1">
                  <div>
                    <label style={fieldLabel}>Late fee (% of rent)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={lateFee}
                      onChange={(e) => setLateFee(e.target.value)}
                      disabled={!config || !lateFeesOn}
                      style={{
                        ...fieldInput,
                        fontFamily: dmMono.style.fontFamily,
                        opacity: config && lateFeesOn ? 1 : 0.55,
                      }}
                    />
                    <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>Used when mode is percentage</div>
                  </div>
                  <div>
                    <label style={fieldLabel}>Max cumulative late fee (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={lateFeeMax}
                      onChange={(e) => setLateFeeMax(e.target.value)}
                      disabled={!config || !lateFeesOn}
                      placeholder="Optional cap"
                      style={{
                        ...fieldInput,
                        fontFamily: dmMono.style.fontFamily,
                        opacity: config && lateFeesOn ? 1 : 0.55,
                      }}
                    />
                    <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>Optional cap; ignored in fixed mode</div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <label style={fieldLabel}>Fixed late fee (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={lateFeeFixed}
                    onChange={(e) => setLateFeeFixed(e.target.value)}
                    disabled={!config || !lateFeesOn}
                    style={{
                      ...fieldInput,
                      maxWidth: 280,
                      fontFamily: dmMono.style.fontFamily,
                      opacity: config && lateFeesOn ? 1 : 0.55,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Payment instructions (tenant-facing copy) */}
            <div
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rlg,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9, marginBottom: 4 }}>Payment instructions</div>
              <div style={{ fontSize: 12, color: FD.k5, marginBottom: 16 }}>
                Shown on invoices — plain text only; keep secrets out of Tree House if needed
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="max-sm:grid-cols-1">
                <div>
                  <label style={fieldLabel}>M-Pesa paybill</label>
                  <input
                    type="text"
                    value={mpesaPaybill}
                    onChange={(e) => setMpesaPaybill(e.target.value)}
                    disabled={!config}
                    style={{ ...fieldInput, opacity: config ? 1 : 0.6 }}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>M-Pesa account label / hint</label>
                  <input
                    type="text"
                    value={mpesaAccountLabel}
                    onChange={(e) => setMpesaAccountLabel(e.target.value)}
                    disabled={!config}
                    placeholder="e.g. Unit + phone"
                    style={{ ...fieldInput, opacity: config ? 1 : 0.6 }}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>Bank name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    disabled={!config}
                    style={{ ...fieldInput, opacity: config ? 1 : 0.6 }}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>Bank account</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    disabled={!config}
                    style={{ ...fieldInput, opacity: config ? 1 : 0.6 }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={fieldLabel}>Payment notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  disabled={!config}
                  placeholder="e.g. Reference: invoice number"
                  style={{ ...fieldInput, opacity: config ? 1 : 0.6 }}
                />
              </div>
            </div>

            {/* Charge types */}
            <div
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rlg,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9, marginBottom: 4 }}>Charge types</div>
              <div style={{ fontSize: 12, color: FD.k5, marginBottom: 14 }}>
                Labels for additional income — rent is billed from each lease
              </div>
              {loading ? (
                <PageLoader size="sm" inline />
              ) : !selectedProperty ? (
                <p style={{ fontSize: 13, color: FD.k5 }}>Select a property to manage charge types.</p>
              ) : (
                <>
                  {chargeTypes.map((ct) => (
                    <div
                      key={ct.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 0",
                        borderBottom: `0.5px solid ${FD.bd}`,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: FD.k9, flex: 1 }}>{ct.name}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: FD.k5,
                          background: FD.k0,
                          padding: "2px 8px",
                          borderRadius: 10,
                        }}
                      >
                        {ct.charge_kind ?? "variable"}
                      </div>
                      <div className={dmMono.className} style={{ fontSize: 13, fontWeight: 500, color: FD.k9, minWidth: 72, textAlign: "right" }}>
                        —
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteChargeType(ct.id)}
                        title="Delete"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: FD.rsm,
                          background: FD.r0,
                          border: `0.5px solid ${FD.r3}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <svg width={12} height={12} viewBox="0 0 14 14" fill="none" stroke={FD.r6} strokeWidth={2}>
                          <line x1="2" y1="2" x2="12" y2="12" />
                          <line x1="12" y1="2" x2="2" y2="12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {chargeTypes.length === 0 && (
                    <p style={{ fontSize: 13, color: FD.k5, marginBottom: 8 }}>No charge types yet.</p>
                  )}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 8,
                      alignItems: "end",
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: `0.5px solid ${FD.bd}`,
                    }}
                    className="max-sm:grid-cols-1"
                  >
                    <input
                      type="text"
                      placeholder="Charge name (e.g. Water, Parking)"
                      value={newChargeName}
                      onChange={(e) => setNewChargeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddChargeType();
                        }
                      }}
                      style={{
                        height: 34,
                        padding: "0 10px",
                        background: FD.k0,
                        border: `0.5px solid ${FD.bdm}`,
                        borderRadius: FD.rmd,
                        fontSize: 13,
                        color: FD.k9,
                        fontFamily: font,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddChargeType()}
                      disabled={addingCharge || !newChargeName.trim()}
                      style={{
                        height: 34,
                        padding: "0 14px",
                        background: FD.g7,
                        color: "#fff",
                        border: "none",
                        borderRadius: FD.rmd,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: addingCharge || !newChargeName.trim() ? "not-allowed" : "pointer",
                        fontFamily: font,
                        opacity: addingCharge || !newChargeName.trim() ? 0.6 : 1,
                      }}
                    >
                      {addingCharge ? "Adding…" : "+ Add"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Payment methods — informational */}
            <div
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rlg,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9, marginBottom: 4 }}>Payment methods</div>
              <div style={{ fontSize: 12, color: FD.k5, marginBottom: 14 }}>
                Card payments use Stripe; M-Pesa and bank copy can be saved above
              </div>
              {[
                ["Stripe (card / online)", "Tenants pay from their dashboard; confirm with Stripe.js using the client_secret from the pay endpoint."],
                ["M-Pesa & bank transfer", "Landlords record manual settlement when rent is collected outside Stripe (invoice payments API)."],
              ].map(([title, sub]) => (
                <div
                  key={title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: `0.5px solid ${FD.bd}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: FD.k9 }}>{title}</div>
                    <div style={{ fontSize: 11, color: FD.k5, marginTop: 2 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Billing notification tuning */}
            <div
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rlg,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9, marginBottom: 4 }}>Rent reminders & receipts</div>
              <div style={{ fontSize: 12, color: FD.k5, marginBottom: 14 }}>
                Per-property tuning (stored with billing config). Global email toggles live under{" "}
                <Link href="/settings" style={{ color: FD.g7, fontWeight: 500 }}>
                  Settings
                </Link>
                .
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="max-sm:grid-cols-1">
                <div>
                  <label style={fieldLabel}>Remind before due (days)</label>
                  <input
                    type="number"
                    min={0}
                    value={remindBeforeDue}
                    onChange={(e) => setRemindBeforeDue(e.target.value)}
                    disabled={!config}
                    placeholder="Empty = disabled"
                    style={{
                      ...fieldInput,
                      opacity: config ? 1 : 0.6,
                      fontFamily: dmMono.style.fontFamily,
                    }}
                  />
                  <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>
                    Empty sends <code style={{ fontSize: 10 }}>null</code> — disables pre-due reminders once a settings row exists
                  </div>
                </div>
                <div>
                  <label style={fieldLabel}>Overdue reminder lag (days)</label>
                  <input
                    type="number"
                    min={0}
                    value={remindAfterOverdue}
                    onChange={(e) => setRemindAfterOverdue(e.target.value)}
                    disabled={!config}
                    style={{
                      ...fieldInput,
                      opacity: config ? 1 : 0.6,
                      fontFamily: dmMono.style.fontFamily,
                    }}
                  />
                  <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>Days after due date before overdue reminder</div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 0 0",
                  marginTop: 8,
                  borderTop: `0.5px solid ${FD.bd}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: FD.k9 }}>Notify tenant on payment</div>
                  <div style={{ fontSize: 11, color: FD.k5, marginTop: 2 }}>
                    In-app / email <code style={{ fontSize: 10 }}>payment</code> when a receipt is created (Stripe or manual)
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={sendReceiptOnPayment}
                  onClick={() => setSendReceiptOnPayment(!sendReceiptOnPayment)}
                  disabled={!config}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    border: "none",
                    background: sendReceiptOnPayment ? FD.g5 : FD.k2,
                    cursor: config ? "pointer" : "not-allowed",
                    position: "relative",
                    flexShrink: 0,
                    transition: "background 0.2s",
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
                      left: sendReceiptOnPayment ? 20 : 2,
                      transition: "left 0.2s",
                    }}
                  />
                </button>
              </div>
            </div>
          </form>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                  fontWeight: 500,
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                  color: FD.k5,
                  marginBottom: 10,
                }}
              >
                Property
              </div>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  padding: "0 26px 0 12px",
                  border: `0.5px solid ${FD.bdm}`,
                  borderRadius: FD.rmd,
                  fontSize: 13,
                  color: FD.k9,
                  fontFamily: font,
                  backgroundColor: FD.k0,
                  appearance: "none",
                  backgroundImage: SELECT_CHEVRON,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 8px center",
                  cursor: "pointer",
                }}
              >
                <option value="">Select property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {config && selectedProp && (
              <>
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
                      fontWeight: 500,
                      letterSpacing: "0.4px",
                      textTransform: "uppercase",
                      color: FD.k5,
                      marginBottom: 10,
                    }}
                  >
                    Current settings summary
                  </div>
                  <ScRow k="Due day" v={dueDayLabel(Number(rentDueDay))} mono />
                  <ScRow k="Lead days" v={invoiceLeadDays} mono />
                  <ScRow k="Grace" v={`${gracePeriod} days`} mono />
                  <ScRow k="Late fee" v={summaryLate} mono />
                  <ScRow k="Charge types" v={`${chargeTypes.length} listed`} mono />
                  <ScRow
                    k="Late fee cap"
                    v={lateFeeMode === "percentage" ? `${lateFeeMax || "—"}%` : "—"}
                    mono
                  />
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
                      fontWeight: 500,
                      letterSpacing: "0.4px",
                      textTransform: "uppercase",
                      color: FD.k5,
                      marginBottom: 10,
                    }}
                  >
                    Applied to
                  </div>
                  <div style={{ fontSize: 12, color: FD.k5, lineHeight: 1.6 }}>
                    These settings apply to <strong style={{ color: FD.k9 }}>{selectedProp.name}</strong>
                    {unitCount != null ? (
                      <>
                        {" "}
                        and its <strong style={{ color: FD.k9 }}>{unitCount}</strong> unit{unitCount === 1 ? "" : "s"}.
                      </>
                    ) : null}{" "}
                    Per-unit rent and deposits are still set on each unit.
                  </div>
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
                      fontWeight: 500,
                      letterSpacing: "0.4px",
                      textTransform: "uppercase",
                      color: FD.k5,
                      marginBottom: 10,
                    }}
                  >
                    Billing preview (API)
                  </div>
                  {billingPreview?.next_rent_due_date ? (
                    <ScRow
                      k="Next rent due"
                      v={fmtDate(new Date(billingPreview.next_rent_due_date))}
                      mono
                    />
                  ) : (
                    <ScRow k="Next rent due" v={fmtDate(previewNextDue)} mono />
                  )}
                  <ScRow
                    k="Next invoice gen."
                    v={
                      billingPreview?.next_invoice_generation_date
                        ? fmtDate(new Date(billingPreview.next_invoice_generation_date))
                        : "—"
                    }
                    mono
                  />
                  {billingPreview?.estimated_monthly_rent_total != null && (
                    <ScRow
                      k="Est. monthly rent"
                      v={`KES ${Number(billingPreview.estimated_monthly_rent_total).toLocaleString()}`}
                      mono
                    />
                  )}
                  <div style={{ fontSize: 11, color: FD.k5, marginTop: 8, lineHeight: 1.45 }}>
                    Snapshot from billing-preview; invoices and late fees are applied by the daily process_billing job.
                  </div>
                </div>
              </>
            )}

            {!selectedProperty && (
              <div style={{ fontSize: 12, color: FD.k5, lineHeight: 1.6, padding: "8px 4px" }}>
                Select a property to load billing config and charge types.
              </div>
            )}
          </div>
        </div>
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
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function ScRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "7px 0",
        borderBottom: `0.5px solid ${FD.bd}`,
        fontSize: 13,
      }}
    >
      <span style={{ color: FD.k5 }}>{k}</span>
      <span
        className={mono ? dmMono.className : undefined}
        style={{ fontWeight: 500, color: FD.k9, fontSize: 12, fontFamily: mono ? dmMono.style.fontFamily : undefined }}
      >
        {v}
      </span>
    </div>
  );
}
