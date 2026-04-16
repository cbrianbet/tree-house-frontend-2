"use client";

import React, { useEffect, useMemo, useState, FormEvent } from "react";
import { DM_Mono, DM_Sans } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import {
  listDisputes,
  createDispute,
  getDispute,
  updateDisputeStatus,
  listDisputeMessages,
  postDisputeMessage,
} from "@/lib/api/disputes";
import { listProperties, listUnits } from "@/lib/api/properties";
import type { Dispute, DisputeMessage, DisputeType, Property, Unit } from "@/types/api";
import Alert from "@/components/ui/alert/Alert";
import {
  FD,
  FINANCE_FIELD_CLASS,
  financeFieldInputStyle,
  financeFieldLabelStyle,
  financeFieldSelectStyle,
  financeFieldTextAreaStyle,
  financeGbtn,
  financePbtn,
} from "@/constants/financeDesign";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";

import { ROLE_ADMIN, ROLE_TENANT, ROLE_LANDLORD } from "@/constants/roles";
import PageLoader from "@/components/ui/PageLoader";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

const disputeTypes: DisputeType[] = ["rent", "maintenance", "noise", "damage", "lease", "other"];

function disputeStatusStyle(status: string): { bg: string; color: string; label: string } {
  switch (status) {
    case "open":
      return { bg: FD.r0, color: FD.r6, label: "Open" };
    case "under_review":
      return { bg: FD.a0, color: FD.a7, label: "Mediation" };
    case "resolved":
      return { bg: FD.g1, color: FD.activeBadgeText, label: "Resolved" };
    case "closed":
      return { bg: FD.k0, color: FD.k5, label: "Closed" };
    default:
      return { bg: FD.k0, color: FD.k5, label: status.replace(/_/g, " ") };
  }
}

function disputeTypeBadge(t: string): { bg: string; color: string; label: string } {
  const label = t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  switch (t) {
    case "maintenance":
      return { bg: "#F3E8FF", color: "#4B0082", label };
    case "rent":
      return { bg: FD.r0, color: FD.r6, label };
    case "noise":
      return { bg: FD.b0, color: FD.b8, label };
    default:
      return { bg: FD.a0, color: FD.a7, label };
  }
}

function StatusBadge({ status }: { status: string }) {
  const s = disputeStatusStyle(status);
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {s.label}
    </span>
  );
}

const card: React.CSSProperties = {
  border: `0.5px solid ${FD.bd}`,
  borderRadius: FD.rlg,
  backgroundColor: FD.wh,
  padding: "16px 18px",
  marginBottom: 14,
};

const cardTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: ".4px",
  textTransform: "uppercase",
  color: FD.k5,
  marginBottom: 12,
};

export default function DisputesPage() {
  const { user } = useAuth();
  const sans = dmSans.style.fontFamily;
  const mono = dmMono.style.fontFamily;

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createPropertyId, setCreatePropertyId] = useState("");
  const [createUnits, setCreateUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [detailPropertyLabel, setDetailPropertyLabel] = useState<string>("");
  const [detailUnitLabel, setDetailUnitLabel] = useState<string>("");
  const [unitsByProperty, setUnitsByProperty] = useState<Record<number, Unit[]>>({});
  const [statusTabFilter, setStatusTabFilter] = useState<string>("all");

  const [activeDispute, setActiveDispute] = useState<Dispute | null>(null);
  const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMsg, setNewMsg] = useState("");

  const canCreate =
    user?.role === ROLE_ADMIN || user?.role === ROLE_TENANT || user?.role === ROLE_LANDLORD;

  const stats = useMemo(() => {
    const open = disputes.filter((d) => d.status === "open").length;
    const review = disputes.filter((d) => d.status === "under_review").length;
    const done = disputes.filter((d) => d.status === "resolved" || d.status === "closed").length;
    return { open, review, done };
  }, [disputes]);

  const filteredDisputes = useMemo(() => {
    if (statusTabFilter === "all") return disputes;
    if (statusTabFilter === "open") return disputes.filter((d) => d.status === "open");
    if (statusTabFilter === "in_progress") return disputes.filter((d) => d.status === "under_review");
    if (statusTabFilter === "resolved") return disputes.filter((d) => d.status === "resolved" || d.status === "closed");
    return disputes;
  }, [disputes, statusTabFilter]);

  useEffect(() => {
    async function load() {
      try {
        const [d, p] = await Promise.all([listDisputes(), listProperties().catch(() => [])]);
        setDisputes(d);
        setProperties(p);
      } catch {
        setError("Failed to load disputes.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const ids = [...new Set(disputes.map((d) => d.property))];
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        ids.map(async (propertyId) => {
          try {
            return [propertyId, await listUnits(propertyId)] as const;
          } catch {
            return [propertyId, [] as Unit[]] as const;
          }
        })
      );
      if (cancelled) return;
      setUnitsByProperty((prev) => {
        const next = { ...prev };
        for (const [pid, units] of entries) next[pid] = units;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [disputes]);

  useEffect(() => {
    if (!showCreate || properties.length === 0) return;
    if (!createPropertyId) {
      setCreatePropertyId(String(properties[0].id));
    }
  }, [showCreate, properties, createPropertyId]);

  useEffect(() => {
    async function loadUnits() {
      if (!showCreate || !createPropertyId) {
        setCreateUnits([]);
        return;
      }
      setUnitsLoading(true);
      try {
        const units = await listUnits(Number(createPropertyId));
        setCreateUnits(units);
      } catch {
        setCreateUnits([]);
      } finally {
        setUnitsLoading(false);
      }
    }
    loadUnits();
  }, [showCreate, createPropertyId]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const dispute = await createDispute({
        property: Number(createPropertyId || fd.get("property")),
        unit: fd.get("unit") ? parseInt(fd.get("unit") as string, 10) : undefined,
        dispute_type: fd.get("dispute_type") as DisputeType,
        title: fd.get("title") as string,
        description: fd.get("description") as string,
      });
      setDisputes((prev) => [dispute, ...prev]);
      setShowCreate(false);
      setSuccess("Dispute created.");
    } catch {
      setError("Failed to create dispute.");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(id: number) {
    setMsgLoading(true);
    setError(null);
    try {
      const [d, msgs] = await Promise.all([getDispute(id), listDisputeMessages(id)]);
      setActiveDispute(d);
      setDisputeMessages(msgs);
      const selectedProperty = properties.find((p) => p.id === d.property);
      setDetailPropertyLabel(selectedProperty?.name ?? `Property #${d.property}`);
      if (d.unit != null) {
        let units = unitsByProperty[d.property];
        if (!units?.length) {
          try {
            units = await listUnits(d.property);
            setUnitsByProperty((prev) => ({ ...prev, [d.property]: units! }));
          } catch {
            units = [];
          }
        }
        const selectedUnit = units.find((u) => u.id === d.unit);
        setDetailUnitLabel(selectedUnit?.name ?? `Unit #${d.unit}`);
      } else {
        setDetailUnitLabel("");
      }
    } catch {
      setError("Failed to load dispute details.");
    } finally {
      setMsgLoading(false);
    }
  }

  async function handleStatusChange(status: "under_review" | "resolved" | "closed") {
    if (!activeDispute) return;
    setSubmitting(true);
    try {
      const updated = await updateDisputeStatus(activeDispute.id, status);
      setActiveDispute(updated);
      setDisputes((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setSuccess(`Dispute marked as ${status.replace("_", " ")}.`);
    } catch {
      setError("Failed to update dispute.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeDispute || !newMsg.trim()) return;
    setSubmitting(true);
    try {
      const msg = await postDisputeMessage(activeDispute.id, newMsg.trim());
      setDisputeMessages((prev) => [...prev, msg]);
      setNewMsg("");
    } catch {
      setError("Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (activeDispute) {
    const canMoveToReview =
      activeDispute.status === "open" &&
      (user?.role === ROLE_ADMIN || user?.role === ROLE_LANDLORD);
    const canResolve = activeDispute.status === "under_review" && user?.role === ROLE_ADMIN;
    const canClose =
      (activeDispute.status === "open" || activeDispute.status === "under_review") &&
      activeDispute.created_by === user?.pk;

    const detailTitleShort =
      activeDispute.title.length > 40
        ? `${activeDispute.title.slice(0, 40)}…`
        : activeDispute.title;

    return (
      <div
        className={`${dmSans.className} -m-4 md:-m-6`}
        style={{
          fontFamily: sans,
          background: FD.surf,
          color: FD.k9,
          fontSize: 14,
          minHeight: "calc(100vh - 80px)",
        }}
      >
        <FinancePageTopBar
          crumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Disputes", onClick: () => setActiveDispute(null) },
            { label: `DSP-${activeDispute.id} — ${detailTitleShort}` },
          ]}
          right={
            <>
              <button
                type="button"
                onClick={() => setActiveDispute(null)}
                className="transition-colors hover:bg-[#F2F1EB]"
                style={financeGbtn(sans)}
              >
                ← Back to disputes
              </button>
              {canMoveToReview && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleStatusChange("under_review")}
                  className="transition-colors hover:bg-[#085041]"
                  style={{ ...financePbtn(sans), opacity: submitting ? 0.65 : 1 }}
                >
                  Start mediation
                </button>
              )}
              {canResolve && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleStatusChange("resolved")}
                  className="transition-colors hover:bg-[#085041]"
                  style={{ ...financePbtn(sans), opacity: submitting ? 0.65 : 1 }}
                >
                  Mark resolved
                </button>
              )}
              {canClose && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleStatusChange("closed")}
                  className="transition-colors hover:bg-[#F2F1EB]"
                  style={{ ...financeGbtn(sans), opacity: submitting ? 0.65 : 1 }}
                >
                  Close dispute
                </button>
              )}
            </>
          }
        />

        <div style={{ padding: "22px 24px" }}>
          {error && (
            <div style={{ marginBottom: 14 }}>
              <Alert variant="error" title="Error" message={error} />
            </div>
          )}
          {success && (
            <div style={{ marginBottom: 14 }}>
              <Alert variant="success" title="Success" message={success} />
            </div>
          )}

          {/* Dispute hero */}
          <div
            style={{
              background: FD.wh,
              border: `0.5px solid ${FD.bd}`,
              borderLeft: `4px solid ${FD.a5}`,
              borderRadius: FD.rxl,
              padding: "20px 22px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 11, color: FD.k5, fontFamily: mono, marginBottom: 4 }}>
              DSP-{activeDispute.id} · {disputeTypeBadge(activeDispute.dispute_type).label} · Raised{" "}
              {new Date(activeDispute.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, color: FD.k9, marginBottom: 4 }}>
              {activeDispute.title}
            </div>
            <div style={{ fontSize: 13, color: FD.k5 }}>
              {activeDispute.unit != null
                ? `${detailUnitLabel || `Unit #${activeDispute.unit}`} · `
                : ""}
              {detailPropertyLabel || `Property #${activeDispute.property}`}
            </div>
          </div>

          {/* Two-column layout */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}
            className="max-lg:grid-cols-1"
          >
            {/* Left: Discussion */}
            <div>
              <div
                style={{
                  background: FD.wh,
                  border: `0.5px solid ${FD.bd}`,
                  borderRadius: FD.rlg,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 18px",
                    borderBottom: `0.5px solid ${FD.bd}`,
                    ...cardTitle,
                    marginBottom: 0,
                  }}
                >
                  Correspondence
                </div>
                <div style={{ maxHeight: 360, overflowY: "auto", padding: "14px 18px" }}>
                  {msgLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    </div>
                  ) : disputeMessages.length === 0 ? (
                    <p style={{ textAlign: "center", fontSize: 13, color: FD.k5 }}>
                      No messages yet.
                    </p>
                  ) : (
                    disputeMessages.map((msg) => {
                      const mine = user?.pk === msg.sender;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            padding: "10px 12px",
                            borderRadius: FD.rmd,
                            marginBottom: 8,
                            fontSize: 13,
                            lineHeight: 1.5,
                            background: mine ? FD.g1 : FD.k0,
                            borderBottomLeftRadius: mine ? 8 : 2,
                            borderBottomRightRadius: mine ? 2 : 8,
                            textAlign: mine ? "right" : "left",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              color: FD.k5,
                              marginBottom: 3,
                              fontWeight: 500,
                            }}
                          >
                            {msg.sender_name}
                          </div>
                          {msg.body}
                          <div
                            style={{
                              fontSize: 10,
                              color: FD.k5,
                              marginTop: 3,
                              fontFamily: mono,
                            }}
                          >
                            {new Date(msg.created_at).toLocaleString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {activeDispute.status !== "resolved" && activeDispute.status !== "closed" && (
                  <form
                    onSubmit={handleSendMessage}
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: "14px 18px",
                      borderTop: `0.5px solid ${FD.bd}`,
                    }}
                  >
                    <input
                      type="text"
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      placeholder="Write a reply…"
                      className={FINANCE_FIELD_CLASS}
                      style={{
                        ...financeFieldInputStyle({ fontFamily: sans }),
                        flex: 1,
                        width: "auto",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={submitting || !newMsg.trim()}
                      style={{
                        ...financePbtn(sans),
                        height: 38,
                        cursor: submitting || !newMsg.trim() ? "not-allowed" : "pointer",
                        opacity: submitting || !newMsg.trim() ? 0.6 : 1,
                      }}
                    >
                      Send
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right: Case details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ ...card, marginBottom: 0 }}>
                <div style={cardTitle}>Dispute details</div>
                {[
                  { k: "Dispute ID", v: `DSP-${activeDispute.id}`, mono: true },
                  { k: "Type", v: disputeTypeBadge(activeDispute.dispute_type).label },
                  {
                    k: "Property",
                    v: detailPropertyLabel || `Property #${activeDispute.property}`,
                  },
                  {
                    k: "Unit",
                    v:
                      activeDispute.unit != null
                        ? detailUnitLabel || `Unit #${activeDispute.unit}`
                        : "—",
                  },
                  { k: "Status", badge: true },
                  {
                    k: "Raised",
                    v: new Date(activeDispute.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  },
                ].map((row, i, arr) => (
                  <div
                    key={row.k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "7px 0",
                      borderBottom: i < arr.length - 1 ? `0.5px solid ${FD.bd}` : "none",
                    }}
                  >
                    <span style={{ fontSize: 13, color: FD.k5 }}>{row.k}</span>
                    {row.badge ? (
                      <StatusBadge status={activeDispute.status} />
                    ) : (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: FD.k9,
                          ...(row.mono ? { fontFamily: mono } : {}),
                        }}
                      >
                        {row.v}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  const STATUS_TABS = [
    { id: "all", label: "All" },
    { id: "open", label: "Open" },
    { id: "in_progress", label: "In Progress" },
    { id: "resolved", label: "Resolved" },
  ];

  return (
    <div
      className={`${dmSans.className} -m-4 md:-m-6`}
      style={{
        fontFamily: sans,
        background: FD.surf,
        color: FD.k9,
        fontSize: 14,
        minHeight: "calc(100vh - 80px)",
      }}
    >
      <FinancePageTopBar
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Disputes" },
        ]}
        right={
          canCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(!showCreate)}
              style={{
                ...(showCreate ? financeGbtn(sans) : financePbtn(sans)),
              }}
            >
              {showCreate ? (
                "Cancel"
              ) : (
                <>
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New dispute
                </>
              )}
            </button>
          ) : undefined
        }
      />

      <div style={{ padding: "22px 24px" }}>
        {error && (
          <div style={{ marginBottom: 14 }}>
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}
        {success && (
          <div style={{ marginBottom: 14 }}>
            <Alert variant="success" title="Success" message={success} />
          </div>
        )}

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 20,
          }}
          className="max-sm:grid-cols-1"
        >
          {[
            { label: "Open disputes", value: stats.open, sub: "Awaiting resolution", color: FD.r6 },
            { label: "Under mediation", value: stats.review, sub: "In progress", color: FD.a7 },
            { label: "Resolved this year", value: stats.done, sub: "Completed cases", color: FD.g7 },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: FD.wh,
                border: `0.5px solid ${FD.bd}`,
                borderRadius: FD.rlg,
                padding: "14px 16px",
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
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Create form */}
        {showCreate && (
          <div
            style={{
              background: FD.wh,
              border: `0.5px solid ${FD.bd}`,
              borderRadius: FD.rlg,
              padding: "18px 20px",
              marginBottom: 20,
            }}
          >
            <div style={{ ...cardTitle, marginBottom: 16 }}>New dispute</div>
            <form
              onSubmit={handleCreate}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
                className="max-sm:grid-cols-1"
              >
                <div>
                  <label htmlFor="dispute_property" style={financeFieldLabelStyle}>
                    Property
                  </label>
                  <select
                    id="dispute_property"
                    name="property"
                    required
                    value={createPropertyId}
                    onChange={(e) => setCreatePropertyId(e.target.value)}
                    className={FINANCE_FIELD_CLASS}
                    style={financeFieldSelectStyle(sans)}
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dispute_unit" style={financeFieldLabelStyle}>
                    Unit (optional)
                  </label>
                  <select
                    id="dispute_unit"
                    name="unit"
                    className={FINANCE_FIELD_CLASS}
                    style={financeFieldSelectStyle(sans)}
                    disabled={!createPropertyId || unitsLoading}
                  >
                    <option value="">
                      {unitsLoading ? "Loading units..." : "All / no specific unit"}
                    </option>
                    {createUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        #{u.id} — {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dispute_type" style={financeFieldLabelStyle}>
                    Type
                  </label>
                  <select
                    id="dispute_type"
                    name="dispute_type"
                    required
                    className={FINANCE_FIELD_CLASS}
                    style={financeFieldSelectStyle(sans)}
                  >
                    {disputeTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dispute_title" style={financeFieldLabelStyle}>
                    Title
                  </label>
                  <input
                    id="dispute_title"
                    name="title"
                    type="text"
                    required
                    placeholder="Dispute title"
                    className={FINANCE_FIELD_CLASS}
                    style={financeFieldInputStyle({ fontFamily: sans })}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="dispute_description" style={financeFieldLabelStyle}>
                  Description
                </label>
                <textarea
                  id="dispute_description"
                  name="description"
                  required
                  rows={4}
                  placeholder="Describe the dispute in detail…"
                  className={FINANCE_FIELD_CLASS}
                  style={financeFieldTextAreaStyle(96)}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  ...financePbtn(sans),
                  alignSelf: "flex-start",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.65 : 1,
                }}
              >
                {submitting ? "Creating…" : "Submit dispute"}
              </button>
            </form>
          </div>
        )}

        {/* Status filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {STATUS_TABS.map((tab) => {
            const active = statusTabFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTabFilter(tab.id)}
                style={{
                  height: 32,
                  padding: "0 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: `0.5px solid ${active ? FD.g7 : FD.bdm}`,
                  background: active ? FD.g7 : FD.wh,
                  color: active ? "#fff" : FD.k7,
                  fontFamily: sans,
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dispute table */}
        {filteredDisputes.length === 0 ? (
          <div
            style={{
              background: FD.wh,
              border: `0.5px solid ${FD.bd}`,
              borderRadius: FD.rlg,
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: FD.k0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke={FD.k5}
                strokeWidth={1.8}
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: FD.k7, marginBottom: 4 }}>
              No disputes
            </div>
            <div style={{ fontSize: 13, color: FD.k5 }}>No disputes match your filter.</div>
          </div>
        ) : (
          <div
            style={{
              background: FD.wh,
              border: `0.5px solid ${FD.bd}`,
              borderRadius: FD.rlg,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["ID", "Title", "Type", "Unit", "Raised", "Status", ""].map((h) => (
                    <th
                      key={h || "action"}
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.3px",
                        textTransform: "uppercase",
                        color: FD.k5,
                        textAlign: "left",
                        padding: "10px 16px",
                        background: FD.k0,
                        borderBottom: `0.5px solid ${FD.bd}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDisputes.map((d, idx) => {
                  const ds = disputeStatusStyle(d.status);
                  const tb = disputeTypeBadge(d.dispute_type);
                  const unitName =
                    d.unit == null
                      ? "—"
                      : (unitsByProperty[d.property] ?? []).find((u) => u.id === d.unit)?.name ??
                        `Unit #${d.unit}`;
                  const isOpen = d.status === "open" || d.status === "under_review";
                  const isLast = idx === filteredDisputes.length - 1;
                  return (
                    <tr
                      key={d.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => openDetail(d.id)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = FD.surf;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                      }}
                    >
                      <td
                        style={{
                          fontSize: 12,
                          color: FD.k5,
                          fontFamily: mono,
                          padding: "12px 16px",
                          borderBottom: isLast ? "none" : `0.5px solid ${FD.bd}`,
                          verticalAlign: "middle",
                        }}
                      >
                        DSP-{d.id}
                      </td>
                      <td
                        style={{
                          fontSize: 13,
                          color: FD.k9,
                          fontWeight: 500,
                          padding: "12px 16px",
                          borderBottom: isLast ? "none" : `0.5px solid ${FD.bd}`,
                          verticalAlign: "middle",
                        }}
                      >
                        {d.title}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          borderBottom: isLast ? "none" : `0.5px solid ${FD.bd}`,
                          verticalAlign: "middle",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 500,
                            background: tb.bg,
                            color: tb.color,
                          }}
                        >
                          {tb.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          fontFamily: mono,
                          padding: "12px 16px",
                          borderBottom: isLast ? "none" : `0.5px solid ${FD.bd}`,
                          color: FD.k9,
                          verticalAlign: "middle",
                        }}
                      >
                        {unitName}
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          color: FD.k5,
                          padding: "12px 16px",
                          borderBottom: isLast ? "none" : `0.5px solid ${FD.bd}`,
                          verticalAlign: "middle",
                        }}
                      >
                        {new Date(d.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          borderBottom: isLast ? "none" : `0.5px solid ${FD.bd}`,
                          verticalAlign: "middle",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 500,
                            background: ds.bg,
                            color: ds.color,
                          }}
                        >
                          {ds.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          borderBottom: isLast ? "none" : `0.5px solid ${FD.bd}`,
                          verticalAlign: "middle",
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            height: 24,
                            padding: "0 9px",
                            borderRadius: FD.rsm,
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                            fontFamily: sans,
                            border: `0.5px solid ${isOpen ? FD.g7 : FD.bdm}`,
                            background: isOpen ? FD.g7 : FD.wh,
                            color: isOpen ? "#fff" : FD.k7,
                            transition: "all .15s",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(d.id);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
