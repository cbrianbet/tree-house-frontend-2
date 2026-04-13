"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchPublicUnit } from "@/lib/api/saved-searches";
import { apiMediaUrl } from "@/lib/api/mediaUrl";
import { createApplication } from "@/lib/api/properties";
import { useAuth } from "@/context/AuthContext";
import { ROLE_TENANT } from "@/constants/roles";
import type { PublicUnit } from "@/types/api";

function fmtMoney(v: string) {
  return `KES ${Number(v).toLocaleString("en-KE")}`;
}

export default function ApplyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [unit, setUnit] = useState<PublicUnit | null>(null);
  const [loadingUnit, setLoadingUnit] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchPublicUnit(Number(id))
      .then((u) => { if (!u) setNotFound(true); else setUnit(u); })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingUnit(false));
  }, [id]);

  // Redirect non-tenants back
  useEffect(() => {
    if (user && user.role !== ROLE_TENANT) {
      router.replace(`/units/${id}`);
    }
  }, [user, id, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!unit) return;
    setSubmitting(true);
    setError(null);
    try {
      await createApplication({ unit: unit.id, message });
      setSubmitted(true);
    } catch {
      setError("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingUnit) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 32 }}>
        <style>{`
          @keyframes ap-shimmer {
            from { background-position: -700px 0; }
            to   { background-position:  700px 0; }
          }
          .ap-shimmer {
            background: linear-gradient(90deg, #F3F4F6 25%, #E9EBEE 50%, #F3F4F6 75%);
            background-size: 1400px 100%;
            animation: ap-shimmer 1.5s infinite linear;
          }
        `}</style>
        {[56, 180, 260].map((h, i) => (
          <div key={i} className="ap-shimmer" style={{ height: h, borderRadius: 14 }} />
        ))}
      </div>
    );
  }

  if (notFound || !unit) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <p style={{ fontWeight: 600, color: "#374151", marginBottom: 8 }}>Unit not found</p>
        <button onClick={() => router.back()} style={{ fontSize: "0.875rem", color: "#0E7F71", background: "none", border: "none", cursor: "pointer" }}>← Go back</button>
      </div>
    );
  }

  if (unit.is_occupied) {
    return (
      <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center", padding: "0 16px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg viewBox="0 0 20 20" fill="none" style={{ width: 24, height: 24 }}>
            <circle cx="10" cy="10" r="9" stroke="#DC2626" strokeWidth="1.6" />
            <path d="M7 7l6 6M13 7l-6 6" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1C1917", marginBottom: 8 }}>Unit not available</h2>
        <p style={{ fontSize: "0.875rem", color: "#6B7280", marginBottom: 24 }}>This unit is currently occupied and not accepting applications.</p>
        <Link href={`/units/${id}`} style={{ fontSize: "0.875rem", color: "#0E7F71", fontWeight: 600, textDecoration: "none" }}>← Back to listing</Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <>
        <style>{`
          @keyframes ap-scale-in {
            from { opacity: 0; transform: scale(0.92); }
            to   { opacity: 1; transform: scale(1); }
          }
          .ap-success-card { animation: ap-scale-in 0.35s ease-out; }
          .ap-view-apps:hover { background: #0D6B5F !important; }
        `}</style>
        <div style={{ maxWidth: 520, margin: "40px auto", padding: "0 16px" }}>
          <div className="ap-success-card" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 20, padding: "48px 40px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            {/* Checkmark */}
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 30, height: 30 }}>
                <path d="M5 12l5 5L19 7" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1C1917", marginBottom: 8, letterSpacing: "-0.02em" }}>Application submitted!</h2>
            <p style={{ fontSize: "0.9rem", color: "#6B7280", lineHeight: 1.6, marginBottom: 6 }}>
              Your application for <strong style={{ color: "#374151" }}>{unit.property.name}</strong>
              {unit.unit_number && <> · Unit {unit.unit_number}</>} has been received.
            </p>
            <p style={{ fontSize: "0.85rem", color: "#9CA3AF", lineHeight: 1.6, marginBottom: 32 }}>
              The landlord will review your application and get back to you. You can track the status in your applications.
            </p>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/applications"
                className="ap-view-apps"
                style={{ padding: "11px 24px", background: "#0E7F71", color: "#FFFFFF", borderRadius: 10, fontWeight: 700, fontSize: "0.875rem", textDecoration: "none", transition: "background 0.15s" }}
              >
                View my applications
              </Link>
              <Link
                href="/saved-searches"
                style={{ padding: "11px 24px", background: "#F9F7F3", color: "#374151", border: "1px solid #EEE8E0", borderRadius: 10, fontWeight: 600, fontSize: "0.875rem", textDecoration: "none" }}
              >
                Browse more units
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const firstImg = unit.images?.[0]?.image;
  const thumb = firstImg ? apiMediaUrl(firstImg) : null;

  return (
    <>
      <style>{`
        @keyframes ap-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ap-card { animation: ap-in 0.3s ease-out; }
        .ap-textarea {
          width: 100%;
          min-height: 140px;
          padding: 12px 14px;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          font-size: 0.9rem;
          color: #1C1917;
          line-height: 1.6;
          resize: vertical;
          outline: none;
          background: #FAFAFA;
          font-family: inherit;
          transition: border-color 0.15s, background 0.15s;
          box-sizing: border-box;
        }
        .ap-textarea:focus { border-color: #0E7F71; background: #FFFFFF; }
        .ap-textarea::placeholder { color: #C4CACC; }
        .ap-submit:hover:not(:disabled) { background: #0D6B5F !important; }
        .ap-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .ap-back:hover { color: #374151 !important; }
      `}</style>

      <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 48 }}>
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="ap-back"
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "0.82rem", fontWeight: 500, padding: "0 0 20px", transition: "color 0.15s" }}
        >
          <svg viewBox="0 0 16 16" fill="none" style={{ width: 12, height: 12 }}>
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to listing
        </button>

        {/* Unit summary card */}
        <div
          className="ap-card"
          style={{ background: "#FFFFFF", border: "1px solid #EEE8E0", borderRadius: 16, overflow: "hidden", marginBottom: 20, display: "flex", alignItems: "stretch", gap: 0 }}
        >
          {thumb ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={thumb} alt={unit.property.name} style={{ width: 100, height: 90, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 100, height: 90, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 32 24" fill="none" style={{ width: 28, height: 22 }}>
                <rect x="1" y="1" width="30" height="22" rx="3" stroke="#E5E7EB" strokeWidth="1.5" />
                <circle cx="10" cy="8" r="3.5" stroke="#E5E7EB" strokeWidth="1.5" />
                <path d="M1 17l7-6 5 5 4-4 5 5 4-3" stroke="#E5E7EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          <div style={{ padding: "14px 18px", flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1C1917", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {unit.property.name}
              {unit.unit_number && <span style={{ color: "#6B7280", fontWeight: 500 }}> · Unit {unit.unit_number}</span>}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 8 }}>{unit.property.address}, {unit.property.city}</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", color: "#374151" }}>{unit.bedrooms} bd · {unit.bathrooms} ba</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0E7F71" }}>{fmtMoney(unit.rent_amount)}<span style={{ fontSize: "0.72rem", fontWeight: 400, color: "#9CA3AF" }}>/mo</span></span>
            </div>
          </div>
        </div>

        {/* Application form */}
        <form
          onSubmit={handleSubmit}
          className="ap-card"
          style={{ background: "#FFFFFF", border: "1px solid #EEE8E0", borderRadius: 16, padding: "28px 28px 24px" }}
        >
          <h1 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#1C1917", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            Apply for this unit
          </h1>
          <p style={{ fontSize: "0.82rem", color: "#9CA3AF", margin: "0 0 24px", lineHeight: 1.5 }}>
            Tell the landlord a little about yourself and why you&apos;re interested.
          </p>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#374151", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
              Message to landlord <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <textarea
              className="ap-textarea"
              placeholder="Introduce yourself, your employment status, move-in date, or anything else you'd like the landlord to know…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              minLength={20}
            />
            <div style={{ fontSize: "0.75rem", color: "#C4CACC", marginTop: 5, textAlign: "right" }}>
              {message.length} characters {message.length < 20 && message.length > 0 && <span style={{ color: "#F59E0B" }}>(min 20)</span>}
            </div>
          </div>

          {error && (
            <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: "0.83rem", color: "#B91C1C", marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={submitting || message.trim().length < 20}
              className="ap-submit"
              style={{ padding: "11px 28px", background: "#0E7F71", color: "#FFFFFF", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", transition: "background 0.15s", display: "flex", alignItems: "center", gap: 8 }}
            >
              {submitting ? (
                <>
                  <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14, animation: "ap-spin 0.8s linear infinite" }}>
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                    <path d="M8 2a6 6 0 0 1 6 6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Submitting…
                </>
              ) : "Submit application"}
            </button>
            <Link
              href={`/units/${id}`}
              style={{ fontSize: "0.85rem", color: "#9CA3AF", fontWeight: 500, textDecoration: "none" }}
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Info note */}
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#F9F7F3", border: "1px solid #EEE8E0", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14, marginTop: 1, flexShrink: 0, color: "#9CA3AF" }}>
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 7v5M8 5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <p style={{ fontSize: "0.78rem", color: "#9CA3AF", margin: 0, lineHeight: 1.6 }}>
            You can only submit one active application per unit. The landlord will review your application and contact you directly. You can withdraw your application at any time from the <Link href="/applications" style={{ color: "#0E7F71", textDecoration: "none", fontWeight: 600 }}>Applications</Link> page.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ap-spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
