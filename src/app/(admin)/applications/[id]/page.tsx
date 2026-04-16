"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getApplication,
  approveApplication,
  rejectApplication,
  getUnit,
} from "@/lib/api/properties";
import type { Application, Unit, ApplicationApproveRequest } from "@/types/api";
import PageLoader from "@/components/ui/PageLoader";

// ── Design tokens ─────────────────────────────────────────────────────────────
const G7 = "#0F6E56";
const G5 = "#1D9E75";
const G1 = "#E1F5EE";
const A0 = "#FAEEDA";
const A7 = "#854F0B";
const R0 = "#FCEBEB";
const R3 = "#F09595";
const R6 = "#A32D2D";
const K9 = "#1A1A1A";
const K7 = "#3D3D3D";
const K5 = "#6B6B6B";
const K1 = "#E8E7E1";
const K0 = "#F2F1EB";
const SURF = "#F7F6F2";
const BD = "rgba(0,0,0,0.07)";
const BDM = "rgba(0,0,0,0.12)";
const RMD = 8;
const RLG = 14;
const RXL = 18;

const card: React.CSSProperties = {
  background: "#fff",
  border: `0.5px solid ${BD}`,
  borderRadius: RLG,
  padding: "18px 20px",
  marginBottom: 14,
};

const cardTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: ".4px",
  textTransform: "uppercase",
  color: K5,
  marginBottom: 12,
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: K5,
  marginBottom: 5,
  letterSpacing: "0.4px",
  textTransform: "uppercase",
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: "0 12px",
  background: K0,
  border: `0.5px solid ${BDM}`,
  borderRadius: RMD,
  fontSize: 13,
  color: K9,
  height: 36,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: A0, color: A7, label: "Pending" },
    approved: { bg: G1, color: "#085041", label: "Approved" },
    rejected: { bg: R0, color: R6, label: "Rejected" },
    withdrawn: { bg: "#F3F4F6", color: "#6B7280", label: "Withdrawn" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [app, setApp] = useState<Application | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  const load = useCallback(async () => {
    try {
      const a = await getApplication(id);
      setApp(a);
      const u = await getUnit(a.unit);
      setUnit(u);
      setRentAmount(u.price ?? "");
    } catch {
      showToast("Could not load application.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove() {
    if (!app || saving) return;
    if (!startDate || !rentAmount) {
      showToast("Please enter start date and rent amount.");
      return;
    }
    setSaving(true);
    try {
      const payload: ApplicationApproveRequest = {
        status: "approved",
        start_date: startDate,
        rent_amount: rentAmount,
      };
      if (endDate) payload.end_date = endDate;
      const updated = await approveApplication(app.id, payload);
      setApp(updated);
      showToast("Application approved — lease created");
    } catch {
      showToast("Failed to approve application.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!app || saving) return;
    setSaving(true);
    try {
      const updated = await rejectApplication(app.id);
      setApp(updated);
      showToast("Application declined.");
    } catch {
      showToast("Failed to decline application.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  if (!app) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: K5 }}>Application not found.</div>
    );
  }

  const isPending = app.status === "pending";
  const isApproved = app.status === "approved";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px", fontFamily: "inherit" }}>
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push("/applications")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#fff",
          color: K7,
          border: `0.5px solid ${BD}`,
          borderRadius: RMD,
          padding: "0 14px",
          height: 34,
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={K5} strokeWidth={2} strokeLinecap="round">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        Applications
      </button>

      {/* Application header card */}
      <div
        style={{
          background: "#fff",
          border: `0.5px solid ${BD}`,
          borderRadius: RXL,
          borderLeft: isPending ? `3px solid ${G5}` : undefined,
          padding: "20px 24px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: K9 }}>Application #{app.id}</span>
              {statusBadge(app.status)}
            </div>
            <div style={{ fontSize: 13, color: K5, marginBottom: 4 }}>
              Applicant #{app.applicant}
              {unit ? ` · Applied for Unit ${unit.name}` : ` · Unit #${app.unit}`}
            </div>
            <div style={{ fontSize: 12, color: K5 }}>
              Submitted {fmt(app.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Left column */}
        <div style={{ flex: "3 1 340px", minWidth: 0 }}>
          {/* Applicant note */}
          <div style={card}>
            <div style={cardTitle}>Applicant&apos;s note</div>
            {app.message ? (
              <p style={{ fontSize: 13, color: K7, lineHeight: 1.6, fontStyle: "italic" }}>
                &ldquo;{app.message}&rdquo;
              </p>
            ) : (
              <p style={{ fontSize: 13, color: K5, fontStyle: "italic" }}>No message provided.</p>
            )}
          </div>

          {/* Application timeline */}
          <div style={card}>
            <div style={cardTitle}>Application timeline</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: G5,
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: K9 }}>Submitted</div>
                  <div style={{ fontSize: 12, color: K5 }}>{fmt(app.created_at)}</div>
                </div>
              </div>
              {app.reviewed_at && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: isApproved ? G5 : R6,
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: K9 }}>
                      {isApproved ? "Approved" : "Reviewed"}
                    </div>
                    <div style={{ fontSize: 12, color: K5 }}>
                      {fmt(app.reviewed_at)}
                      {app.reviewed_by ? ` · by Reviewer #${app.reviewed_by}` : ""}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ flex: "2 1 240px", minWidth: 0 }}>
          {/* Decision card — only if pending */}
          {isPending && (
            <div
              style={{
                background: "#fff",
                border: `0.5px solid ${BD}`,
                borderRadius: RLG,
                padding: "18px 20px",
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: K9, marginBottom: 4 }}>
                Make a decision
              </div>
              <div style={{ fontSize: 12, color: K5, marginBottom: 16, lineHeight: 1.5 }}>
                Approve or decline the application. The applicant will be notified.
              </div>

              {/* Approve section */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={inp}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>End date (optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={inp}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Rent amount (KES)</label>
                  <input
                    type="number"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    style={inp}
                    placeholder="e.g. 22000"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={saving}
                  style={{
                    width: "100%",
                    height: 40,
                    background: saving ? K1 : G7,
                    color: saving ? K5 : "#fff",
                    border: "none",
                    borderRadius: RMD,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: saving ? "default" : "pointer",
                    fontFamily: "inherit",
                    transition: "background 0.15s",
                  }}
                >
                  {saving ? "Saving…" : "Approve application"}
                </button>
              </div>

              {/* Divider */}
              <div style={{ borderTop: `0.5px solid ${BD}`, marginBottom: 12 }} />

              {/* Decline + Message */}
              <button
                type="button"
                onClick={handleReject}
                disabled={saving}
                style={{
                  width: "100%",
                  height: 38,
                  background: R0,
                  color: R6,
                  border: `0.5px solid ${R3}`,
                  borderRadius: RMD,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: saving ? "default" : "pointer",
                  fontFamily: "inherit",
                  marginBottom: 8,
                  transition: "all 0.15s",
                }}
              >
                Decline application
              </button>
              <button
                type="button"
                onClick={() => showToast("Opening messages…")}
                style={{
                  width: "100%",
                  height: 36,
                  background: "#fff",
                  color: K7,
                  border: `0.5px solid ${BDM}`,
                  borderRadius: RMD,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                Message applicant
              </button>
            </div>
          )}

          {/* Applied unit card */}
          {unit && (
            <div style={card}>
              <div style={cardTitle}>Applied unit</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 7, borderBottom: `0.5px solid ${BD}` }}>
                  <span style={{ fontSize: 13, color: K5 }}>Unit</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: K9 }}>Unit {unit.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 7, borderBottom: `0.5px solid ${BD}` }}>
                  <span style={{ fontSize: 13, color: K5 }}>Type</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: K9 }}>
                    {unit.bedrooms}BR / {unit.bathrooms}BA
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: K5 }}>Monthly rent</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: G7 }}>
                    KES {Number(unit.price).toLocaleString()}/mo
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Lease created confirmation */}
          {isApproved && (
            <div
              style={{
                background: G1,
                border: `0.5px solid #BBF7D0`,
                borderRadius: RLG,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#085041" strokeWidth={2.5} strokeLinecap="round">
                <polyline points="20,6 9,17 4,12" />
              </svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#085041" }}>Lease created</div>
                <div style={{ fontSize: 12, color: "#065f46", marginTop: 2 }}>
                  Application approved and lease generated.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: K9,
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 10,
            fontSize: 13,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
