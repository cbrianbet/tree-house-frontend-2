"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import RoleGuard from "@/components/auth/RoleGuard";
import type { TenantDashboard } from "@/types/api";
import api from "@/lib/api/client";
import PageLoader from "@/components/ui/PageLoader";

async function fetchTenantDashboard(): Promise<TenantDashboard> {
  const res = await api.get<TenantDashboard>("/api/dashboard/tenant/");
  return res.data;
}

// ── Design tokens ──────────────────────────────────────────────────────────────
const G     = "#0F6E56";
const G50   = "#E8F5F1";
const G100  = "#C6E8DC";
const G300  = "#66C2A3";
const G700  = "#085041";
const GRAY50  = "#F8F9FA";
const GRAY100 = "#F1F3F5";
const GRAY200 = "#E9ECEF";
const GRAY400 = "#868E96";
const GRAY500 = "#6C757D";
const GRAY700 = "#495057";
const GRAY900 = "#212529";
const BORDER  = "0.5px solid #DEE2E6";
const R       = "14px";
const AMBER   = "#EF9F27";
const AMBER50 = "#FAEEDA";
const AMBER800 = "#854F0B";
const RED     = "#A32D2D";
const RED50   = "#FCEBEB";
const RED300  = "#F5BCBC";

// ── Helpers ────────────────────────────────────────────────────────────────────
function daysRemaining(end: string) {
  return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000));
}
function leaseElapsed(start: string, end: string) {
  const s = new Date(start).getTime(), e = new Date(end).getTime();
  if (e <= s) return 100;
  return Math.min(100, Math.max(0, ((Date.now() - s) / (e - s)) * 100));
}
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, bg, color, border, delay = 0
}: {
  label: string; value: string | number; sub?: string;
  bg: string; color: string; border: string; delay?: number;
}) {
  return (
    <div style={{
      background: bg, border: `0.5px solid ${border}`, borderRadius: R,
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: "4px",
      animation: "fadeUp 0.25s ease both", animationDelay: `${delay}s`,
    }}>
      <span style={{ fontSize: "11px", fontWeight: 500, color, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </span>
      <span style={{ fontSize: "24px", fontWeight: 500, color, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: "11px", color, opacity: 0.7 }}>{sub}</span>}
    </div>
  );
}

// ── Quick action tile ──────────────────────────────────────────────────────────
function ActionTile({
  href, label, sub, icon, delay = 0, badge,
}: {
  href: string; label: string; sub: string;
  icon: React.ReactNode; delay?: number; badge?: number;
}) {
  return (
    <Link
      href={href}
      className="action-tile"
      style={{
        display: "flex", alignItems: "center", gap: "14px",
        background: "#fff", border: BORDER, borderRadius: R,
        padding: "16px 18px", textDecoration: "none",
        transition: "box-shadow 0.15s, transform 0.15s",
        animation: "fadeUp 0.25s ease both", animationDelay: `${delay}s`,
        position: "relative",
      }}
    >
      <div style={{
        width: "40px", height: "40px", borderRadius: "10px",
        background: G50, color: G,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: GRAY900 }}>{label}</div>
        <div style={{ fontSize: "12px", color: GRAY500, marginTop: "1px" }}>{sub}</div>
      </div>
      {badge !== undefined && badge > 0 && (
        <span style={{
          background: RED, color: "#fff",
          borderRadius: "10px", padding: "2px 7px",
          fontSize: "11px", fontWeight: 600, flexShrink: 0,
        }}>{badge > 99 ? "99+" : badge}</span>
      )}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: GRAY400 }}>
        <path d="M5 2.5l4 4.5-4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  );
}

// (Skeleton replaced by PageLoader)

// ── Dashboard content ──────────────────────────────────────────────────────────
function TenantDashboardContent() {
  const { user } = useAuth();
  const [data, setData]       = useState<TenantDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetchTenantDashboard()
      .then(setData)
      .catch(() => setError("Unable to load your dashboard. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  if (error || !data) {
    return (
      <div style={{
        background: RED50, border: `0.5px solid ${RED300}`, borderRadius: R,
        padding: "16px 20px", fontSize: "13px", color: RED,
      }}>
        {error || "Something went wrong."}
      </div>
    );
  }

  const lease   = data.active_lease;
  const days    = lease
    ? (typeof lease.days_remaining === "number"
        ? lease.days_remaining
        : daysRemaining(lease.end_date))
    : 0;
  const elapsed = lease ? leaseElapsed(lease.start_date, lease.end_date) : 0;
  const barColor = elapsed > 90 ? RED : elapsed > 75 ? AMBER : G;
  const daysColor = days < 30 ? RED : days < 90 ? AMBER : G;
  const inv = data.invoices ?? {
    pending: 0,
    overdue: 0,
    next_due: null,
  };
  const openMaint = data.maintenance?.open_requests ?? 0;
  const unread = data.notifications?.unread ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "32px" }}>

      {/* Greeting */}
      <div style={{ animation: "fadeUp 0.25s ease both", animationDelay: "0.02s" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 500, color: GRAY900, margin: 0 }}>
          {greeting()}{user?.first_name ? `, ${user.first_name}` : ""}.
        </h1>
        <p style={{ fontSize: "13px", color: GRAY500, margin: "4px 0 0" }}>
          Here&apos;s a summary of your home.
        </p>
      </div>

      {/* No-lease banner */}
      {!lease && (
        <div style={{
          background: AMBER50, border: `0.5px solid ${AMBER}`,
          borderLeft: `3px solid ${AMBER}`, borderRadius: R,
          padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: "12px",
          animation: "fadeUp 0.25s ease both", animationDelay: "0.06s",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: AMBER800, flexShrink: 0, marginTop: "1px" }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: AMBER800, marginBottom: "3px" }}>
              No active lease
            </div>
            <div style={{ fontSize: "13px", color: AMBER800, opacity: 0.85 }}>
              Browse available units and apply for a property.{" "}
              <Link href="/search" style={{ color: AMBER800, fontWeight: 600, textDecoration: "underline" }}>
                View listings →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Lease hero card ── */}
      {lease && (
        <div style={{
          background: "#fff", border: BORDER,
          borderLeft: `3px solid ${G}`,
          borderRadius: R, padding: "24px 28px",
          boxShadow: "0 2px 16px rgba(15,110,86,0.06)",
          animation: "fadeUp 0.25s ease both", animationDelay: "0.06s",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "12px",
                background: G50, color: G,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                  <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 500, color: GRAY900, margin: "0 0 4px" }}>
                  {lease.property}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", color: GRAY500, fontSize: "12px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 019.5 9 2.5 2.5 0 0112 6.5 2.5 2.5 0 0114.5 9 2.5 2.5 0 0112 11.5z"
                      stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                  Your rental home
                </div>
              </div>
            </div>
            <div style={{
              background: G50, border: `0.5px solid ${G100}`,
              borderRadius: "20px", padding: "5px 12px",
              fontSize: "12px", fontWeight: 500, color: G700, flexShrink: 0,
            }}>
              Unit {lease.unit}
            </div>
          </div>

          {/* Stats grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px",
          }}>
            {[
              { label: "Monthly Rent", value: `KES ${Number(lease.rent_amount).toLocaleString("en-KE")}`, mono: true },
              { label: "Lease Start",  value: fmt(lease.start_date) },
              { label: "Lease Ends",   value: fmt(lease.end_date) },
              { label: "Days Left",    value: days.toString(), colored: true, mono: true },
            ].map(({ label, value, mono, colored }) => (
              <div key={label}>
                <div style={{ fontSize: "11px", fontWeight: 500, color: GRAY500, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px" }}>
                  {label}
                </div>
                <div style={{
                  fontSize: "16px", fontWeight: 500,
                  color: colored ? daysColor : GRAY900,
                  fontFamily: mono ? "'DM Mono', monospace" : "inherit",
                }}>
                  {value}
                  {colored && <span style={{ fontSize: "12px", fontWeight: 400, color: GRAY400, marginLeft: "3px" }}>days</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Lease progress */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 500, color: GRAY500, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Lease progress
              </span>
              <span style={{ fontSize: "11px", color: GRAY500, fontFamily: "'DM Mono', monospace" }}>
                {Math.round(elapsed)}% elapsed
              </span>
            </div>
            <div style={{ height: "6px", background: GRAY100, borderRadius: "3px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${elapsed}%`,
                background: barColor, borderRadius: "3px",
                transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
              <span style={{ fontSize: "11px", color: GRAY400 }}>{fmt(lease.start_date)}</span>
              <span style={{ fontSize: "11px", color: daysColor, fontWeight: 500 }}>{days} days remaining</span>
              <span style={{ fontSize: "11px", color: GRAY400 }}>{fmt(lease.end_date)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice & activity summary ── */}
      <div>
        <div style={{ fontSize: "11px", fontWeight: 500, color: GRAY500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
          Invoices & activity
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          <StatCard
            label="Pending"
            value={inv.pending}
            sub="awaiting payment"
            bg={AMBER50}
            color={AMBER800}
            border={AMBER}
            delay={0.10}
          />
          <StatCard
            label="Overdue"
            value={inv.overdue}
            sub={inv.overdue > 0 ? "action needed" : "all clear"}
            bg={inv.overdue > 0 ? RED50 : GRAY50}
            color={inv.overdue > 0 ? RED : GRAY500}
            border={inv.overdue > 0 ? RED300 : GRAY200}
            delay={0.13}
          />
          <StatCard
            label="Open maintenance"
            value={openMaint}
            sub={openMaint > 0 ? "requests" : "none open"}
            bg={openMaint > 0 ? AMBER50 : G50}
            color={openMaint > 0 ? AMBER800 : G700}
            border={openMaint > 0 ? AMBER : G100}
            delay={0.16}
          />
          <StatCard
            label="Notifications"
            value={unread}
            sub={unread > 0 ? "unread" : "inbox clear"}
            bg={unread > 0 ? G50 : GRAY50}
            color={unread > 0 ? G700 : GRAY500}
            border={unread > 0 ? G100 : GRAY200}
            delay={0.19}
          />
        </div>
        {inv.next_due && (
          <div style={{
            marginTop: "12px",
            background: "#fff",
            border: BORDER,
            borderRadius: R,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 500, color: GRAY500, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Next invoice due
              </div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: GRAY900, marginTop: "4px" }}>
                KES {Number(inv.next_due.amount).toLocaleString("en-KE")}{" "}
                <span style={{ fontSize: "12px", fontWeight: 400, color: GRAY500 }}>
                  · due {fmt(inv.next_due.due_date)}
                </span>
              </div>
            </div>
            <Link href="/billing" style={{
              background: G,
              color: "#fff",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 500,
              textDecoration: "none",
            }}>
              View billing
            </Link>
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div>
        <div style={{ fontSize: "11px", fontWeight: 500, color: GRAY500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
          Quick actions
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
          <ActionTile
            href="/billing"
            label="Pay rent"
            sub="View and pay your invoices"
            delay={0.22}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.7"/>
                <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="1.7"/>
                <line x1="6" y1="15" x2="10" y2="15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            }
          />
          <ActionTile
            href="/maintenance"
            label="Report an issue"
            sub="Submit a maintenance request"
            badge={openMaint}
            delay={0.25}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
                  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
          />
          <ActionTile
            href="/applications"
            label="My applications"
            sub="Track your rental applications"
            delay={0.28}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"
                  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
          />
          <ActionTile
            href="/messages"
            label="Messages"
            sub="Chat with your landlord"
            delay={0.31}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
          />
          <ActionTile
            href="/moving"
            label="Moving services"
            sub="Browse and book moving companies"
            delay={0.34}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="1" y="3" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M16 8h4l3 3v5h-7V8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                <circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.7"/>
                <circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.7"/>
              </svg>
            }
          />
          <ActionTile
            href="/disputes"
            label="Disputes"
            sub="Raise or view disputes"
            delay={0.37}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
                  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
          />
        </div>
      </div>

      {/* ── Search link ── */}
      <div style={{
        background: G50, border: `0.5px solid ${G100}`,
        borderRadius: R, padding: "18px 22px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        animation: "fadeUp 0.25s ease both", animationDelay: "0.40s",
      }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 500, color: G700, marginBottom: "3px" }}>
            Looking for a new place?
          </div>
          <div style={{ fontSize: "12px", color: G700, opacity: 0.75 }}>
            Browse available units across all properties.
          </div>
        </div>
        <Link href="/search" style={{
          background: G, color: "#fff",
          borderRadius: "8px", padding: "8px 16px",
          fontSize: "13px", fontWeight: 500, textDecoration: "none",
          flexShrink: 0,
        }}>
          Browse units
        </Link>
      </div>

    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TenantDashboardPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          from { background-position: -700px 0; }
          to   { background-position:  700px 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, #F1F3F5 25%, #E9ECEF 50%, #F1F3F5 75%);
          background-size: 1400px 100%;
          animation: shimmer 1.5s infinite linear;
        }
        .action-tile:hover {
          box-shadow: 0 4px 20px rgba(15,110,86,0.10) !important;
          transform: translateY(-2px);
        }
      `}</style>

      {/* Topbar */}
      <div style={{
        background: "#fff", borderBottom: BORDER,
        padding: "0 28px", height: "56px",
        display: "flex", alignItems: "center",
        position: "sticky", top: 0, zIndex: 50,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
          <span style={{ color: GRAY500 }}>Dashboard</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke={GRAY400} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ color: GRAY900, fontWeight: 500 }}>My home</span>
        </div>
      </div>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        background: GRAY50, minHeight: "calc(100vh - 56px)",
        padding: "28px",
      }}>
        <div style={{ maxWidth: "900px" }}>
          <RoleGuard allowed={["Tenant"]}>
            <TenantDashboardContent />
          </RoleGuard>
        </div>
      </div>
    </>
  );
}
