"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";
import { listInvoices, payInvoice, getInvoice, listReceipts } from "@/lib/api/billing";
import type { Invoice, InvoiceStatus, Receipt } from "@/types/api";
import RoleGuard from "@/components/auth/RoleGuard";
import PageLoader from "@/components/ui/PageLoader";

// ── Stripe setup ──────────────────────────────────────────────────────────────

const stripePromise: Promise<Stripe | null> =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : Promise.resolve(null);

// ── Constants ─────────────────────────────────────────────────────────────────

const UNPAYABLE: InvoiceStatus[] = ["paid", "cancelled"];

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; text: string; dot: string; label: string }> = {
  paid:      { bg: "#F0FDF4", text: "#15803D", dot: "#22C55E", label: "Paid" },
  pending:   { bg: "#FFFBEB", text: "#D97706", dot: "#F59E0B", label: "Pending" },
  overdue:   { bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444", label: "Overdue" },
  partial:   { bg: "#FFF7ED", text: "#EA580C", dot: "#F97316", label: "Partial" },
  cancelled: { bg: "#F9FAFB", text: "#6B7280", dot: "#9CA3AF", label: "Cancelled" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(amount: string) {
  return `KES ${Number(amount).toLocaleString("en-KE")}`;
}

function periodLabel(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const mo = s.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
  return `${mo} (${s.getDate()}–${e.getDate()})`;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.cancelled;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.bg, color: s.text,
      padding: "3px 10px", borderRadius: 20,
      fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.03em",
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ── Payment modal ─────────────────────────────────────────────────────────────

type ModalView = "initiating" | "card" | "confirming" | "polling" | "receipt" | "error";

interface ModalReceipt {
  receipt_number: string;
  amount: string;
  issued_at: string;
}

function PaymentModal({
  invoice,
  onClose,
  onPaid,
}: {
  invoice: Invoice;
  onClose: () => void;
  onPaid: (inv: Invoice) => void;
}) {
  const [view, setView] = useState<ModalView>("initiating");
  const [clientSecret, setClientSecret] = useState("");
  const [paymentId, setPaymentId] = useState(0);
  const [receipt, setReceipt] = useState<ModalReceipt | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const cardDivRef = useRef<HTMLDivElement>(null);
  const cardElRef = useRef<StripeCardElement | null>(null);

  // Step 1 — initiate payment on mount
  useEffect(() => {
    let cancelled = false;
    payInvoice(invoice.id)
      .then(({ client_secret, payment_id }) => {
        if (cancelled) return;
        setClientSecret(client_secret);
        setPaymentId(payment_id);
        setView("card");
      })
      .catch(() => {
        if (!cancelled) { setErrMsg("Failed to initiate payment. Please try again."); setView("error"); }
      });
    return () => { cancelled = true; };
  }, [invoice.id, invoice.total_amount]);

  // Step 2 — mount Stripe Card Element when view = "card"
  useEffect(() => {
    if (view !== "card" || !cardDivRef.current || !clientSecret) return;
    let destroyed = false;

    stripePromise.then((stripe) => {
      if (!stripe || destroyed || !cardDivRef.current) return;
      const elements = stripe.elements();
      const card = elements.create("card", {
        style: {
          base: {
            fontSize: "15px",
            color: "#1C1917",
            fontFamily: '"Outfit", sans-serif',
            "::placeholder": { color: "#9CA3AF" },
            lineHeight: "22px",
          },
          invalid: { color: "#DC2626", iconColor: "#DC2626" },
        },
      });
      card.mount(cardDivRef.current);
      cardElRef.current = card;
    });

    return () => {
      destroyed = true;
      cardElRef.current?.unmount();
      cardElRef.current?.destroy();
      cardElRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Step 3 — confirm payment
  async function handleConfirm() {
    if (!cardElRef.current || !clientSecret) return;
    setView("confirming");

    const stripe = await stripePromise;
    if (!stripe) { setErrMsg("Stripe failed to load."); setView("error"); return; }

    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElRef.current },
    });

    if (error) {
      setErrMsg(error.message ?? "Payment was declined.");
      setView("error");
      return;
    }

    setView("polling");
  }

  // Step 4 — poll until invoice status = "paid" (max 30s)
  useEffect(() => {
    if (view !== "polling") return;

    const deadline = Date.now() + 30_000;
    let active = true;

    const tick = async () => {
      if (!active) return;
      try {
        const updated = await getInvoice(invoice.id);
        if (updated.status === "paid") {
          onPaid(updated);
          // Step 5 — fetch receipt
          try {
            const all = await listReceipts();
            const found = all.find((r: Receipt) => r.payment === paymentId);
            if (found) {
              setReceipt({ receipt_number: found.receipt_number, amount: invoice.total_amount, issued_at: found.issued_at });
            } else {
              setReceipt({ receipt_number: "—", amount: invoice.total_amount, issued_at: new Date().toISOString() });
            }
          } catch {
            setReceipt({ receipt_number: "—", amount: invoice.total_amount, issued_at: new Date().toISOString() });
          }
          if (active) setView("receipt");
          return;
        }
      } catch { /* keep polling */ }

      if (Date.now() > deadline) {
        if (active) { setErrMsg("Payment is taking longer than expected. Please refresh to check status."); setView("error"); }
        return;
      }
      if (active) setTimeout(tick, 2_000);
    };

    setTimeout(tick, 2_000);
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const amount = fmtMoney(invoice.total_amount);
  const canClose = view !== "confirming" && view !== "polling";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={canClose ? onClose : undefined}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(3px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}
      >
        {/* Modal card */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#FFFFFF",
            borderRadius: 18,
            width: "100%", maxWidth: 440,
            boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "22px 26px 0", borderBottom: "1px solid #F3F4F6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.07em", textTransform: "uppercase", margin: 0 }}>
                  Invoice #{invoice.id}
                </p>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1C1917", margin: "4px 0 0" }}>
                  {view === "receipt" ? "Payment Successful" : view === "error" ? "Payment Failed" : "Complete Payment"}
                </h3>
              </div>
              {canClose && (
                <button
                  onClick={onClose}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "1.3rem", padding: 0, lineHeight: 1 }}
                  aria-label="Close"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 26px" }}>

            {/* Initiating */}
            {view === "initiating" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "20px 0" }}>
                <SpinnerSvg size={32} color="#0D9488" />
                <p style={{ fontSize: "0.9rem", color: "#6B7280", margin: 0 }}>Setting up payment…</p>
              </div>
            )}

            {/* Card input */}
            {(view === "card" || view === "confirming") && (
              <>
                {/* Invoice summary */}
                <div style={{
                  background: "#F9F7F3", borderRadius: 10,
                  padding: "14px 16px", marginBottom: 22,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <p style={{ fontSize: "0.78rem", color: "#9CA3AF", margin: 0 }}>{periodLabel(invoice.period_start, invoice.period_end)}</p>
                    <p style={{ fontSize: "1.35rem", fontWeight: 800, color: "#1C1917", margin: "3px 0 0", letterSpacing: "-0.02em" }}>{amount}</p>
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>

                {/* Card element container */}
                <div>
                  <label style={{ display: "block", fontSize: "0.73rem", fontWeight: 600, color: "#6B7280", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
                    Card Details
                  </label>
                  <div
                    ref={cardDivRef}
                    style={{
                      padding: "12px 14px",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: 10,
                      minHeight: 46,
                      background: "#FFFFFF",
                      transition: "border-color 0.15s",
                    }}
                  />
                  <p style={{ fontSize: "0.72rem", color: "#9CA3AF", margin: "8px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                    <LockIcon /> Secured by Stripe — your card details are never stored
                  </p>
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={view === "confirming"}
                  className="inv-pay-btn"
                  style={{
                    width: "100%",
                    marginTop: 22,
                    padding: "14px",
                    background: view === "confirming" ? "#374151" : "#1E293B",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 11,
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    cursor: view === "confirming" ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    letterSpacing: "0.01em",
                    transition: "background 0.15s",
                  }}
                >
                  {view === "confirming" && <SpinnerSvg size={16} color="#FFFFFF" />}
                  {view === "confirming" ? "Processing…" : `Pay ${amount} →`}
                </button>

                {view === "card" && (
                  <button
                    onClick={onClose}
                    style={{ width: "100%", marginTop: 10, padding: "10px", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", color: "#9CA3AF" }}
                  >
                    Cancel
                  </button>
                )}
              </>
            )}

            {/* Polling */}
            {view === "polling" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "20px 0" }}>
                <SpinnerSvg size={36} color="#0D9488" />
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1C1917", margin: 0 }}>Confirming your payment</p>
                  <p style={{ fontSize: "0.82rem", color: "#9CA3AF", margin: "5px 0 0" }}>This usually takes a few seconds…</p>
                </div>
              </div>
            )}

            {/* Receipt */}
            {view === "receipt" && receipt && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center" }}>
                {/* Green checkmark */}
                <div style={{
                  width: 68, height: 68,
                  background: "#F0FDF4",
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg viewBox="0 0 28 28" fill="none" style={{ width: 32, height: 32 }}>
                    <circle cx="14" cy="14" r="13" stroke="#22C55E" strokeWidth="2" />
                    <path d="M8 14l4.5 4.5L20 9" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* Receipt details */}
                <div style={{
                  background: "#F9F7F3",
                  borderRadius: 12,
                  padding: "18px 24px",
                  width: "100%",
                  textAlign: "left",
                }}>
                  <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 12px" }}>
                    Receipt
                  </p>
                  {[
                    { label: "Receipt No.", value: receipt.receipt_number },
                    { label: "Amount", value: fmtMoney(receipt.amount) },
                    { label: "Date", value: fmt(receipt.issued_at) },
                    { label: "Period", value: periodLabel(invoice.period_start, invoice.period_end) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEE8E0" }}>
                      <span style={{ fontSize: "0.82rem", color: "#9CA3AF" }}>{label}</span>
                      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1C1917", fontVariantNumeric: "tabular-nums" }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 10, width: "100%" }}>
                  <button
                    onClick={() => window.print()}
                    style={{
                      flex: 1, padding: "10px",
                      background: "#FFFFFF", border: "1.5px solid #E5E7EB",
                      borderRadius: 9, cursor: "pointer",
                      fontSize: "0.85rem", fontWeight: 600, color: "#374151",
                    }}
                  >
                    Print
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      flex: 1, padding: "10px",
                      background: "#1E293B", border: "none",
                      borderRadius: 9, cursor: "pointer",
                      fontSize: "0.85rem", fontWeight: 700, color: "#FFFFFF",
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {view === "error" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0" }}>
                <div style={{ width: 56, height: 56, background: "#FEF2F2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 26, height: 26 }}>
                    <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="1.8" />
                    <path d="M12 7v5.5M12 16.5v.5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontWeight: 600, color: "#1C1917", margin: "0 0 6px" }}>Payment could not be processed</p>
                  <p style={{ fontSize: "0.85rem", color: "#6B7280", margin: 0 }}>{errMsg}</p>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    padding: "10px 28px",
                    background: "#1E293B", border: "none",
                    borderRadius: 9, cursor: "pointer",
                    fontWeight: 600, color: "#FFFFFF", fontSize: "0.875rem",
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Tiny shared SVGs ──────────────────────────────────────────────────────────

function SpinnerSvg({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size, animation: "inv-spin 0.75s linear infinite", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" style={{ width: 11, height: 11, flexShrink: 0 }}>
      <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="#9CA3AF" strokeWidth="1.3" />
      <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// ── Invoice table (desktop) ───────────────────────────────────────────────────

function InvoiceTable({
  invoices,
  onPay,
}: {
  invoices: Invoice[];
  onPay: (inv: Invoice) => void;
}) {
  const COL: React.CSSProperties = { padding: "13px 18px", fontSize: "0.85rem" };
  const HEAD: React.CSSProperties = { ...COL, fontWeight: 600, color: "#6B7280", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "0.72rem", borderBottom: "1px solid #F0F0EE", background: "#FAFAF7" };

  return (
    <div style={{ borderRadius: 14, border: "1px solid #EEEAE4", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["#", "Period", "Due Date", "Rent", "Late Fee", "Total", "Status", ""].map(h => (
              <th key={h} style={{ ...HEAD, textAlign: h === "" ? "right" : "left" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv, i) => {
            const payable = !UNPAYABLE.includes(inv.status);
            return (
              <tr
                key={inv.id}
                className="inv-row"
                style={{ borderBottom: i < invoices.length - 1 ? "1px solid #F5F2EE" : "none" }}
              >
                <td style={{ ...COL, color: "#9CA3AF", fontWeight: 500 }}>#{inv.id}</td>
                <td style={{ ...COL, color: "#374151", whiteSpace: "nowrap" }}>{periodLabel(inv.period_start, inv.period_end)}</td>
                <td style={{ ...COL, color: "#374151", whiteSpace: "nowrap" }}>{fmt(inv.due_date)}</td>
                <td style={{ ...COL, color: "#374151", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(inv.rent_amount)}</td>
                <td style={{ ...COL, color: Number(inv.late_fee_amount) > 0 ? "#DC2626" : "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                  {Number(inv.late_fee_amount) > 0 ? `+${fmtMoney(inv.late_fee_amount)}` : "—"}
                </td>
                <td style={{ ...COL, fontWeight: 700, color: "#1C1917", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(inv.total_amount)}</td>
                <td style={COL}><StatusBadge status={inv.status} /></td>
                <td style={{ ...COL, textAlign: "right" }}>
                  {payable && (
                    <button
                      onClick={() => onPay(inv)}
                      className="inv-pay-pill"
                      style={{
                        padding: "6px 16px",
                        background: inv.status === "overdue" ? "#FEF2F2" : "#F0FAF8",
                        color: inv.status === "overdue" ? "#DC2626" : "#0E7F71",
                        border: `1.5px solid ${inv.status === "overdue" ? "#FECACA" : "#CCEEE9"}`,
                        borderRadius: 7,
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.15s",
                      }}
                    >
                      Pay Now
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Invoice cards (mobile) ────────────────────────────────────────────────────

function InvoiceCards({
  invoices,
  onPay,
}: {
  invoices: Invoice[];
  onPay: (inv: Invoice) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {invoices.map((inv) => {
        const payable = !UNPAYABLE.includes(inv.status);
        return (
          <div
            key={inv.id}
            style={{
              background: "#FFFFFF",
              border: "1px solid #EEEAE4",
              borderRadius: 14,
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1C1917", margin: 0 }}>
                  {periodLabel(inv.period_start, inv.period_end)}
                </p>
                <p style={{ fontSize: "0.78rem", color: "#9CA3AF", margin: "3px 0 0" }}>Due {fmt(inv.due_date)}</p>
              </div>
              <StatusBadge status={inv.status} />
            </div>

            <div style={{ display: "flex", gap: 16, fontSize: "0.82rem", marginBottom: payable ? 14 : 0 }}>
              <div>
                <span style={{ color: "#9CA3AF" }}>Rent </span>
                <span style={{ fontWeight: 600, color: "#374151" }}>{fmtMoney(inv.rent_amount)}</span>
              </div>
              {Number(inv.late_fee_amount) > 0 && (
                <div>
                  <span style={{ color: "#9CA3AF" }}>Late fee </span>
                  <span style={{ fontWeight: 600, color: "#DC2626" }}>+{fmtMoney(inv.late_fee_amount)}</span>
                </div>
              )}
              <div style={{ marginLeft: "auto" }}>
                <span style={{ color: "#9CA3AF" }}>Total </span>
                <span style={{ fontWeight: 700, color: "#1C1917" }}>{fmtMoney(inv.total_amount)}</span>
              </div>
            </div>

            {payable && (
              <button
                onClick={() => onPay(inv)}
                style={{
                  width: "100%",
                  padding: "11px",
                  background: "#1E293B",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 9,
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                }}
              >
                Pay {fmtMoney(inv.total_amount)} →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Page content ──────────────────────────────────────────────────────────────

function InvoicesContent() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);

  useEffect(() => {
    listInvoices()
      .then(setInvoices)
      .catch(() => setError("Failed to load invoices."))
      .finally(() => setLoading(false));
  }, []);

  const handlePaid = useCallback((updated: Invoice) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
  }, []);

  const summary = {
    total: invoices.length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    pending: invoices.filter((i) => i.status === "pending").length,
    paid: invoices.filter((i) => i.status === "paid").length,
  };

  return (
    <>
      <style>{`
        @keyframes inv-spin { to { transform: rotate(360deg); } }
        .inv-row:hover { background: #FAFAF7 !important; }
        .inv-pay-pill:hover { filter: brightness(0.95); transform: scale(0.98); }
        .inv-pay-btn:not(:disabled):hover { background: #0F172A !important; }
        @media (max-width: 768px) { .inv-table-wrap { display: none !important; } .inv-cards-wrap { display: block !important; } }
        @media (min-width: 769px) { .inv-table-wrap { display: block !important; } .inv-cards-wrap { display: none !important; } }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 22, paddingBottom: 32 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1C1917", margin: 0 }}>Invoices</h1>
            <p style={{ fontSize: "0.83rem", color: "#9CA3AF", margin: "4px 0 0" }}>Your billing history and upcoming payments.</p>
          </div>

          {/* Summary pills */}
          {!loading && invoices.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: `${summary.total} Total`, bg: "#F1F5F9", text: "#475569" },
                { label: `${summary.paid} Paid`, bg: "#F0FDF4", text: "#15803D" },
                { label: `${summary.pending} Pending`, bg: "#FFFBEB", text: "#D97706" },
                ...(summary.overdue > 0 ? [{ label: `${summary.overdue} Overdue`, bg: "#FEF2F2", text: "#DC2626" }] : []),
              ].map(({ label, bg, text }) => (
                <span key={label} style={{ background: bg, color: text, padding: "4px 11px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700 }}>
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", color: "#B91C1C", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && <PageLoader />}

        {/* Empty */}
        {!loading && !error && invoices.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 24px",
            background: "#FFFFFF", borderRadius: 14, border: "1px solid #EEEAE4",
          }}>
            <svg viewBox="0 0 48 48" fill="none" style={{ width: 40, height: 40, margin: "0 auto 12px" }}>
              <rect x="8" y="4" width="32" height="40" rx="4" stroke="#E5E7EB" strokeWidth="2.5" />
              <line x1="14" y1="16" x2="34" y2="16" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
              <line x1="14" y1="24" x2="34" y2="24" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
              <line x1="14" y1="32" x2="24" y2="32" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p style={{ fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>No invoices yet</p>
            <p style={{ fontSize: "0.83rem", color: "#9CA3AF", margin: 0 }}>Your billing history will appear here once invoices are generated.</p>
          </div>
        )}

        {/* Invoice list */}
        {!loading && invoices.length > 0 && (
          <>
            <div className="inv-table-wrap" style={{ display: "none" }}>
              <InvoiceTable invoices={invoices} onPay={setPayTarget} />
            </div>
            <div className="inv-cards-wrap" style={{ display: "none" }}>
              <InvoiceCards invoices={invoices} onPay={setPayTarget} />
            </div>
          </>
        )}
      </div>

      {/* Payment modal */}
      {payTarget && (
        <PaymentModal
          invoice={payTarget}
          onClose={() => setPayTarget(null)}
          onPaid={(updated) => { handlePaid(updated); }}
        />
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TenantInvoicesPage() {
  return (
    <RoleGuard allowed={["Tenant"]}>
      <InvoicesContent />
    </RoleGuard>
  );
}
