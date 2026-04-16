"use client";
import React, { useEffect, useState, FormEvent, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { DM_Sans, DM_Mono } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import {
  getRequest,
  getRequestTimeline,
  updateRequestStatus,
  listBids,
  createBid,
  updateBidStatus,
  listNotes,
  createNote,
  listImages,
  uploadImage,
} from "@/lib/api/maintenance";
import { listProperties, listUnits } from "@/lib/api/properties";
import { getUserProfile } from "@/lib/api/auth";
import type {
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceTimelineEvent,
  Bid,
  Note,
  MaintenanceImage,
  Property,
  Unit,
} from "@/types/api";
import { ROLE_ADMIN, ROLE_LANDLORD, ROLE_ARTISAN } from "@/constants/roles";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";
import {
  FD,
  FINANCE_FIELD_CLASS,
  financeGbtn,
  financePbtn,
} from "@/constants/financeDesign";
import PageLoader from "@/components/ui/PageLoader";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

function priorityAccent(p: MaintenancePriority): string {
  if (p === "urgent") return FD.r6;
  if (p === "high" || p === "medium") return FD.a5;
  if (p === "low") return "#378ADD";
  return FD.g5;
}

function priorityBadge(p: string) {
  const urgent = p === "urgent";
  const low = p === "low";
  const bg = urgent ? FD.r0 : low ? FD.b0 : FD.a0;
  const color = urgent ? FD.r6 : low ? FD.b8 : FD.a7;
  const dotBg = urgent ? FD.r6 : low ? "#378ADD" : FD.a5;
  const label = p.charAt(0).toUpperCase() + p.slice(1);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: bg, color }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: dotBg }} />
      {label}
    </span>
  );
}

function statusBadge(status: string, bidCount?: number) {
  let bg: string, color: string, dotBg: string, label: string;
  switch (status) {
    case "submitted":
    case "open":
      bg = FD.a0; color = FD.a7; dotBg = FD.a5; label = `Open${bidCount ? ` · ${bidCount} bid${bidCount !== 1 ? "s" : ""}` : ""}`;
      break;
    case "assigned":
    case "in_progress":
      bg = FD.b0; color = FD.b8; dotBg = "#378ADD"; label = "In progress";
      break;
    case "completed":
      bg = FD.g1; color = FD.activeBadgeText; dotBg = FD.g5; label = "Resolved";
      break;
    case "cancelled":
      bg = FD.k0; color = FD.k5; dotBg = FD.k2; label = "Cancelled";
      break;
    case "rejected":
      bg = FD.r0; color = FD.r6; dotBg = FD.r6; label = "Rejected";
      break;
    default:
      bg = FD.k0; color = FD.k5; dotBg = FD.k2; label = status.replace(/_/g, " ");
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: bg, color }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: dotBg }} />
      {label}
    </span>
  );
}

function getAvailableTransitions(
  status: MaintenanceStatus,
  roleId: number,
  isSubmitter: boolean,
  isAssignedArtisan: boolean,
): { label: string; value: MaintenanceStatus; danger?: boolean }[] {
  const t: { label: string; value: MaintenanceStatus; danger?: boolean }[] = [];
  if (status === "submitted" && [ROLE_LANDLORD, ROLE_ADMIN].includes(roleId))
    t.push({ label: "Open", value: "open" });
  if (status === "assigned" && isAssignedArtisan)
    t.push({ label: "Start Work", value: "in_progress" });
  if (status === "in_progress" && isSubmitter)
    t.push({ label: "Mark resolved", value: "completed" });
  if (["submitted", "open"].includes(status) && isSubmitter)
    t.push({ label: "Cancel", value: "cancelled", danger: true });
  if ([ROLE_LANDLORD, ROLE_ADMIN].includes(roleId))
    t.push({ label: "Reject", value: "rejected", danger: true });
  return t;
}

const CARD: React.CSSProperties = {
  background: FD.wh,
  border: `0.5px solid ${FD.bd}`,
  borderRadius: FD.rlg,
  padding: "16px 18px",
};

const CARD_TITLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: ".4px",
  textTransform: "uppercase",
  color: FD.k5,
  marginBottom: 12,
};

export default function MaintenanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const requestId = Number(params.id);
  const font = dmSans.style.fontFamily;
  const mono = dmMono.style.fontFamily;

  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [images, setImages] = useState<MaintenanceImage[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showBidForm, setShowBidForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());
  const [timeline, setTimeline] = useState<MaintenanceTimelineEvent[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [req, b, n, img, props, tl] = await Promise.all([
        getRequest(requestId),
        listBids(requestId).catch(() => []),
        listNotes(requestId).catch(() => []),
        listImages(requestId).catch(() => []),
        listProperties().catch(() => []),
        getRequestTimeline(requestId).catch(() => []),
      ]);
      setRequest(req);
      setBids(b);
      setNotes(n);
      setImages(img);
      setProperties(props);
      setTimeline(tl);
      if (req.property) {
        listUnits(req.property).then(setUnits).catch(() => setUnits([]));
      }

      const userIds = new Set<number>();
      userIds.add(req.submitted_by);
      if (req.assigned_to != null) userIds.add(req.assigned_to);
      b.forEach((bid) => { if (!bid.artisan_name) userIds.add(bid.artisan); });
      n.forEach((note) => userIds.add(note.author));

      const nameResults = await Promise.all(
        [...userIds].map((uid) =>
          getUserProfile(uid)
            .then((p) => {
              const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || `User #${uid}`;
              return [uid, name] as [number, string];
            })
            .catch(() => null),
        ),
      );
      const names = new Map<number, string>();
      nameResults.forEach((r) => { if (r) names.set(r[0], r[1]); });
      b.forEach((bid) => { if (bid.artisan_name) names.set(bid.artisan, bid.artisan_name); });
      setUserNames(names);
    } catch {
      setError("Failed to load request.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const propName = useMemo(() => {
    const m = new Map<number, string>();
    properties.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [properties]);

  const unitName = useMemo(() => {
    const m = new Map<number, string>();
    units.forEach((u) => m.set(u.id, u.name));
    return m;
  }, [units]);

  async function handleStatusChange(status: MaintenanceStatus) {
    setSubmitting(true);
    try {
      const updated = await updateRequestStatus(requestId, status);
      setRequest(updated);
    } catch {
      setError("Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateBid(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createBid(requestId, {
        proposed_price: fd.get("proposed_price") as string,
        message: fd.get("message") as string,
      });
      setShowBidForm(false);
      await fetchAll();
    } catch {
      setError("Failed to create bid.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBidAction(bidId: number, status: "accepted" | "rejected") {
    setSubmitting(true);
    try {
      await updateBidStatus(requestId, bidId, status);
      await fetchAll();
    } catch {
      setError(`Failed to ${status} bid.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setSubmitting(true);
    try {
      await createNote(requestId, noteText);
      setNoteText("");
      await fetchAll();
    } catch {
      setError("Failed to add note.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitting(true);
    try {
      await uploadImage(requestId, file);
      await fetchAll();
    } catch {
      setError("Failed to upload image.");
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  if (!request) {
    return (
      <div className={dmSans.className} style={{ fontFamily: font, padding: 48, textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: FD.k7, marginBottom: 4 }}>Not found</div>
        <div style={{ fontSize: 13, color: FD.k5 }}>Maintenance request not found.</div>
      </div>
    );
  }

  const isSubmitter = user?.pk === request.submitted_by;
  const isAssignedArtisan = user?.role === ROLE_ARTISAN && user.pk === request.assigned_to;
  const transitions = user
    ? getAvailableTransitions(request.status, user.role, isSubmitter, isAssignedArtisan)
    : [];
  const accentColor = priorityAccent(request.priority);
  const pLabel = propName.get(request.property) ?? `Property #${request.property}`;
  const uLabel = request.unit != null ? (unitName.get(request.unit) ?? `Unit #${request.unit}`) : null;
  const catLabel = request.category.charAt(0).toUpperCase() + request.category.slice(1);
  const pendingBids = bids.filter((b) => b.status === "pending");
  const userName = (id: number) => userNames.get(id) ?? `User #${id}`;
  const userInitials = (id: number) => {
    const name = userNames.get(id);
    if (!name) return `#${id}`;
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={`${dmSans.className} -m-4 md:-m-6`}
      style={{ fontFamily: font, fontSize: 14, color: FD.k9, background: FD.surf, minHeight: "calc(100vh - 80px)" }}
    >
      <FinancePageTopBar
        crumbs={[
          { label: "Maintenance", href: "/maintenance" },
          { label: `MNT-${request.id} — ${request.title.length > 30 ? `${request.title.slice(0, 30)}…` : request.title}` },
        ]}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {transitions.map((t) => (
              <button
                key={t.value}
                type="button"
                disabled={submitting}
                onClick={() => handleStatusChange(t.value)}
                className="transition-colors hover:opacity-90"
                style={t.danger
                  ? { ...financeGbtn(font), color: FD.r6, borderColor: FD.r3, opacity: submitting ? 0.65 : 1 }
                  : { ...financeGbtn(font), opacity: submitting ? 0.65 : 1 }}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              className="transition-colors hover:bg-[#085041]"
              style={financePbtn(font)}
              onClick={() => router.push("/messages")}
            >
              Message tenant
            </button>
          </div>
        }
      />

      <div style={{ padding: "22px 24px" }}>
        {/* Error banner */}
        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 14px",
              borderRadius: FD.rmd,
              background: FD.r0,
              color: FD.r6,
              fontSize: 13,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={FD.r6} strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Request hero */}
        <div
          style={{
            background: FD.wh,
            border: `0.5px solid ${FD.bd}`,
            borderLeft: `4px solid ${accentColor}`,
            borderRadius: FD.rxl,
            padding: "20px 22px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: FD.k5, fontFamily: mono, marginBottom: 4 }}>
                MNT-{request.id} · {catLabel} · {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
              </div>
              <div style={{ fontSize: 19, fontWeight: 500, color: FD.k9, marginBottom: 4 }}>
                {request.title}
              </div>
              <div style={{ fontSize: 13, color: FD.k5 }}>
                {uLabel ? `${uLabel} · ` : ""}{pLabel} · Reported by {userName(request.submitted_by)} · {new Date(request.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              {priorityBadge(request.priority)}
              {statusBadge(request.status, pendingBids.length)}
            </div>
          </div>
          <div style={{ fontSize: 13, color: FD.k7, lineHeight: 1.6, paddingTop: 12, borderTop: `0.5px solid ${FD.bd}` }}>
            {request.description}
          </div>
        </div>

        {/* Two-column layout */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}
          className="max-lg:grid-cols-1"
        >
          {/* LEFT column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Photos card */}
            <div style={CARD}>
              <div style={CARD_TITLE}>Photos from tenant</div>
              {images.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {images.map((img) => (
                    <a
                      key={img.id}
                      href={`${process.env.NEXT_PUBLIC_API_BASE_URL}${img.image}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "block", height: 100, borderRadius: FD.rmd, overflow: "hidden", border: `0.5px solid ${FD.bd}` }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${img.image}`}
                        alt={`Maintenance image ${img.id}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[{ bg: "#D4E8D0", stroke: FD.g7 }, { bg: "#D0DFED", stroke: "#185FA5" }, { bg: "#EDE0D0", stroke: "#993C1D" }].map((c, i) => (
                    <div
                      key={i}
                      style={{
                        height: 100,
                        borderRadius: FD.rmd,
                        background: c.bg,
                        border: `0.5px solid ${FD.bd}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth={1.2} strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ fontSize: 12, color: FD.k5 }}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#F2F1EB] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#3D3D3D] hover:file:bg-[#E8E7E1]"
                />
              </div>
            </div>

            {/* Bids card */}
            <div style={CARD}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ ...CARD_TITLE, marginBottom: 0 }}>Artisan bids ({bids.length})</div>
                {user?.role === ROLE_ARTISAN && ["submitted", "open"].includes(request.status) && (
                  <button
                    type="button"
                    onClick={() => setShowBidForm(!showBidForm)}
                    style={{
                      height: 28,
                      padding: "0 10px",
                      borderRadius: FD.rsm,
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: font,
                      border: `0.5px solid ${FD.bdm}`,
                      background: FD.wh,
                      color: FD.k7,
                    }}
                  >
                    {showBidForm ? "Cancel" : "Place bid"}
                  </button>
                )}
                {[ROLE_LANDLORD, ROLE_ADMIN].includes(user?.role ?? 0) && (
                  <button
                    type="button"
                    style={{
                      height: 28,
                      padding: "0 10px",
                      borderRadius: FD.rsm,
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: font,
                      border: `0.5px solid ${FD.bdm}`,
                      background: FD.wh,
                      color: FD.k7,
                    }}
                  >
                    Find more artisans
                  </button>
                )}
              </div>

              {/* Bid form */}
              {showBidForm && (
                <form
                  onSubmit={handleCreateBid}
                  style={{
                    marginBottom: 14,
                    padding: "12px 14px",
                    background: FD.k0,
                    borderRadius: 10,
                    border: `0.5px solid ${FD.bdm}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div>
                    <label htmlFor="bid_price" style={{ display: "block", fontSize: 11, fontWeight: 500, color: FD.k5, marginBottom: 4, letterSpacing: "0.4px", textTransform: "uppercase" as const }}>
                      Proposed price
                    </label>
                    <input
                      id="bid_price"
                      name="proposed_price"
                      type="text"
                      required
                      placeholder="8500.00"
                      className={FINANCE_FIELD_CLASS}
                      style={{ width: "100%", height: 36, padding: "0 10px", border: `0.5px solid ${FD.bdm}`, borderRadius: FD.rmd, fontSize: 13, fontFamily: mono, color: FD.k9, background: FD.wh, outline: "none" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="bid_message" style={{ display: "block", fontSize: 11, fontWeight: 500, color: FD.k5, marginBottom: 4, letterSpacing: "0.4px", textTransform: "uppercase" as const }}>
                      Message
                    </label>
                    <input
                      id="bid_message"
                      name="message"
                      type="text"
                      required
                      placeholder="I can fix this within 2 days…"
                      className={FINANCE_FIELD_CLASS}
                      style={{ width: "100%", height: 36, padding: "0 10px", border: `0.5px solid ${FD.bdm}`, borderRadius: FD.rmd, fontSize: 13, fontFamily: font, color: FD.k9, background: FD.wh, outline: "none" }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="transition-colors hover:bg-[#085041]"
                    style={{
                      height: 32,
                      padding: "0 14px",
                      background: FD.g7,
                      color: "#fff",
                      border: "none",
                      borderRadius: FD.rmd,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: submitting ? "not-allowed" : "pointer",
                      opacity: submitting ? 0.65 : 1,
                      fontFamily: font,
                      alignSelf: "flex-start",
                    }}
                  >
                    {submitting ? "Submitting…" : "Submit bid"}
                  </button>
                </form>
              )}

              {/* Bid list */}
              {bids.length === 0 ? (
                <p style={{ fontSize: 13, color: FD.k5, textAlign: "center", padding: "8px 0" }}>
                  No bids yet.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {bids.map((b) => {
                    const accepted = b.status === "accepted";
                    const rejected = b.status === "rejected";
                    return (
                      <div
                        key={b.id}
                        style={{
                          background: accepted ? FD.g1 : FD.wh,
                          border: `0.5px solid ${accepted ? FD.g3 : FD.bd}`,
                          borderRadius: FD.rlg,
                          padding: "14px 16px",
                          transition: "all .15s",
                        }}
                      >
                        {/* Bid header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: accepted ? FD.g5 : "#378ADD",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 500,
                              color: "#fff",
                              flexShrink: 0,
                            }}
                          >
                            {userInitials(b.artisan)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: FD.k9 }}>
                              {userName(b.artisan)}
                            </div>
                            {(b.artisan_trade || b.artisan_rating || b.artisan_job_count != null) && (
                              <div style={{ fontSize: 11, color: FD.k5, marginTop: 1, display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {b.artisan_trade && <span>{b.artisan_trade}</span>}
                                {b.artisan_rating && <span>★ {b.artisan_rating}</span>}
                                {b.artisan_job_count != null && <span>{b.artisan_job_count} jobs</span>}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 17, fontWeight: 500, color: accepted ? FD.g7 : FD.k9, fontFamily: mono, marginLeft: "auto" }}>
                            KES {b.proposed_price}
                          </div>
                        </div>

                        {/* Bid message */}
                        <div style={{ fontSize: 12, color: FD.k7, lineHeight: 1.5, marginBottom: 10 }}>
                          {b.message}
                        </div>

                        {/* Bid status / actions */}
                        {b.status !== "pending" ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "3px 9px",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 500,
                                background: accepted ? "#dcfce7" : rejected ? FD.r0 : FD.k0,
                                color: accepted ? "#15803d" : rejected ? FD.r6 : FD.k5,
                              }}
                            >
                              {accepted ? "Accepted" : rejected ? "Declined" : b.status}
                            </span>
                          </div>
                        ) : isSubmitter ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleBidAction(b.id, "accepted")}
                              className="transition-colors hover:bg-[#085041]"
                              style={{
                                flex: 1,
                                height: 32,
                                borderRadius: FD.rmd,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: submitting ? "not-allowed" : "pointer",
                                fontFamily: font,
                                background: FD.g7,
                                color: "#fff",
                                border: `0.5px solid ${FD.g7}`,
                              }}
                            >
                              Accept bid
                            </button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleBidAction(b.id, "rejected")}
                              className="transition-colors hover:bg-[#FCEBEB]"
                              style={{
                                flex: 1,
                                height: 32,
                                borderRadius: FD.rmd,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: submitting ? "not-allowed" : "pointer",
                                fontFamily: font,
                                background: FD.wh,
                                color: FD.r6,
                                border: `0.5px solid ${FD.r3}`,
                              }}
                            >
                              Decline
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notes card */}
            <div style={CARD}>
              <div style={CARD_TITLE}>Landlord notes</div>
              {notes.length > 0 && (
                <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      style={{ padding: "10px 12px", borderRadius: FD.rmd, background: FD.k0, border: `0.5px solid ${FD.bd}` }}
                    >
                      <p style={{ fontSize: 13, color: FD.k7, lineHeight: 1.5 }}>{n.note}</p>
                      <p style={{ marginTop: 4, fontSize: 10, color: FD.k5, fontFamily: mono }}>
                        By {userName(n.author)} · {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                placeholder="Add internal notes about this request…"
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className={FINANCE_FIELD_CLASS}
                style={{
                  width: "100%",
                  height: 80,
                  padding: "10px 12px",
                  background: FD.k0,
                  border: `0.5px solid ${FD.bdm}`,
                  borderRadius: FD.rmd,
                  fontSize: 13,
                  color: FD.k9,
                  fontFamily: font,
                  outline: "none",
                  resize: "none",
                  lineHeight: 1.5,
                }}
              />
              <button
                type="button"
                disabled={submitting || !noteText.trim()}
                onClick={handleAddNote}
                className="transition-colors hover:bg-[#085041]"
                style={{
                  marginTop: 8,
                  height: 32,
                  padding: "0 14px",
                  background: FD.g7,
                  color: "#fff",
                  border: "none",
                  borderRadius: FD.rmd,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: submitting || !noteText.trim() ? "not-allowed" : "pointer",
                  opacity: submitting || !noteText.trim() ? 0.6 : 1,
                  fontFamily: font,
                }}
              >
                Save notes
              </button>
            </div>
          </div>

          {/* RIGHT column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Request details */}
            <div style={CARD}>
              <div style={CARD_TITLE}>Request details</div>
              {([
                ["Request ID", `MNT-${request.id}`, true],
                ["Property", pLabel, false],
                ...(uLabel ? [["Unit", uLabel, true] as const] : []),
                ["Category", catLabel, false],
                ["Priority", null, false, "priority"],
                ["Status", null, false, "status"],
                ["Reported by", userName(request.submitted_by), false],
                ["Reported at", new Date(request.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), false],
                ["Bids received", String(bids.length), true],
              ] as const).map(([k, v, isMono, special], idx, arr) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 0",
                    borderBottom: idx < arr.length - 1 ? `0.5px solid ${FD.bd}` : "none",
                  }}
                >
                  <span style={{ fontSize: 13, color: FD.k5 }}>{k}</span>
                  {special === "priority" ? (
                    <span>{priorityBadge(request.priority)}</span>
                  ) : special === "status" ? (
                    <span>{statusBadge(request.status)}</span>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 500, color: FD.k9, ...(isMono ? { fontFamily: mono } : {}) }}>{v}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Reported by */}
            <div style={CARD}>
              <div style={CARD_TITLE}>Reported by</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#D85A30",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {userInitials(request.submitted_by)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: FD.k9 }}>
                    {userName(request.submitted_by)}
                  </div>
                  <div style={{ fontSize: 11, color: FD.k5, fontFamily: mono }}>
                    Tenant
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/messages")}
                style={{
                  width: "100%",
                  height: 32,
                  borderRadius: FD.rmd,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: font,
                  border: `0.5px solid ${FD.bdm}`,
                  background: FD.wh,
                  color: FD.k7,
                }}
              >
                Message tenant
              </button>
            </div>

            {/* Timeline */}
            <div style={CARD}>
              <div style={CARD_TITLE}>Timeline</div>
              {timeline.length > 0 ? (
                timeline.map((evt, i) => {
                  const dotColor =
                    evt.event_type === "request_submitted" ? FD.r6
                    : evt.event_type === "bid_submitted" ? "#378ADD"
                    : evt.event_type === "notification_sent" ? FD.a5
                    : FD.g5;
                  return (
                    <TimelineItem
                      key={i}
                      dotColor={dotColor}
                      text={evt.description}
                      time={evt.created_at}
                      mono={mono}
                      showLine={i < timeline.length - 1}
                    />
                  );
                })
              ) : (
                <>
                  <TimelineItem
                    dotColor={FD.r6}
                    text={`Request logged by ${userName(request.submitted_by)}`}
                    time={request.created_at}
                    mono={mono}
                    showLine={bids.length > 0 || request.assigned_to != null}
                  />
                  {bids.map((b, i) => (
                    <TimelineItem
                      key={b.id}
                      dotColor="#378ADD"
                      text={`${userName(b.artisan)} submitted a bid — KES ${b.proposed_price}`}
                      time={b.created_at}
                      mono={mono}
                      showLine={i < bids.length - 1 || request.assigned_to != null}
                    />
                  ))}
                  {request.assigned_to != null && (
                    <TimelineItem
                      dotColor={FD.g5}
                      text={`Assigned to ${userName(request.assigned_to)}`}
                      time={request.updated_at}
                      mono={mono}
                      showLine={false}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  dotColor,
  text,
  time,
  mono,
  showLine,
}: {
  dotColor: string;
  text: string;
  time: string;
  mono: string;
  showLine: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: showLine ? `0.5px solid ${FD.bd}` : "none" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 3 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
        {showLine && <div style={{ width: 1, background: FD.bd, flex: 1, marginTop: 3, minHeight: 14 }} />}
      </div>
      <div>
        <div style={{ fontSize: 13, color: FD.k9, lineHeight: 1.4 }}>{text}</div>
        <div style={{ fontSize: 10, color: FD.k5, marginTop: 2, fontFamily: mono }}>
          {new Date(time).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).toUpperCase()}
        </div>
      </div>
    </div>
  );
}
