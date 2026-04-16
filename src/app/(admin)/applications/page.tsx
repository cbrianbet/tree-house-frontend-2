"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  listApplications,
  listTenantApplications,
  approveApplication,
  rejectApplication,
  withdrawApplication,
} from "@/lib/api/properties";
import {
  Application,
  ApplicationStatus,
  TenantApplicationItem,
  ApplicationApproveRequest,
} from "@/types/api";
import {
  ROLE_ADMIN,
  ROLE_LANDLORD,
  ROLE_TENANT,
  ROLE_AGENT,
} from "@/constants/roles";
import PageLoader from "@/components/ui/PageLoader";

// ── Design tokens ──────────────────────────────────────────────────────────────
const G = "#0F6E56";
const G50 = "#E8F5F1";
const G100 = "#C6E8DC";
const G300 = "#66C2A3";
const G700 = "#085041";
const GRAY50 = "#F8F9FA";
const GRAY100 = "#F1F3F5";
const GRAY200 = "#E9ECEF";
const GRAY400 = "#868E96";
const GRAY500 = "#6C757D";
const GRAY700 = "#495057";
const GRAY900 = "#212529";
const BORDER = "0.5px solid #DEE2E6";
const R = "14px";
const AMBER = "#EF9F27";
const AMBER50 = "#FAEEDA";
const AMBER800 = "#854F0B";
const RED = "#A32D2D";
const RED50 = "#FCEBEB";
const RED600 = "#E24B4A";
const RED300 = "#F5BCBC";
const BLUE50 = "#EEF2FF";
const BLUE600 = "#4361EE";

type TabFilter = ApplicationStatus | "all";

function statusStyle(status: ApplicationStatus): { bg: string; color: string; label: string } {
  switch (status) {
    case "pending":   return { bg: AMBER50, color: AMBER800, label: "Pending" };
    case "approved":  return { bg: G50, color: G700, label: "Approved" };
    case "rejected":  return { bg: RED50, color: RED, label: "Rejected" };
    case "withdrawn": return { bg: GRAY100, color: GRAY500, label: "Withdrawn" };
  }
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Approve Modal ──────────────────────────────────────────────────────────────
function ApproveModal({
  appId,
  onClose,
  onDone,
}: {
  appId: number;
  onClose: () => void;
  onDone: (id: number) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [rent, setRent] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !rent) { setErr("Start date and rent amount are required."); return; }
    setLoading(true);
    setErr("");
    try {
      const payload: ApplicationApproveRequest = {
        status: "approved",
        start_date: startDate,
        rent_amount: rent,
      };
      if (endDate) payload.end_date = endDate;
      await approveApplication(appId, payload);
      onDone(appId);
    } catch {
      setErr("Could not approve application. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: R, padding: "28px",
        width: "420px", maxWidth: "calc(100vw - 40px)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        animation: "fadeUp 0.2s ease both",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: GRAY900 }}>Approve Application</div>
            <div style={{ fontSize: "12px", color: GRAY500, marginTop: "2px" }}>Application #{appId}</div>
          </div>
          <button onClick={onClose} style={{
            width: "32px", height: "32px", borderRadius: "50%",
            border: BORDER, background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: GRAY500,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={submit}>
          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: GRAY500, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
                Lease start date <span style={{ color: RED600 }}>*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                style={{
                  width: "100%", padding: "9px 12px", border: BORDER,
                  borderRadius: "8px", fontSize: "13px", color: GRAY900,
                  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: GRAY500, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
                Lease end date <span style={{ color: GRAY400, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", border: BORDER,
                  borderRadius: "8px", fontSize: "13px", color: GRAY900,
                  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: GRAY500, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
                Monthly rent (KES) <span style={{ color: RED600 }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
                  fontSize: "12px", fontWeight: 500, color: GRAY400, pointerEvents: "none",
                }}>KES</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0"
                  value={rent}
                  onChange={e => setRent(e.target.value)}
                  required
                  style={{
                    width: "100%", padding: "9px 12px 9px 44px", border: BORDER,
                    borderRadius: "8px", fontSize: "13px", color: GRAY900,
                    fontFamily: "'DM Mono', monospace", outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {err && (
              <div style={{ fontSize: "12px", color: RED600, padding: "8px 12px", background: RED50, borderRadius: "6px", border: `0.5px solid ${RED300}` }}>
                {err}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px",
                  border: BORDER, background: "#fff", color: GRAY700,
                  fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2, padding: "10px", borderRadius: "8px",
                  border: "none", background: loading ? G300 : G, color: "#fff",
                  fontSize: "13px", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {loading ? "Approving…" : "Approve & create lease"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, active, color }: { label: string; value: number; active?: boolean; color?: string }) {
  return (
    <div style={{
      background: active ? (color ? `${color}18` : G50) : "#fff",
      border: active ? `0.5px solid ${color ?? G300}` : BORDER,
      borderRadius: "10px", padding: "12px 16px",
      display: "flex", flexDirection: "column", gap: "2px",
      transition: "all 0.15s",
    }}>
      <span style={{ fontSize: "22px", fontWeight: 500, color: active ? (color ?? G) : GRAY900, fontFamily: "'DM Mono', monospace" }}>
        {value}
      </span>
      <span style={{ fontSize: "11px", color: GRAY500 }}>{label}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ApplicationsPage() {
  const { user } = useAuth();

  const isLandlord = user?.role === ROLE_LANDLORD || user?.role === ROLE_ADMIN || user?.role === ROLE_AGENT;
  const isTenant   = user?.role === ROLE_TENANT;

  const [apps, setApps]         = useState<Application[]>([]);
  const [tenantApps, setTenantApps] = useState<TenantApplicationItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [tab, setTab]           = useState<TabFilter>("all");
  const [search, setSearch]     = useState("");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [toast, setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      if (isLandlord) {
        const data = await listApplications();
        setApps(data);
      } else if (isTenant) {
        const data = await listTenantApplications();
        setTenantApps(data);
      }
    } catch {
      setError("Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleReject(id: number) {
    if (!confirm("Reject this application?")) return;
    setActioningId(id);
    try {
      await rejectApplication(id);
      setApps(prev => prev.map(a => a.id === id ? { ...a, status: "rejected" } : a));
      showToast("Application rejected.", "success");
    } catch {
      showToast("Failed to reject application.", "error");
    } finally {
      setActioningId(null);
    }
  }

  async function handleWithdraw(id: number) {
    if (!confirm("Withdraw this application?")) return;
    setActioningId(id);
    try {
      await withdrawApplication(id);
      setTenantApps(prev => prev.map(a => a.id === id ? { ...a, status: "withdrawn" } : a));
      showToast("Application withdrawn.", "success");
    } catch {
      showToast("Failed to withdraw application.", "error");
    } finally {
      setActioningId(null);
    }
  }

  function onApproved(id: number) {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: "approved" } : a));
    setApprovingId(null);
    showToast("Application approved — lease created.", "success");
  }

  // Derived counts
  const counts = {
    all:       apps.length,
    pending:   apps.filter(a => a.status === "pending").length,
    approved:  apps.filter(a => a.status === "approved").length,
    rejected:  apps.filter(a => a.status === "rejected").length,
    withdrawn: apps.filter(a => a.status === "withdrawn").length,
  };

  const filtered = apps.filter(a => {
    if (tab !== "all" && a.status !== tab) return false;
    if (search && !String(a.id).includes(search) && !String(a.unit).includes(search)) return false;
    return true;
  });

  const tenantFiltered = tenantApps.filter(a => {
    if (tab !== "all" && a.status !== tab) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.unit.unit_number.toLowerCase().includes(q) && !a.unit.property.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const TABS: { key: TabFilter; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "pending",   label: "Pending" },
    { key: "approved",  label: "Approved" },
    { key: "rejected",  label: "Rejected" },
    { key: "withdrawn", label: "Withdrawn" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        .app-row:hover { background: ${GRAY50} !important; }
        .act-btn:hover { opacity: 0.85; }
        .tab-btn:hover { color: ${G700} !important; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastIn {
          from { transform: translateX(-50%) translateY(60px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .app-stat { animation: fadeUp 0.25s ease both; }
        .app-stat:nth-child(1) { animation-delay: 0.04s; }
        .app-stat:nth-child(2) { animation-delay: 0.07s; }
        .app-stat:nth-child(3) { animation-delay: 0.10s; }
        .app-stat:nth-child(4) { animation-delay: 0.13s; }
        .main-card { animation: fadeUp 0.25s ease both; animation-delay: 0.16s; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", color: GRAY900, minHeight: "100vh", background: GRAY50 }}>

        {/* Top bar — same chrome as /tenant (bleed, breadcrumb, no sticky) */}
        <div
          className="-mx-4 -mt-4 md:-mx-6 md:-mt-6"
          style={{
            background: "#fff",
            borderBottom: "0.5px solid rgba(0,0,0,0.07)",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: GRAY500 }}>
            <Link href="/" style={{ color: GRAY500, textDecoration: "none" }}>
              Dashboard
            </Link>
            <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke={GRAY500} strokeWidth={2} strokeLinecap="round">
              <polyline points="4,2 8,6 4,10" />
            </svg>
            <span style={{ color: GRAY900, fontWeight: 500 }}>Applications</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {counts.pending > 0 && (
              <div style={{
                background: AMBER50, color: AMBER800,
                border: `0.5px solid ${AMBER}`,
                borderRadius: "20px", padding: "4px 10px",
                fontSize: "12px", fontWeight: 500,
              }}>
                {counts.pending} pending review
              </div>
            )}
          </div>
        </div>

        <div style={{ paddingTop: 22, paddingBottom: 24, maxWidth: "1200px" }}>

          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 500, color: GRAY900, margin: 0 }}>Applications</h1>
            <p style={{ fontSize: "13px", color: GRAY500, margin: "4px 0 0" }}>
              {isLandlord
                ? "Review and manage rental applications from prospective tenants."
                : "Track your rental applications and their status."}
            </p>
          </div>

          {/* Stats row — landlord only */}
          {isLandlord && !loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
              <div className="app-stat"><StatPill label="Total" value={counts.all} /></div>
              <div className="app-stat"><StatPill label="Pending" value={counts.pending} active={tab === "pending"} color={AMBER} /></div>
              <div className="app-stat"><StatPill label="Approved" value={counts.approved} active={tab === "approved"} color={G} /></div>
              <div className="app-stat"><StatPill label="Rejected" value={counts.rejected} active={tab === "rejected"} color={RED} /></div>
            </div>
          )}

          {/* Main card */}
          <div className="main-card" style={{
            background: "#fff", borderRadius: R,
            border: BORDER, overflow: "hidden",
          }}>
            {/* Toolbar */}
            <div style={{
              padding: "16px 20px", borderBottom: BORDER,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
              flexWrap: "wrap",
            }}>
              {/* Tabs */}
              <div style={{ display: "flex", gap: "2px" }}>
                {TABS.map(t => {
                  const count = isLandlord
                    ? (t.key === "all" ? counts.all : apps.filter(a => a.status === t.key).length)
                    : (t.key === "all" ? tenantApps.length : tenantApps.filter(a => a.status === t.key).length);
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      className="tab-btn"
                      onClick={() => setTab(t.key)}
                      style={{
                        padding: "7px 14px", borderRadius: "8px",
                        border: "none", cursor: "pointer",
                        fontSize: "13px", fontWeight: active ? 500 : 400,
                        color: active ? G700 : GRAY500,
                        background: active ? G50 : "transparent",
                        fontFamily: "inherit",
                        display: "flex", alignItems: "center", gap: "6px",
                        transition: "all 0.15s",
                      }}
                    >
                      {t.label}
                      {count > 0 && (
                        <span style={{
                          background: active ? G100 : GRAY100,
                          color: active ? G700 : GRAY500,
                          borderRadius: "10px", padding: "1px 7px",
                          fontSize: "11px", fontWeight: 500,
                        }}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
                  width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="5" stroke={GRAY400} strokeWidth="1.5"/>
                  <path d="M11 11l3 3" stroke={GRAY400} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  placeholder={isLandlord ? "Search by ID…" : "Search by property…"}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    paddingLeft: "30px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px",
                    border: BORDER, borderRadius: "8px", fontSize: "13px",
                    color: GRAY900, outline: "none", fontFamily: "inherit",
                    width: "200px",
                  }}
                />
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <PageLoader />
            ) : error ? (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: RED, marginBottom: "12px" }}>{error}</div>
                <button onClick={load} style={{
                  padding: "8px 16px", borderRadius: "8px", border: BORDER,
                  background: "#fff", color: GRAY700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
                }}>Retry</button>
              </div>
            ) : isLandlord ? (
              /* ── Landlord table ── */
              filtered.length === 0 ? (
                <EmptyState search={search} tab={tab} />
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: GRAY50 }}>
                      {["Application", "Unit", "Applied", "Status", "Actions"].map(h => (
                        <th key={h} style={{
                          padding: "10px 16px", textAlign: "left",
                          fontSize: "11px", fontWeight: 500, color: GRAY500,
                          textTransform: "uppercase", letterSpacing: "0.5px",
                          borderBottom: BORDER,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((app, i) => {
                      const st = statusStyle(app.status);
                      const actioning = actioningId === app.id;
                      return (
                        <tr
                          key={app.id}
                          className="app-row"
                          style={{
                            borderBottom: BORDER,
                            transition: "background 0.12s",
                            animation: `fadeUp 0.2s ease both`,
                            animationDelay: `${i * 0.03}s`,
                          }}
                        >
                          {/* Application ID */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{
                                width: "32px", height: "32px", borderRadius: "50%",
                                background: G50, color: G, fontSize: "12px", fontWeight: 600,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                              }}>
                                {String(app.applicant).slice(-2)}
                              </div>
                              <div>
                                <div style={{ fontSize: "13px", fontWeight: 500, color: GRAY900, fontFamily: "'DM Mono', monospace" }}>
                                  #APP-{String(app.id).padStart(4, "0")}
                                </div>
                                <div style={{ fontSize: "11px", color: GRAY500 }}>
                                  Applicant #{app.applicant}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Unit */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontSize: "13px", fontWeight: 500, color: GRAY900, fontFamily: "'DM Mono', monospace" }}>
                              Unit #{app.unit}
                            </div>
                            {app.message && (
                              <div style={{
                                fontSize: "11px", color: GRAY500,
                                maxWidth: "180px", overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {app.message}
                              </div>
                            )}
                          </td>

                          {/* Date */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontSize: "13px", color: GRAY700 }}>{fmt(app.created_at)}</div>
                            {app.reviewed_at && (
                              <div style={{ fontSize: "11px", color: GRAY500 }}>
                                Reviewed {fmt(app.reviewed_at)}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{
                              background: st.bg, color: st.color,
                              borderRadius: "20px", padding: "3px 10px",
                              fontSize: "12px", fontWeight: 500,
                            }}>
                              {st.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "14px 16px" }}>
                            {app.status === "pending" && (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  className="act-btn"
                                  disabled={actioning}
                                  onClick={() => setApprovingId(app.id)}
                                  style={{
                                    padding: "6px 12px", borderRadius: "8px",
                                    border: "none", background: G, color: "#fff",
                                    fontSize: "12px", fontWeight: 500, cursor: "pointer",
                                    fontFamily: "inherit", opacity: actioning ? 0.6 : 1,
                                    transition: "opacity 0.15s",
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  className="act-btn"
                                  disabled={actioning}
                                  onClick={() => handleReject(app.id)}
                                  style={{
                                    padding: "6px 12px", borderRadius: "8px",
                                    border: `0.5px solid ${RED300}`,
                                    background: RED50, color: RED,
                                    fontSize: "12px", fontWeight: 500, cursor: "pointer",
                                    fontFamily: "inherit", opacity: actioning ? 0.6 : 1,
                                    transition: "opacity 0.15s",
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            {(app.status === "approved" || app.status === "rejected") && (
                              <span style={{ fontSize: "12px", color: GRAY400 }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : isTenant ? (
              /* ── Tenant list ── */
              tenantFiltered.length === 0 ? (
                <TenantEmptyState search={search} tab={tab} />
              ) : (
                <div style={{ padding: "8px 0" }}>
                  {tenantFiltered.map((app, i) => {
                    const st = statusStyle(app.status);
                    const actioning = actioningId === app.id;
                    return (
                      <div
                        key={app.id}
                        style={{
                          padding: "16px 20px", borderBottom: BORDER,
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
                          animation: `fadeUp 0.2s ease both`,
                          animationDelay: `${i * 0.04}s`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                          {/* Icon */}
                          <div style={{
                            width: "40px", height: "40px", borderRadius: "10px",
                            background: G50, display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M9 22V12h6v10" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>

                          {/* Details */}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "14px", fontWeight: 500, color: GRAY900 }}>
                              Unit {app.unit.unit_number}
                              <span style={{ color: GRAY400, fontWeight: 400 }}> · </span>
                              {app.unit.property.name}
                            </div>
                            {app.message && (
                              <div style={{
                                fontSize: "12px", color: GRAY500, marginTop: "2px",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {app.message}
                              </div>
                            )}
                            <div style={{ fontSize: "11px", color: GRAY400, marginTop: "4px" }}>
                              Applied {fmt(app.created_at)}
                            </div>
                          </div>
                        </div>

                        {/* Right side */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                          <span style={{
                            background: st.bg, color: st.color,
                            borderRadius: "20px", padding: "4px 12px",
                            fontSize: "12px", fontWeight: 500,
                          }}>
                            {st.label}
                          </span>
                          {app.status === "pending" && (
                            <button
                              className="act-btn"
                              disabled={actioning}
                              onClick={() => handleWithdraw(app.id)}
                              style={{
                                padding: "6px 12px", borderRadius: "8px",
                                border: BORDER, background: "#fff", color: GRAY700,
                                fontSize: "12px", fontWeight: 500, cursor: "pointer",
                                fontFamily: "inherit", opacity: actioning ? 0.6 : 1,
                              }}
                            >
                              Withdraw
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div style={{ padding: "60px", textAlign: "center", color: GRAY500, fontSize: "13px" }}>
                You do not have access to this page.
              </div>
            )}
          </div>

          {/* Footer count */}
          {!loading && !error && (
            <div style={{ marginTop: "12px", fontSize: "12px", color: GRAY400, textAlign: "right" }}>
              {isLandlord
                ? `Showing ${filtered.length} of ${apps.length} applications`
                : `Showing ${tenantFiltered.length} of ${tenantApps.length} applications`}
            </div>
          )}
        </div>
      </div>

      {/* Approve modal */}
      {approvingId !== null && (
        <ApproveModal
          appId={approvingId}
          onClose={() => setApprovingId(null)}
          onDone={onApproved}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "28px", left: "50%",
          transform: "translateX(-50%)",
          background: toast.type === "success" ? GRAY900 : RED,
          color: "#fff", borderRadius: "10px",
          padding: "10px 18px", fontSize: "13px", fontWeight: 500,
          boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
          animation: "toastIn 0.25s cubic-bezier(0.4,0,0.2,1) both",
          zIndex: 300, whiteSpace: "nowrap",
        }}>
          {toast.type === "success" ? "✓ " : "✗ "}{toast.msg}
        </div>
      )}
    </>
  );
}

// ── Empty states ──────────────────────────────────────────────────────────────
function EmptyState({ search, tab }: { search: string; tab: TabFilter }) {
  const msg = search
    ? "No applications match your search."
    : tab !== "all"
    ? `No ${tab} applications.`
    : "No applications yet.";

  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <div style={{
        width: "52px", height: "52px", borderRadius: "14px",
        background: G50, margin: "0 auto 14px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ fontSize: "15px", fontWeight: 500, color: GRAY700, marginBottom: "6px" }}>{msg}</div>
      <div style={{ fontSize: "13px", color: GRAY400 }}>Applications submitted by tenants will appear here.</div>
    </div>
  );
}

function TenantEmptyState({ search, tab }: { search: string; tab: TabFilter }) {
  const msg = search
    ? "No applications match your search."
    : tab !== "all"
    ? `No ${tab} applications.`
    : "No applications yet.";

  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <div style={{
        width: "52px", height: "52px", borderRadius: "14px",
        background: G50, margin: "0 auto 14px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 22V12h6v10" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ fontSize: "15px", fontWeight: 500, color: GRAY700, marginBottom: "6px" }}>{msg}</div>
      <div style={{ fontSize: "13px", color: GRAY400 }}>Browse available units and apply to get started.</div>
    </div>
  );
}
