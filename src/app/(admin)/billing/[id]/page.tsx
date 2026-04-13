"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInvoice } from "@/lib/api/billing";
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
const AMBER = "#D97706";

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; color: string; label: string; desc: string }> = {
  paid:      { bg: "#F0FDF4", color: "#15803D", label: "Paid",      desc: "This invoice has been paid in full." },
  pending:   { bg: "#FFFBEB", color: AMBER,     label: "Pending",   desc: "Payment is expected by the due date." },
  overdue:   { bg: REDBG,     color: RED,       label: "Overdue",   desc: "Payment is past the due date." },
  partial:   { bg: "#EFF6FF", color: "#1D4ED8", label: "Partial",   desc: "A partial payment has been received." },
  cancelled: { bg: GRAY100,   color: GRAY500,   label: "Cancelled", desc: "This invoice has been voided." },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtKES(v: string | number) {
  return `KES ${Number(v).toLocaleString()}`;
}

function toast(msg: string) {
  // Simple inline toast — uses alert for now
  const div = document.createElement("div");
  div.textContent = msg;
  Object.assign(div.style, {
    position: "fixed", bottom: "24px", right: "24px", background: "#111827",
    color: "#fff", padding: "10px 18px", borderRadius: "8px", fontSize: "13px",
    zIndex: "9999", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  });
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2800);
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getInvoice(id)
      .then(setInvoice)
      .catch(() => setError("Failed to load invoice."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <span style={{ color: GRAY500 }}>Loading…</span>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ background: REDBG, border: "1px solid #FECACA", borderRadius: 8, padding: "12px 16px", color: RED, fontSize: 14, maxWidth: 500 }}>
        {error || "Invoice not found."}
      </div>
    );
  }

  const st = STATUS_STYLES[invoice.status] || STATUS_STYLES.cancelled;
  const lateFee = Number(invoice.late_fee_amount);
  const rentAmt = Number(invoice.rent_amount);
  const total = Number(invoice.total_amount);
  const isPaid = invoice.status === "paid";

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Back button */}
      <button
        onClick={() => router.push("/billing")}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20, background: "none", border: "none", color: GRAY500, fontSize: 13, cursor: "pointer", padding: 0 }}
      >
        ← Invoices
      </button>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Invoice header card */}
          <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: GRAY900, margin: "0 0 6px" }}>
                  Invoice #{invoice.id}
                </h1>
                <p style={{ fontSize: 13, color: GRAY500, margin: 0 }}>
                  Period: {fmtDate(invoice.period_start)} – {fmtDate(invoice.period_end)}
                </p>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: st.bg, color: st.color }}>
                {st.label}
              </span>
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: GRAY400, marginBottom: 2 }}>DUE DATE</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: GRAY900 }}>{fmtDate(invoice.due_date)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: GRAY400, marginBottom: 2 }}>LEASE</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: GRAY900 }}>#{invoice.lease}</p>
              </div>
              {invoice.amount_paid && (
                <div>
                  <p style={{ fontSize: 11, color: GRAY400, marginBottom: 2 }}>AMOUNT PAID</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: GREEN }}>{fmtKES(invoice.amount_paid)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice breakdown card */}
          <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "20px 24px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: GRAY900, marginBottom: 16 }}>Invoice Breakdown</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${GRAY200}` }}>
                <span style={{ fontSize: 14, color: GRAY700 }}>Rent</span>
                <span style={{ fontSize: 14, fontFamily: "monospace", color: GRAY900 }}>{fmtKES(rentAmt)}</span>
              </div>
              {lateFee > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${GRAY200}` }}>
                  <span style={{ fontSize: 14, color: RED }}>Late Fee</span>
                  <span style={{ fontSize: 14, fontFamily: "monospace", color: RED }}>{fmtKES(lateFee)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: GRAY900 }}>Total</span>
                <span style={{ fontSize: 17, fontFamily: "monospace", fontWeight: 700, color: GRAY900 }}>{fmtKES(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment instructions card */}
          <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: GRAY100, padding: "20px 24px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: GRAY900, marginBottom: 10 }}>Payment Instructions</h2>
            <div style={{ fontSize: 13, color: GRAY700, lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 6px" }}>Please make payment to the following account:</p>
              <div style={{ background: WHITE, borderRadius: 8, padding: "12px 16px", border: `1px solid ${GRAY200}` }}>
                <p style={{ margin: "0 0 4px" }}><strong>Bank:</strong> Kenya Commercial Bank</p>
                <p style={{ margin: "0 0 4px" }}><strong>Account Name:</strong> Tree House Properties Ltd</p>
                <p style={{ margin: "0 0 4px" }}><strong>Account Number:</strong> 1234 5678 90</p>
                <p style={{ margin: 0 }}><strong>Reference:</strong> INV-{invoice.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Status card */}
          <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: GRAY500, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Invoice Status</h3>
            <div style={{ background: st.bg, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: st.color, margin: "0 0 2px" }}>{st.label}</p>
              <p style={{ fontSize: 12, color: st.color, margin: 0, opacity: 0.85 }}>{st.desc}</p>
            </div>
            {!isPaid && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => toast("Invoice marked as paid (UI only)")}
                  style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "none", background: GREEN, color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Mark as Paid
                </button>
                <button
                  onClick={() => toast("Reminder sent to tenant")}
                  style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: `1px solid ${GRAY200}`, background: WHITE, color: GRAY700, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                >
                  Send Reminder
                </button>
              </div>
            )}
            {invoice.status !== "cancelled" && (
              <button
                onClick={() => toast("Invoice voided (UI only)")}
                style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: `1px solid #FECACA`, background: REDBG, color: RED, fontSize: 13, fontWeight: 500, cursor: "pointer", marginTop: 8 }}
              >
                Void Invoice
              </button>
            )}
          </div>

          {/* Timeline card */}
          <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: GRAY500, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>Timeline</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "Period Start", date: invoice.period_start, color: GREEN },
                { label: "Period End",   date: invoice.period_end,   color: GRAY400 },
                { label: "Due Date",     date: invoice.due_date,     color: invoice.status === "overdue" ? RED : AMBER },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: i < arr.length - 1 ? 14 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, marginTop: 3, flexShrink: 0 }} />
                    {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: GRAY200, marginTop: 4, minHeight: 24 }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: GRAY400, margin: "0 0 1px" }}>{item.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: GRAY900, margin: 0 }}>{fmtDate(item.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info card */}
          <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: GRAY500, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: GRAY500 }}>Lease</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: GRAY900, fontFamily: "monospace" }}>#{invoice.lease}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: GRAY500 }}>Rent Amount</span>
                <span style={{ fontSize: 13, fontFamily: "monospace", color: GRAY900 }}>{fmtKES(invoice.rent_amount)}</span>
              </div>
              {lateFee > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: GRAY500 }}>Late Fee</span>
                  <span style={{ fontSize: 13, fontFamily: "monospace", color: RED }}>{fmtKES(lateFee)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
