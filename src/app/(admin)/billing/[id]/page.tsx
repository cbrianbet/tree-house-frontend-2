"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DM_Mono, DM_Sans } from "next/font/google";
import { useParams } from "next/navigation";
import { getBillingConfig, getInvoice, recordManualPayment } from "@/lib/api/billing";
import { buildLeaseIndex, type LeaseLocation } from "@/lib/leaseIndex";
import { useAuth } from "@/context/AuthContext";
import { ROLE_ADMIN, ROLE_AGENT, ROLE_LANDLORD, ROLE_TENANT } from "@/constants/roles";
import type { BillingConfig, Invoice, InvoiceStatus } from "@/types/api";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";
import { FD, financeGbtn, financePbtn } from "@/constants/financeDesign";
import PageLoader from "@/components/ui/PageLoader";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

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

function invDisplayId(id: number) {
  return `INV-${String(id).padStart(4, "0")}`;
}

function toast(msg: string) {
  const div = document.createElement("div");
  div.textContent = msg;
  Object.assign(div.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: FD.k9,
    color: "#fff",
    padding: "9px 16px",
    borderRadius: `${FD.rmd}px`,
    fontSize: "13px",
    fontWeight: "500",
    zIndex: "9999",
  });
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2200);
}

function rhStatusDot(status: InvoiceStatus) {
  if (status === "paid") return FD.g3;
  if (status === "overdue") return FD.r6;
  return FD.a1;
}

function statusBadge(status: InvoiceStatus): { bg: string; color: string; label: string } {
  if (status === "paid") return { bg: FD.g1, color: FD.activeBadgeText, label: "Paid" };
  if (status === "overdue") return { bg: FD.r0, color: FD.r6, label: "Overdue" };
  if (status === "cancelled") return { bg: FD.k0, color: FD.k7, label: "Cancelled" };
  if (status === "partial") return { bg: FD.a0, color: FD.a7, label: "Partial" };
  return { bg: FD.a0, color: FD.a7, label: "Pending" };
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = Number(params.id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loc, setLoc] = useState<LeaseLocation | null>(null);
  const [billingCfg, setBillingCfg] = useState<BillingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [inv, map] = await Promise.all([getInvoice(id), buildLeaseIndex()]);
      setInvoice(inv);
      setLoc(map.get(inv.lease) ?? null);
      const l = map.get(inv.lease);
      if (l) {
        try {
          setBillingCfg(await getBillingConfig(l.property.id));
        } catch {
          setBillingCfg(null);
        }
      } else {
        setBillingCfg(null);
      }
    } catch {
      setError("Failed to load invoice.");
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const isTenantViewer = user?.role === ROLE_TENANT;
  const canPay = isTenantViewer && invoice && invoice.status !== "paid" && invoice.status !== "cancelled";
  const canRecordManual =
    user != null &&
    [ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT].includes(user.role) &&
    invoice != null &&
    invoice.status !== "cancelled";
  const amountPaidNum = Number(invoice?.amount_paid ?? 0);
  const totalNum = Number(invoice?.total_amount ?? 0);
  const remainingBalance = Math.max(0, totalNum - amountPaidNum);

  async function handleRecordManualPayment() {
    if (!invoice || remainingBalance <= 0 || recordingPayment) return;
    setRecordingPayment(true);
    try {
      await recordManualPayment(invoice.id, remainingBalance.toFixed(2));
      toast("Payment recorded");
      await load();
    } catch {
      toast("Could not record payment");
    } finally {
      setRecordingPayment(false);
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  if (error || !invoice) {
    return (
      <div className={dmSans.className} style={{ fontFamily: dmSans.style.fontFamily, padding: 16, background: FD.r0, border: `0.5px solid ${FD.bdm}`, borderRadius: FD.rmd, color: FD.r6 }}>
        {error || "Invoice not found."}
      </div>
    );
  }

  const st = statusBadge(invoice.status);
  const lateFee = Number(invoice.late_fee_amount);
  const rentAmt = Number(invoice.rent_amount);
  const total = Number(invoice.total_amount);
  const dueTs = new Date(invoice.due_date).getTime();
  const daysOverdue = invoice.status === "overdue" ? Math.max(0, Math.ceil((Date.now() - dueTs) /86400000)) : null;

  const tenantName = loc ? `Tenant #${loc.lease.tenant}` : `Lease #${invoice.lease}`;
  const unitLine = loc ? `${loc.unit.name} · ${loc.property.name}` : "—";
  const landlordName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username : "Landlord";

  const latePct =
    billingCfg?.late_fee_mode === "fixed"
      ? null
      : billingCfg
        ? Number(billingCfg.late_fee_percentage)
        : 5;
  const lateFixed = billingCfg?.late_fee_fixed_amount
    ? Number(billingCfg.late_fee_fixed_amount)
    : 0;
  const grace = billingCfg?.grace_period_days ?? 5;
  const landlordPropsName = `${landlordName} Properties`;

  const paymentRows: { key: string; label: string; value: string }[] = (() => {
    const paybill = billingCfg?.mpesa_paybill?.trim();
    const mpesaLbl = billingCfg?.mpesa_account_label?.trim();
    const bName = billingCfg?.bank_name?.trim();
    const bAcct = billingCfg?.bank_account?.trim();
    const hasInstr = Boolean(paybill || bName || bAcct || mpesaLbl);
    if (!hasInstr) {
      return [
        {
          key: "placeholder",
          label: "Payment details",
          value: "Add paybill and bank copy under Billing configuration for this property.",
        },
      ];
    }
    const rows: { key: string; label: string; value: string }[] = [];
    const unitRef = loc ? `UNIT-${loc.unit.id}-T${loc.lease.tenant}` : "—";
    if (paybill) rows.push({ key: "mpesa-paybill", label: "M-Pesa Paybill", value: paybill });
    const mpesaAcct = mpesaLbl || (unitRef !== "—" ? unitRef : "");
    if (mpesaAcct) rows.push({ key: "mpesa-acct", label: "M-Pesa account no.", value: mpesaAcct });
    if (bName) rows.push({ key: "bank-name", label: "Bank name", value: bName });
    if (bAcct) rows.push({ key: "bank-acct", label: "Bank account no.", value: bAcct });
    rows.push({ key: "acct-name", label: "Account name", value: landlordPropsName });
    const notes = billingCfg?.payment_notes?.trim();
    if (notes) rows.push({ key: "notes", label: "Notes", value: notes });
    return rows;
  })();

  const latePolicySummary =
    latePct !== null
      ? `${latePct}% after due date`
      : lateFixed > 0
        ? `${fmtKES(lateFixed)} fixed after due`
        : "per billing config";
  const lateFeeDetail =
    lateFee > 0
      ? latePct !== null
        ? `${fmtKES(lateFee)} (${latePct}%)`
        : `${fmtKES(lateFee)} (fixed)`
      : "—";

  return (
    <div className={dmSans.className} style={{ fontFamily: dmSans.style.fontFamily, fontSize: 14, color: FD.k9, maxWidth: 1100, margin: "0 auto" }}>
      <FinancePageTopBar
        className="-mx-4 -mt-4 md:-mx-6 md:-mt-6"
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Invoices", href: "/billing" },
          { label: invDisplayId(invoice.id) },
        ]}
        right={
          <>
            <button
              type="button"
              onClick={() => toast("PDF export coming soon")}
              className="transition-colors hover:bg-[#F2F1EB]"
              style={financeGbtn(dmSans.style.fontFamily)}
            >
              <IconDownload />
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => toast("Reminder queued (connect API)")}
              className="transition-colors hover:bg-[#F2F1EB]"
              style={financeGbtn(dmSans.style.fontFamily)}
            >
              <IconPhone />
              Send reminder
            </button>
            {invoice.status !== "paid" && invoice.status !== "cancelled" && canRecordManual && remainingBalance > 0 && (
              <button
                type="button"
                disabled={recordingPayment}
                onClick={() => void handleRecordManualPayment()}
                style={financePbtn(dmSans.style.fontFamily)}
                onMouseEnter={(e) => {
                  if (!recordingPayment) e.currentTarget.style.background = FD.primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = FD.g7;
                }}
              >
                <IconCheck />
                {recordingPayment ? "Recording…" : `Record payment (${fmtKES(remainingBalance)})`}
              </button>
            )}
          </>
        }
      />

      <div style={{ paddingTop: 22, paddingBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }} className="max-lg:grid-cols-1">
          <div>
            <div
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rxl,
                overflow: "hidden",
                marginBottom: 16,
                animation: "invDetailIn 0.3s ease both",
              }}
            >
              <div
                style={{
                  background: FD.g7,
                  padding: "22px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#fff" }}>Tree House</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>Property Management Platform</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className={dmMono.className} style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", marginBottom: 3 }}>
                    {invDisplayId(invoice.id)}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                        background: "rgba(255,255,255,0.15)",
                        color: "#fff",
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: rhStatusDot(invoice.status), flexShrink: 0 }} />
                      {st.label}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ padding: "22px 28px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 20,
                    marginBottom: 22,
                    paddingBottom: 22,
                    borderBottom: `0.5px solid ${FD.bd}`,
                  }}
                  className="max-sm:grid-cols-1"
                >
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: FD.k5, marginBottom: 6 }}>Billed to</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9, marginBottom: 2 }}>{tenantName}</div>
                    <div style={{ fontSize: 12, color: FD.k5 }}>{unitLine}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: FD.k5, marginBottom: 6 }}>From</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9, marginBottom: 2 }}>{landlordName}</div>
                    <div style={{ fontSize: 12, color: FD.k5 }}>Landlord</div>
                    <div className={dmMono.className} style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>
                      Issued {fmtDate(invoice.period_start)}
                    </div>
                    <div className={dmMono.className} style={{ fontSize: 11, color: FD.k5 }}>
                      Due {fmtDate(invoice.due_date)}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 120px",
                      gap: 10,
                      padding: "6px 0",
                      borderBottom: `0.5px solid ${FD.bd}`,
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.3px",
                      color: FD.k5,
                    }}
                    className="max-sm:grid-cols-1 max-sm:gap-1"
                  >
                    <div>Description</div>
                    <div style={{ textAlign: "right" }} className="max-sm:text-left">
                      Qty
                    </div>
                    <div style={{ textAlign: "right" }} className="max-sm:text-left">
                      Amount
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 120px",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: `0.5px solid ${FD.bd}`,
                      fontSize: 13,
                      color: FD.k9,
                    }}
                    className="max-sm:grid-cols-1"
                  >
                    <div>
                      {fmtDate(invoice.period_start)} — {fmtDate(invoice.period_end)} · Rent
                      <br />
                      <span style={{ fontSize: 11, color: FD.k5 }}>{unitLine}</span>
                    </div>
                    <div className={`${dmMono.className} max-sm:text-left`} style={{ textAlign: "right", fontSize: 12 }}>
                      1
                    </div>
                    <div className={`${dmMono.className} max-sm:text-left`} style={{ textAlign: "right", fontSize: 12 }}>
                      {fmtKES(rentAmt)}
                    </div>
                  </div>
                  {lateFee > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 120px 120px",
                        gap: 10,
                        padding: "10px 0",
                        borderBottom: `0.5px solid ${FD.bd}`,
                        fontSize: 13,
                        color: FD.k9,
                      }}
                      className="max-sm:grid-cols-1"
                    >
                      <div>
                        Late fee
                        <br />
                        <span style={{ fontSize: 11, color: FD.k5 }}>Applied after due date</span>
                      </div>
                      <div className={dmMono.className} style={{ textAlign: "right", fontSize: 12 }}>
                        1
                      </div>
                      <div className={dmMono.className} style={{ textAlign: "right", fontSize: 12, color: FD.r6 }}>
                        {fmtKES(lateFee)}
                      </div>
                    </div>
                  )}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 120px",
                      gap: 10,
                      padding: "12px 0 0",
                      fontSize: 15,
                      fontWeight: 500,
                      color: FD.k9,
                    }}
                    className="max-sm:grid-cols-1"
                  >
                    <div />
                    <div style={{ textAlign: "right", color: FD.k5, fontSize: 13 }} className="max-sm:text-left">
                      Total due
                    </div>
                    <div className={`${dmMono.className} max-sm:text-left`} style={{ textAlign: "right", color: FD.g7, fontSize: 15 }}>
                      {fmtKES(total)}
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: FD.k0,
                  padding: "14px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 12, color: FD.k5, flex: "1 1 200px" }}>
                  Payment due {fmtDate(invoice.due_date)} · Late fee {latePolicySummary} · {grace} day grace
                </div>
                {canPay ? (
                  <button
                    type="button"
                    onClick={() => toast("Opening payment…")}
                    style={{
                      height: 36,
                      padding: "0 20px",
                      background: FD.g7,
                      color: "#fff",
                      border: "none",
                      borderRadius: FD.rmd,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: dmSans.style.fontFamily,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <IconCard />
                    Pay now
                  </button>
                ) : (
                  !isTenantViewer && (
                    <span style={{ fontSize: 12, color: FD.k5 }}>Tenant pays via their dashboard</span>
                  )
                )}
              </div>
            </div>

            <div style={{ background: FD.wh, border: `0.5px solid ${FD.bd}`, borderRadius: FD.rlg, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: FD.k5, marginBottom: 12 }}>Payment instructions</div>
              {paymentRows.map((row) => (
                <div
                  key={row.key}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `0.5px solid ${FD.bd}` }}
                >
                  <div style={{ fontSize: 13, color: FD.k5 }}>{row.label}</div>
                  <div className={dmMono.className} style={{ fontSize: 13, fontWeight: 500, color: FD.k9 }}>
                    {row.value}
                  </div>
                </div>
              ))}
            </div>

            {loc && (
              <div style={{ marginTop: 14 }}>
                <Link
                  href={`/leases/${loc.lease.id}`}
                  style={{ fontSize: 13, fontWeight: 500, color: FD.g7, textDecoration: "none" }}
                >
                  View lease #{loc.lease.id} →
                </Link>
              </div>
            )}
          </div>

          <div>
            <div style={{ background: FD.wh, border: `0.5px solid ${FD.bd}`, borderRadius: FD.rlg, padding: "16px 18px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: FD.k5, marginBottom: 12 }}>Invoice status</div>
              {[
                ["Status", <span key="s" style={{ display: "inline-flex", padding: "3px 9px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: st.bg, color: st.color }}>{st.label}</span>],
                ["Issued", fmtDate(invoice.period_start)],
                ["Due", fmtDate(invoice.due_date)],
                ["Days overdue", daysOverdue !== null ? `${daysOverdue} days` : "—"],
                ["Late fee", lateFeeDetail],
              ].map(([k, v], i, arr) => (
                <div
                  key={String(k)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: i < arr.length - 1 ? `0.5px solid ${FD.bd}` : "none",
                  }}
                >
                  <div style={{ fontSize: 13, color: FD.k5 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: k === "Days overdue" && daysOverdue ? FD.r6 : FD.k9 }}>{v}</div>
                </div>
              ))}
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                  <>
                    <button
                      type="button"
                      disabled={!canRecordManual || remainingBalance <= 0 || recordingPayment}
                      onClick={() => void handleRecordManualPayment()}
                      style={{
                        ...financePbtn(dmSans.style.fontFamily),
                        width: "100%",
                        justifyContent: "center",
                        opacity: !canRecordManual || remainingBalance <= 0 ? 0.55 : 1,
                      }}
                    >
                      <IconCheck />
                      {recordingPayment ? "Recording…" : remainingBalance <= 0 ? "Fully paid" : `Record payment (${fmtKES(remainingBalance)})`}
                    </button>
                    <button type="button" onClick={() => toast("Reminder sent")} style={{ ...financeGbtn(dmSans.style.fontFamily), width: "100%", justifyContent: "center" }}>
                      Send reminder
                    </button>
                    <button
                      type="button"
                      onClick={() => toast("Void invoice (API)")}
                      style={{ ...financeGbtn(dmSans.style.fontFamily), width: "100%", justifyContent: "center", color: FD.r6 }}
                    >
                      Void invoice
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ background: FD.wh, border: `0.5px solid ${FD.bd}`, borderRadius: FD.rlg, padding: "16px 18px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: FD.k5, marginBottom: 12 }}>Timeline</div>
              {[
                { text: "Invoice created", t: invoice.period_start, dot: "a" as const },
                { text: "Period ends", t: invoice.period_end, dot: "k" as const },
                { text: "Due date", t: invoice.due_date, dot: invoice.status === "overdue" ? ("a" as const) : ("k" as const) },
              ].map((item, i, arr) => (
                <div key={item.text} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < arr.length - 1 ? `0.5px solid ${FD.bd}` : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 3 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: item.dot === "a" ? FD.a5 : FD.k2,
                      }}
                    />
                    {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: FD.bd, marginTop: 4, minHeight: 16 }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: FD.k9 }}>{item.text}</div>
                    <div className={dmMono.className} style={{ fontSize: 11, color: FD.k5, marginTop: 2 }}>
                      {fmtDate(item.t).toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: FD.wh, border: `0.5px solid ${FD.bd}`, borderRadius: FD.rlg, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: FD.k5, marginBottom: 12 }}>Tenant</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `0.5px solid ${FD.bd}` }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: FD.g5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#fff",
                  }}
                >
                  T{loc?.lease.tenant ?? "?"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: FD.k9 }}>{tenantName}</div>
                  <div className={dmMono.className} style={{ fontSize: 11, color: FD.k5 }}>
                    User ID {loc?.lease.tenant ?? invoice.lease}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `0.5px solid ${FD.bd}` }}>
                <div style={{ fontSize: 13, color: FD.k5 }}>Lease</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: FD.g7 }}>#{invoice.lease}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <div style={{ fontSize: 13, color: FD.k5 }}>Outstanding</div>
                <div className={dmMono.className} style={{ fontSize: 13, fontWeight: 500, color: FD.a7 }}>
                  {invoice.status === "paid" ? "KES 0" : fmtKES(total - Number(invoice.amount_paid ?? 0))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes invDetailIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
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

function IconPhone() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.4 2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}
