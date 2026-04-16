"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DM_Mono, DM_Sans } from "next/font/google";
import { useParams, useRouter } from "next/navigation";
import { getBillingConfig, listInvoices } from "@/lib/api/billing";
import { getTenantDashboard } from "@/lib/api/dashboards";
import {
  createLeaseDocument,
  listLeaseDocuments,
  signLeaseDocument,
} from "@/lib/api/properties";
import { buildLeaseIndex, type LeaseLocation } from "@/lib/leaseIndex";
import { useAuth } from "@/context/AuthContext";
import { FD } from "@/constants/financeDesign";
import {
  ROLE_ADMIN,
  ROLE_AGENT,
  ROLE_LANDLORD,
  ROLE_TENANT,
} from "@/constants/roles";
import type { BillingConfig, Invoice, LeaseDocument } from "@/types/api";
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

function daysBetween(a: Date, b: Date) {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function leaseProgress(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const now = new Date();
  if (now <= s) return { pct: 0, daysLeft: daysBetween(now, e) };
  if (now >= e) return { pct: 100, daysLeft: 0 };
  const total = e.getTime() - s.getTime();
  const elapsed = now.getTime() - s.getTime();
  return {
    pct: Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))),
    daysLeft: daysBetween(now, e),
  };
}

function docKind(url: string): "pdf" | "img" | "doc" {
  const u = url.toLowerCase();
  if (u.includes(".pdf")) return "pdf";
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(u)) return "img";
  return "doc";
}

type TenantLeaseSummary = NonNullable<
  import("@/types/api").TenantDashboard["active_lease"]
>;

export default function LeaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const leaseId = Number(params.id);

  const [loc, setLoc] = useState<LeaseLocation | null>(null);
  const [tenantLease, setTenantLease] = useState<TenantLeaseSummary | null>(null);
  const [docs, setDocs] = useState<LeaseDocument[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingCfg, setBillingCfg] = useState<BillingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!leaseId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const map = await buildLeaseIndex();
        const found = map.get(leaseId) ?? null;
        if (cancelled) return;

        if (!found && user.role === ROLE_TENANT) {
          const dash = await getTenantDashboard();
          if (cancelled) return;
          if (dash.active_lease?.id === leaseId) {
            setTenantLease(dash.active_lease);
            setLoc(null);
            setError(null);
          } else {
            setTenantLease(null);
            setLoc(null);
            setError("Lease not found.");
          }
        } else if (!found) {
          setLoc(null);
          setTenantLease(null);
          setError("Lease not found.");
        } else {
          setLoc(found);
          setTenantLease(null);
          setError(null);
        }

        const [allInvoices, leaseDocs] = await Promise.all([
          listInvoices(),
          listLeaseDocuments(leaseId).catch(() => [] as LeaseDocument[]),
        ]);
        if (cancelled) return;
        setInvoices(allInvoices.filter((i) => i.lease === leaseId));
        setDocs(leaseDocs);

        const locNow = map.get(leaseId);
        if (locNow) {
          try {
            const cfg = await getBillingConfig(locNow.property.id);
            if (!cancelled) setBillingCfg(cfg);
          } catch {
            if (!cancelled) setBillingCfg(null);
          }
        } else if (!cancelled) setBillingCfg(null);
      } catch {
        if (!cancelled) setError("Failed to load lease.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leaseId, user]);

  const canManage =
    user && loc != null && [ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT].includes(user.role);

  const isTenant = user?.role === ROLE_TENANT;
  const canSign =
    isTenant && user && (loc ? loc.lease.tenant === user.pk : tenantLease != null);

  const titleName = loc
    ? `Tenant #${loc.lease.tenant}`
    : tenantLease
      ? [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Tenant"
      : "—";
  const unitLine = loc ? loc.unit.name : tenantLease?.unit ?? "—";
  const propLine = loc ? loc.property.name : tenantLease?.property ?? "—";
  const startD = loc?.lease.start_date ?? tenantLease?.start_date ?? "";
  const endD = loc?.lease.end_date ?? tenantLease?.end_date ?? "";
  const rentAmt = loc?.lease.rent_amount ?? tenantLease?.rent_amount ?? "0";
  const isActive = loc ? loc.lease.is_active : true;
  const depositHeld = loc ? loc.unit.security_deposit : "—";
  const serviceCharge = loc ? loc.unit.service_charge : "—";
  const tenantPk = loc?.lease.tenant ?? (isTenant ? user?.pk : undefined);

  const { pct, daysLeft } =
    startD && endD ? leaseProgress(startD, endD) : { pct: 0, daysLeft: 0 };

  const renewalUrgent = daysLeft > 0 && daysLeft <= 90;

  const grace = billingCfg?.grace_period_days ?? 3;
  const latePct = billingCfg?.late_fee_percentage ?? "5";
  const dueDay = billingCfg?.rent_due_day ?? 1;

  let totalInvoiced = 0;
  let totalCollected = 0;
  let outstanding = 0;
  for (const inv of invoices) {
    if (inv.status === "cancelled") continue;
    totalInvoiced += Number(inv.total_amount);
    totalCollected += Number(inv.amount_paid ?? 0);
    outstanding += Number(inv.total_amount) - Number(inv.amount_paid ?? 0);
  }

  const lastPaid = [...invoices]
    .filter((i) => i.status === "paid")
    .sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime())[0];

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createLeaseDocument(leaseId, {
        document_type: fd.get("document_type") as LeaseDocument["document_type"],
        title: (fd.get("title") as string) || "Document",
        file_url: (fd.get("file_url") as string) || "",
      });
      setShowUpload(false);
      setDocs(await listLeaseDocuments(leaseId));
      toast("Document added.");
    } catch {
      toast("Upload failed — check URL and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSignDoc(docId: number) {
    setSubmitting(true);
    try {
      await signLeaseDocument(leaseId, docId);
      setDocs(await listLeaseDocuments(leaseId));
      toast("Document signed.");
    } catch {
      toast("Could not sign document.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  if (loading) {
    return <PageLoader />;
  }

  if (error || (!loc && !tenantLease)) {
    return (
      <div className={dmSans.className} style={{ fontFamily: dmSans.style.fontFamily, padding: 24 }}>
        <p style={{ color: FD.r6, marginBottom: 12 }}>{error ?? "Lease not found."}</p>
        <button
          type="button"
          onClick={() => router.push("/billing")}
          style={{
            height: 34,
            padding: "0 14px",
            background: FD.g7,
            color: "#fff",
            border: "none",
            borderRadius: FD.rmd,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: dmSans.style.fontFamily,
          }}
        >
          Back to invoices
        </button>
      </div>
    );
  }

  const durationLabel = (() => {
    if (!startD || !endD) return "—";
    const s = new Date(startD);
    const e = new Date(endD);
    const mo = Math.max(1, Math.round((e.getTime() - s.getTime()) / (30.44 * 86400000)));
    return `${mo} months`;
  })();

  const onTimeLabel =
    invoices.length === 0
      ? "—"
      : invoices.every((i) => i.status !== "overdue")
        ? "100%"
        : "See invoices";

  function signLabel(doc: LeaseDocument): string {
    if (!doc.signed_at) return "Unsigned";
    if (tenantPk != null && doc.signed_by === tenantPk) return "Tenant signed";
    return "Signed";
  }

  return (
    <div
      className={dmSans.className}
      style={{
        fontFamily: dmSans.style.fontFamily,
        fontSize: 14,
        color: FD.k9,
        background: FD.surf,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          background: FD.wh,
          borderBottom: `0.5px solid ${FD.bd}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: FD.k5 }}>
          <Link href="/properties" style={{ color: FD.k5, textDecoration: "none" }}>
            Properties
          </Link>
          <span aria-hidden>›</span>
          <span style={{ color: FD.k9, fontWeight: 500 }}>
            {titleName} · {unitLine}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => toast("Lease PDF export is not wired yet.")}
            style={{
              height: 34,
              padding: "0 14px",
              background: FD.wh,
              color: FD.k7,
              border: `0.5px solid ${FD.bdm}`,
              borderRadius: FD.rmd,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: dmSans.style.fontFamily,
            }}
          >
            Download PDF
          </button>
          {canManage && loc && (
            <button
              type="button"
              onClick={() => router.push(`/properties/${loc.property.id}`)}
              style={{
                height: 34,
                padding: "0 14px",
                background: FD.wh,
                color: FD.k7,
                border: `0.5px solid ${FD.bdm}`,
                borderRadius: FD.rmd,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: dmSans.style.fontFamily,
              }}
            >
              Edit on property
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setShowUpload(true);
                toast("Add document URL below.");
              }}
              style={{
                height: 34,
                padding: "0 14px",
                background: FD.g7,
                color: "#fff",
                border: "none",
                borderRadius: FD.rmd,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: dmSans.style.fontFamily,
              }}
            >
              Upload document
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "22px 24px", maxWidth: 1100, margin: "0 auto" }}>
        {renewalUrgent && (
          <div
            style={{
              background: FD.a0,
              border: `0.5px solid ${FD.a1}`,
              borderRadius: FD.rlg,
              padding: "14px 16px",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: FD.a1,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: FD.a7 }}>
                Lease ends in {daysLeft} days — {fmtDate(endD)}
              </div>
              <div style={{ fontSize: 12, color: FD.a7, opacity: 0.85, marginTop: 2 }}>
                Plan renewal with your tenant to avoid a gap in occupancy.
              </div>
            </div>
            <button
              type="button"
              onClick={() => toast("Renewal offers are not automated yet.")}
              style={{
                height: 32,
                padding: "0 14px",
                background: FD.a5,
                color: "#fff",
                border: "none",
                borderRadius: FD.rmd,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: dmSans.style.fontFamily,
              }}
            >
              Send renewal offer
            </button>
          </div>
        )}

        <div
          style={{
            background: FD.g7,
            borderRadius: FD.rxl,
            padding: "22px 28px",
            marginBottom: 20,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 20,
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: FD.g3,
                marginBottom: 8,
              }}
            >
              {isActive ? "Active lease" : "Inactive lease"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 500, color: "#fff", marginBottom: 4 }}>
              {titleName} · {unitLine}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 18 }}>{propLine}</div>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.45)",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    marginBottom: 3,
                  }}
                >
                  Start date
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>{fmtDate(startD)}</div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.45)",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    marginBottom: 3,
                  }}
                >
                  End date
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>{fmtDate(endD)}</div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.45)",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    marginBottom: 3,
                  }}
                >
                  Duration
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>{durationLabel}</div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.45)",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    marginBottom: 3,
                  }}
                >
                  Deposit held
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>
                  {depositHeld === "—" ? "—" : fmtKES(depositHeld)}
                </div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right", position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Monthly rent</div>
            <div
              className={dmMono.className}
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "#fff",
                letterSpacing: "-0.5px",
                lineHeight: 1,
              }}
            >
              {fmtKES(rentAmt)}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
              Rent due day {dueDay} · {grace}d grace · {latePct}% late fee
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                marginTop: 10,
                padding: "4px 10px",
                background: "rgba(255,255,255,0.12)",
                borderRadius: 20,
                fontSize: 12,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: FD.g3 }} />
              {isActive ? `Active · ${daysLeft} days remaining` : "Inactive"}
            </div>
          </div>
        </div>

        <div
          style={{
            background: FD.wh,
            border: `0.5px solid ${FD.bd}`,
            borderRadius: FD.rlg,
            padding: "16px 20px",
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
              marginBottom: 10,
            }}
          >
            Lease progress
          </div>
          <div style={{ height: 8, background: FD.k1, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ height: "100%", borderRadius: 4, background: FD.g5, width: `${pct}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: FD.k5, flexWrap: "wrap", gap: 8 }}>
            <span>{fmtDate(startD)}</span>
            <span style={{ color: FD.g7, fontWeight: 500 }}>
              {pct}% complete · {daysLeft} days left
            </span>
            <span>{fmtDate(endD)}</span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14,
          }}
          className="max-lg:grid-cols-1"
        >
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
                marginBottom: 12,
              }}
            >
              Lease terms
            </div>
            {row("Lease type", "Fixed term")}
            {row("Rent amount", fmtKES(rentAmt) + " / mo", "g")}
            {row("Service charge", serviceCharge === "—" ? "—" : fmtKES(serviceCharge) + " / mo", "m")}
            {row("Late fee", `${latePct}% after due date`)}
            {row("Notice period", "—")}
            {row("Rent review", "—")}
            {row(
              "Status",
              <span
                style={{
                  display: "inline-flex",
                  padding: "2px 8px",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 500,
                  background: FD.g1,
                  color: FD.activeBadgeText,
                }}
              >
                {isActive ? "Active" : "Inactive"}
              </span>,
            )}
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
                marginBottom: 12,
              }}
            >
              Payment summary
            </div>
            {row("Total invoiced", fmtKES(totalInvoiced), "m")}
            {row("Total collected", fmtKES(totalCollected), "g")}
            {row("Outstanding", fmtKES(outstanding), "a")}
            {row("Deposit held", depositHeld === "—" ? "—" : fmtKES(depositHeld), "m")}
            {row("On-time rate", onTimeLabel, "g")}
            {row("Last payment", lastPaid ? fmtDate(lastPaid.period_end) : "—")}
          </div>
        </div>

        <div
          style={{
            background: FD.wh,
            border: `0.5px solid ${FD.bd}`,
            borderRadius: FD.rlg,
            padding: "16px 18px",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 8,
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
              Lease documents
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setShowUpload((s) => !s)}
                style={{
                  height: 26,
                  padding: "0 10px",
                  borderRadius: FD.rsm,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: dmSans.style.fontFamily,
                  background: FD.wh,
                  color: FD.k7,
                  border: `0.5px solid ${FD.bdm}`,
                }}
              >
                {showUpload ? "Close" : "Upload"}
              </button>
            )}
          </div>

          {showUpload && canManage && (
            <form
              onSubmit={onUpload}
              style={{
                marginBottom: 16,
                padding: 12,
                background: FD.k0,
                borderRadius: FD.rmd,
                display: "grid",
                gap: 10,
                gridTemplateColumns: "1fr 1fr 1fr",
              }}
              className="max-md:grid-cols-1"
            >
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: FD.k5 }}>
                Type
                <select
                  name="document_type"
                  required
                  style={{
                    height: 36,
                    padding: "0 10px",
                    borderRadius: FD.rmd,
                    border: `0.5px solid ${FD.bdm}`,
                    fontFamily: dmSans.style.fontFamily,
                    fontSize: 13,
                  }}
                >
                  <option value="lease_agreement">Lease agreement</option>
                  <option value="addendum">Addendum</option>
                  <option value="notice">Notice</option>
                  <option value="inspection_report">Inspection report</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: FD.k5 }}>
                Title
                <input
                  name="title"
                  required
                  placeholder="Tenancy agreement"
                  style={{
                    height: 36,
                    padding: "0 10px",
                    borderRadius: FD.rmd,
                    border: `0.5px solid ${FD.bdm}`,
                    fontFamily: dmSans.style.fontFamily,
                    fontSize: 13,
                  }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: FD.k5 }}>
                Document URL
                <input
                  name="file_url"
                  required
                  placeholder="https://…"
                  style={{
                    height: 36,
                    padding: "0 10px",
                    borderRadius: FD.rmd,
                    border: `0.5px solid ${FD.bdm}`,
                    fontFamily: dmSans.style.fontFamily,
                    fontSize: 13,
                  }}
                />
              </label>
              <div style={{ gridColumn: "1 / -1" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    height: 32,
                    padding: "0 14px",
                    background: FD.g7,
                    color: "#fff",
                    border: "none",
                    borderRadius: FD.rmd,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: submitting ? "wait" : "pointer",
                    fontFamily: dmSans.style.fontFamily,
                  }}
                >
                  Save document
                </button>
              </div>
            </form>
          )}

          {docs.length === 0 ? (
            <p style={{ fontSize: 13, color: FD.k5 }}>No documents yet.</p>
          ) : (
            docs.map((doc) => {
              const kind = docKind(doc.file_url);
              const iconBg = kind === "pdf" ? FD.r0 : kind === "img" ? FD.g1 : FD.b0;
              const iconStroke = kind === "pdf" ? FD.r6 : kind === "img" ? FD.g7 : FD.b8;
              return (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 0",
                    borderBottom: `0.5px solid ${FD.bd}`,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: FD.rmd,
                      background: iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: iconStroke,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {kind.toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: FD.k9 }}>{doc.title}</div>
                    <div style={{ fontSize: 11, color: FD.k5, marginTop: 2 }}>
                      {doc.document_type.replace(/_/g, " ")} · {fmtDate(doc.created_at)}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: FD.k5 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: doc.signed_at ? FD.g5 : FD.a5,
                        }}
                      />
                      {signLabel(doc)}
                    </div>
                    {canSign && !doc.signed_at && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => onSignDoc(doc.id)}
                        style={{
                          height: 26,
                          padding: "0 10px",
                          borderRadius: FD.rsm,
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: dmSans.style.fontFamily,
                          background: FD.g7,
                          color: "#fff",
                          border: `0.5px solid ${FD.g7}`,
                        }}
                      >
                        Sign
                      </button>
                    )}
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        height: 26,
                        padding: "0 10px",
                        borderRadius: FD.rsm,
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: dmSans.style.fontFamily,
                        background: FD.wh,
                        color: FD.k7,
                        border: `0.5px solid ${FD.bdm}`,
                        display: "inline-flex",
                        alignItems: "center",
                        textDecoration: "none",
                      }}
                    >
                      Open
                    </a>
                  </div>
                </div>
              );
            })
          )}

          {canManage && (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              style={{
                marginTop: 10,
                width: "100%",
                border: `1.5px dashed ${FD.bdm}`,
                borderRadius: FD.rlg,
                padding: 20,
                textAlign: "center",
                cursor: "pointer",
                background: FD.k0,
                fontFamily: dmSans.style.fontFamily,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: FD.k7 }}>Upload document</div>
              <div style={{ fontSize: 11, color: FD.k5, marginTop: 2 }}>Use a hosted file URL (same as property page)</div>
            </button>
          )}
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
              marginBottom: 12,
            }}
          >
            Tenant information
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }} className="max-md:grid-cols-1">
            <div>
              {row("Tenant ref", `#${tenantPk ?? user?.pk ?? "—"}`)}
              {row("Lease ID", `#${leaseId}`, "m")}
              {row("Lease started", fmtDate(startD))}
              {row("Account", isTenant ? user.email : "—", "m")}
            </div>
            <div
              style={{
                paddingLeft: 20,
                borderLeft: `0.5px solid ${FD.bd}`,
              }}
              className="max-md:border-none max-md:border-t max-md:border-solid max-md:pt-4 max-md:pl-0"
            >
              {row("Invoices", `${invoices.length} on file`)}
              <div style={{ padding: "7px 0", fontSize: 13 }}>
                <Link href="/billing" style={{ color: FD.g7, fontWeight: 500 }}>
                  View billing →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function row(
    k: string,
    v: React.ReactNode,
    tone?: "g" | "a" | "r" | "m",
  ) {
    const color =
      tone === "g" ? FD.g7 : tone === "a" ? FD.a7 : tone === "r" ? FD.r6 : FD.k9;
    const mono = tone === "m";
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "7px 0",
          borderBottom: `0.5px solid ${FD.bd}`,
          gap: 12,
        }}
      >
        <div style={{ fontSize: 13, color: FD.k5 }}>{k}</div>
        <div
          className={mono ? dmMono.className : undefined}
          style={{ fontSize: 13, fontWeight: 500, color, textAlign: "right" }}
        >
          {v}
        </div>
      </div>
    );
  }
}
