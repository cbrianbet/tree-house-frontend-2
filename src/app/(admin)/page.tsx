"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getDashboard,
  listApplications,
  approveApplication,
  rejectApplication,
  withdrawApplication,
  listProperties,
  listUnits,
} from "@/lib/api/properties";
import { listNotifications } from "@/lib/api/notifications";
import type { Notification } from "@/types/api";
import {
  getAdminDashboard,
  getTenantDashboard,
  getArtisanDashboard,
  getAgentDashboard,
  getMovingCompanyDashboard,
  listAdminUsers,
  updateAdminUser,
} from "@/lib/api/dashboards";
import type {
  DashboardData,
  AdminDashboard,
  AdminUser,
  TenantDashboard,
  ArtisanDashboard,
  AgentDashboard,
  MovingCompanyDashboard,
  Application,
  ApplicationStatus,
  Property,
  Unit,
} from "@/types/api";
import Badge from "@/components/ui/badge/Badge";
import Alert from "@/components/ui/alert/Alert";
import Link from "next/link";

import { ROLE_ADMIN, ROLE_TENANT, ROLE_LANDLORD, ROLE_AGENT, ROLE_ARTISAN, ROLE_MOVING } from "@/constants/roles";

export default function DashboardPage() {
  const { user, roleName } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case ROLE_ADMIN:
      return <AdminDash />;
    case ROLE_TENANT:
      return <TenantDash />;
    case ROLE_LANDLORD:
      return <LandlordDash />;
    case ROLE_AGENT:
      return <AgentDash />;
    case ROLE_ARTISAN:
      return <ArtisanDash />;
    case ROLE_MOVING:
      return <MovingDash />;
    default:
      return (
        <div>
          <h1 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
            Welcome, {user.first_name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You are signed in as <strong>{roleName(user.role)}</strong>. Use the sidebar to navigate.
          </p>
        </div>
      );
  }
}

// ── Admin Dashboard (Treehouse admin panel + DESIGN.md ink / Geist) ──

const ADMIN = {
  surface: "#F0F3F7",
  white: "#ffffff",
  navy900: "#0D1520",
  navy800: "#152030",
  navy700: "#1E2E42",
  navy600: "#28405A",
  navy400: "#4A6B8A",
  navy200: "#8BAABF",
  navy100: "#B8CCDB",
  navy50: "#EDF2F6",
  green700: "#0F6E56",
  green500: "#1D9E75",
  green300: "#5DCAA5",
  green50: "#E1F5EE",
  amber600: "#B8690E",
  amber500: "#EF9F27",
  amber100: "#FAC775",
  amber50: "#FAEEDA",
  red600: "#C0392B",
  red500: "#E24B4A",
  red300: "#F09595",
  red50: "#FCEBEB",
  blue500: "#378ADD",
  blue300: "#85B7EB",
  blue50: "#E6F1FB",
  moving: "#7F77DD",
  borderLight: "rgba(0,0,0,0.07)",
  borderMd: "rgba(0,0,0,0.12)",
} as const;

function adminRoleDonutColor(roleName: string): string {
  const r = roleName.toLowerCase();
  if (r.includes("admin")) return ADMIN.red500;
  if (r.includes("landlord")) return ADMIN.green700;
  if (r.includes("agent")) return ADMIN.blue500;
  if (r.includes("tenant")) return ADMIN.green500;
  if (r.includes("artisan")) return ADMIN.navy400;
  if (r.includes("moving")) return ADMIN.moving;
  return ADMIN.navy400;
}

function adminRoleBadgeStyle(roleName: string): React.CSSProperties {
  const r = roleName.toLowerCase();
  if (r.includes("admin")) return { background: "rgba(226,75,74,0.1)", color: ADMIN.red600 };
  if (r.includes("landlord")) return { background: "rgba(15,110,86,0.1)", color: ADMIN.green700 };
  if (r.includes("agent")) return { background: "rgba(55,138,221,0.12)", color: ADMIN.blue500 };
  if (r.includes("tenant")) return { background: "rgba(239,159,39,0.12)", color: ADMIN.amber600 };
  if (r.includes("artisan")) return { background: "rgba(74,107,138,0.12)", color: ADMIN.navy600 };
  if (r.includes("moving")) return { background: "rgba(127,119,221,0.1)", color: "#534AB7" };
  return { background: "rgba(74,107,138,0.12)", color: ADMIN.navy600 };
}

function AdminRoleDonut({
  slices,
  total,
}: {
  slices: { label: string; value: number; color: string }[];
  total: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || total <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 80;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    let startAngle = -Math.PI / 2;
    const cx = 40;
    const cy = 40;
    const outerR = 36;
    const innerR = 24;
    slices.forEach((s, i) => {
      if (s.value <= 0) return;
      const sliceAngle = (s.value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx + outerR * Math.cos(startAngle), cy + outerR * Math.sin(startAngle));
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = slices[i].color;
      ctx.fill();
      startAngle += sliceAngle;
    });
  }, [slices, total]);

  return <canvas ref={ref} width={80} height={80} aria-hidden />;
}

function AdminDash() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userListError, setUserListError] = useState(false);
  const [ackOverdueAlert, setAckOverdueAlert] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getAdminDashboard(),
      listAdminUsers().catch(() => null),
    ])
      .then(([dash, list]) => {
        if (cancelled) return;
        setData(dash);
        if (list === null) {
          setUserListError(true);
          setUsers([]);
        } else {
          setUsers(list);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load admin dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const overdue = data?.billing.overdue_invoices ?? 0;
  const disputeOpen = data ? data.disputes.open + data.disputes.under_review : 0;

  const health = useMemo(() => {
    if (!data) return { kind: "healthy" as const, label: "", desc: "", crit: 0, warn: 0, info: 0 };
    const crit = overdue >= 25 ? 1 : 0;
    const warnRules =
      (!ackOverdueAlert && overdue >= 10 ? 1 : 0) + (disputeOpen >= 3 ? 1 : 0);

    if (crit > 0) {
      return {
        kind: "critical" as const,
        label: "Critical",
        desc: `${overdue} overdue invoices · ${disputeOpen} open disputes · review immediately`,
        crit: 1,
        warn: warnRules,
        info: 0,
      };
    }
    if (ackOverdueAlert && crit === 0) {
      return {
        kind: "healthy" as const,
        label: "Healthy",
        desc: "Alert acknowledged · continue monitoring billing",
        crit: 0,
        warn: 0,
        info: 0,
      };
    }
    if (overdue >= 10 || disputeOpen > 0) {
      return {
        kind: "warning" as const,
        label: "Warning",
        desc: `${overdue >= 10 ? `${overdue} overdue invoices` : `${disputeOpen} open dispute(s)`} · last checked ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
        crit: 0,
        warn: overdue >= 10 ? 1 : 0,
        info: disputeOpen > 0 && overdue < 10 ? 1 : 0,
      };
    }
    return {
      kind: "healthy" as const,
      label: "Healthy",
      desc: "All clear · billing and disputes within thresholds",
      crit: 0,
      warn: 0,
      info: 0,
    };
  }, [data, overdue, disputeOpen, ackOverdueAlert]);

  const roleSlices = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.users.by_role)
      .map(([label, value]) => ({
        label,
        value,
        color: adminRoleDonutColor(label),
      }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const donutTotal = data?.users.total ?? 0;

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => {
        const blob = `${u.first_name} ${u.last_name} ${u.email} ${u.username}`.toLowerCase();
        const okQ = !q || blob.includes(q);
        const okR = !roleFilter || u.role_name === roleFilter;
        return okQ && okR;
      })
      .slice(0, 12);
  }, [users, search, roleFilter]);

  const roleOptions = useMemo(() => {
    const s = new Set(users.map((u) => u.role_name));
    return Array.from(s).sort();
  }, [users]);

  async function toggleUserActive(u: AdminUser) {
    setActingId(u.id);
    try {
      await updateAdminUser(u.id, {
        is_active: !u.is_active,
        reason: "Toggled from admin dashboard",
      });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x)));
    } catch {
      /* ignore */
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <div className="th-admin-dashboard flex justify-center py-20" style={{ background: ADMIN.surface, margin: "-24px -24px 0", minHeight: "60vh" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0F6E56] border-t-transparent" />
      </div>
    );
  }
  if (error) return <Alert variant="error" title="Error" message={error} />;
  if (!data) return null;

  const C: React.CSSProperties = {
    background: ADMIN.white,
    border: `0.5px solid ${ADMIN.borderLight}`,
    borderRadius: 12,
    padding: "14px 16px",
  };

  const TH: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    color: ADMIN.navy400,
    textAlign: "left",
    padding: "0 10px 9px 0",
    borderBottom: `0.5px solid ${ADMIN.borderLight}`,
  };

  const TD: React.CSSProperties = {
    fontSize: 12,
    color: ADMIN.navy900,
    padding: "9px 10px 9px 0",
    borderBottom: `0.5px solid ${ADMIN.borderLight}`,
    verticalAlign: "middle",
  };

  const healthBg =
    health.kind === "critical"
      ? { background: "#2E0F0F", borderBottom: `0.5px solid rgba(226,75,74,0.35)` }
      : health.kind === "warning"
        ? { background: "#2E2310", borderBottom: `0.5px solid rgba(239,159,39,0.3)` }
        : { background: "#1A3A2E", borderBottom: `0.5px solid rgba(93,202,165,0.25)` };

  const healthDot =
    health.kind === "critical"
      ? { background: ADMIN.red500, boxShadow: "0 0 6px rgba(226,75,74,0.6)" }
      : health.kind === "warning"
        ? { background: ADMIN.amber500, boxShadow: "0 0 6px rgba(239,159,39,0.5)" }
        : { background: ADMIN.green300, boxShadow: "0 0 6px rgba(93,202,165,0.5)" };

  const healthLabelColor =
    health.kind === "critical" ? ADMIN.red300 : health.kind === "warning" ? ADMIN.amber100 : ADMIN.green300;

  const apiHint =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL
      ? (() => {
          try {
            return new URL(process.env.NEXT_PUBLIC_API_BASE_URL).host;
          } catch {
            return "api";
          }
        })()
      : "api";

  const initials = (u: AdminUser) => {
    const a = u.first_name?.[0] ?? "";
    const b = u.last_name?.[0] ?? "";
    const f = (a + b).toUpperCase();
    return f || u.username.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className="th-admin-dashboard"
      style={{
        background: ADMIN.surface,
        margin: "-24px -24px 0",
        minHeight: "100%",
      }}
    >
      {/* Health banner */}
      <div style={{ padding: "11px 22px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0, ...healthBg }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, ...healthDot }} />
        <div style={{ fontSize: 12, fontWeight: 500, color: healthLabelColor }}>{health.label}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", flex: 1 }}>{health.desc}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <span
            className="th-admin-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 9px",
              borderRadius: 3,
              fontSize: 11,
              fontWeight: 500,
              background: "rgba(226,75,74,0.2)",
              color: ADMIN.red300,
            }}
          >
            {health.crit} critical
          </span>
          <span
            className="th-admin-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 9px",
              borderRadius: 3,
              fontSize: 11,
              fontWeight: 500,
              background: "rgba(239,159,39,0.15)",
              color: ADMIN.amber100,
            }}
          >
            {health.warn} warning
          </span>
          <span
            className="th-admin-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 9px",
              borderRadius: 3,
              fontSize: 11,
              fontWeight: 500,
              background: "rgba(55,138,221,0.15)",
              color: ADMIN.blue300,
            }}
          >
            {health.info} info
          </span>
        </div>
        <div className="th-admin-mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
          {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ·{" "}
          {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Topbar */}
      <div
        style={{
          background: ADMIN.white,
          borderBottom: `0.5px solid ${ADMIN.borderLight}`,
          padding: "10px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: ADMIN.navy900 }}>Admin dashboard</div>
          <div className="th-admin-mono" style={{ fontSize: 11, color: ADMIN.navy400, marginTop: 1 }}>
            {apiHint} · dashboard
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href="/notifications"
            style={{
              position: "relative",
              width: 32,
              height: 32,
              borderRadius: 8,
              background: ADMIN.surface,
              border: `0.5px solid ${ADMIN.borderMd}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: "none", stroke: ADMIN.navy400, strokeWidth: 1.8, strokeLinecap: "round" }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </Link>
          <Link
            href="/admin/users"
            style={{
              height: 32,
              padding: "0 12px",
              background: ADMIN.navy800,
              color: ADMIN.navy100,
              border: `0.5px solid ${ADMIN.navy600}`,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 5,
              textDecoration: "none",
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            Manage users
          </Link>
        </div>
      </div>

      <div style={{ padding: "18px 22px" }}>
        {userListError && (
          <p style={{ fontSize: 12, color: ADMIN.amber600, marginBottom: 12 }}>
            User list could not be loaded. Open <Link href="/admin/users">User management</Link> to manage accounts.
          </p>
        )}

        {/* KPI grid */}
        <div
          className="admin-kpi-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0,1fr))",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {[
            {
              label: "Total users",
              value: String(data.users.total),
              sub: null,
              trend: { dir: "up" as const, text: `+${data.users.new_last_30_days} last 30d` },
              valColor: undefined,
              delay: "0.03s",
            },
            {
              label: "Properties",
              value: String(data.properties.total),
              sub: `${data.properties.total_units} total units`,
              trend: null,
              valColor: undefined,
              delay: "0.06s",
            },
            {
              label: "Monthly revenue",
              value: `KES ${Number(data.billing.revenue_this_month).toLocaleString("en-KE")}`,
              sub: null,
              trend: null,
              valColor: ADMIN.green700,
              delay: "0.09s",
            },
            {
              label: "Occupancy",
              value: data.properties.occupancy_rate,
              sub: `${data.properties.occupied} / ${data.properties.total_units} units`,
              trend: null,
              valColor: undefined,
              delay: "0.12s",
            },
            {
              label: "Open disputes",
              value: String(disputeOpen),
              sub: `${data.disputes.under_review} under review`,
              trend: null,
              valColor: disputeOpen > 0 ? ADMIN.amber600 : undefined,
              delay: "0.15s",
            },
            {
              label: "Overdue invoices",
              value: String(overdue),
              sub: null,
              trend: overdue > 0 ? { dir: "down" as const, text: "review billing" } : null,
              valColor: overdue > 0 ? ADMIN.red600 : undefined,
              delay: "0.18s",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="th-admin-kpi"
              style={{
                background: ADMIN.white,
                border: `0.5px solid ${ADMIN.borderLight}`,
                borderRadius: 12,
                padding: "12px 14px",
                animationDelay: k.delay,
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: ADMIN.navy400, marginBottom: 6 }}>{k.label}</div>
              <div className="th-admin-mono" style={{ fontSize: 20, fontWeight: 600, color: k.valColor ?? ADMIN.navy900, lineHeight: 1 }}>
                {k.value}
              </div>
              {k.trend && (
                <div
                  className="th-admin-mono"
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    marginTop: 4,
                    color: k.trend.dir === "up" ? ADMIN.green500 : ADMIN.red500,
                  }}
                >
                  {k.trend.dir === "up" ? "↑" : "↓"} {k.trend.text}
                </div>
              )}
              {k.sub && !k.trend && (
                <div className="th-admin-mono" style={{ fontSize: 10, color: ADMIN.navy400, marginTop: 4 }}>
                  {k.sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Three columns */}
        <div className="admin-three-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={C}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase", color: ADMIN.navy400 }}>Platform metrics</div>
              <Link href="/billing" style={{ fontSize: 12, color: ADMIN.green500, fontWeight: 500, textDecoration: "none" }}>
                Billing →
              </Link>
            </div>
            {[
              { key: "Outstanding billing", val: `KES ${Number(data.billing.outstanding).toLocaleString("en-KE")}`, tone: Number(data.billing.outstanding) > 0 ? "red" : undefined },
              { key: "Open maintenance", val: String(data.maintenance.open), tone: data.maintenance.open > 0 ? "amber" : undefined },
              { key: "Maintenance in progress", val: String(data.maintenance.in_progress), tone: data.maintenance.in_progress > 0 ? "amber" : undefined },
              { key: "Moving · pending bookings", val: String(data.moving.pending_bookings), tone: data.moving.pending_bookings > 0 ? "amber" : undefined },
              { key: "Moving · completed (mo)", val: String(data.moving.completed_this_month), tone: "green" },
              { key: "New users (30d)", val: String(data.users.new_last_30_days), tone: "green" },
            ].map((row) => (
              <div
                key={row.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 0",
                  borderBottom: `0.5px solid ${ADMIN.borderLight}`,
                }}
              >
                <div style={{ fontSize: 12, color: ADMIN.navy700 }}>{row.key}</div>
                <div
                  className="th-admin-mono"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color:
                      row.tone === "green" ? ADMIN.green700 : row.tone === "amber" ? ADMIN.amber600 : row.tone === "red" ? ADMIN.red600 : ADMIN.navy900,
                  }}
                >
                  {row.val}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: ADMIN.navy400, marginBottom: 8 }}>
                Activity mix (maintenance)
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 32 }}>
                {[data.maintenance.submitted, data.maintenance.assigned, data.maintenance.open, data.maintenance.in_progress, data.maintenance.completed_this_month].map(
                  (h, i, arr) => {
                    const max = Math.max(1, ...arr);
                    const pct = Math.round((h / max) * 100);
                    return (
                      <div
                        key={i}
                        style={{
                          borderRadius: "2px 2px 0 0",
                          flex: 1,
                          minWidth: 6,
                          height: `${Math.max(8, pct)}%`,
                          background: i === arr.length - 1 ? ADMIN.green500 : ADMIN.navy200,
                          transition: "opacity 0.15s",
                        }}
                      />
                    );
                  },
                )}
              </div>
            </div>
          </div>

          <div style={C}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase", color: ADMIN.navy400 }}>Active alerts</div>
              <Link href="/admin/moderation" style={{ fontSize: 12, color: ADMIN.green500, fontWeight: 500, textDecoration: "none" }}>
                Moderation →
              </Link>
            </div>
            {overdue >= 10 && !ackOverdueAlert ? (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: `0.5px solid ${ADMIN.borderLight}` }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: ADMIN.amber500, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: ADMIN.navy900 }}>High overdue invoice count</div>
                  <div className="th-admin-mono" style={{ fontSize: 11, color: ADMIN.navy400, marginTop: 1 }}>
                    threshold ≥ 10 · {overdue} open
                  </div>
                </div>
                <div className="th-admin-mono" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: ADMIN.amber600, flexShrink: 0 }}>
                  {overdue}
                </div>
                <button
                  type="button"
                  onClick={() => setAckOverdueAlert(true)}
                  style={{
                    height: 22,
                    padding: "0 8px",
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    border: `0.5px solid ${ADMIN.amber100}`,
                    background: ADMIN.amber50,
                    color: ADMIN.amber600,
                    marginLeft: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  Ack
                </button>
              </div>
            ) : (
              <div style={{ padding: "16px 0", textAlign: "center", fontSize: 12, color: ADMIN.navy400 }}>No active threshold alerts</div>
            )}
            <div style={{ paddingTop: 12, borderTop: `0.5px solid ${ADMIN.borderLight}` }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: ADMIN.navy400, marginBottom: 8 }}>Thresholds</div>
              {[
                { k: "Overdue invoices", rule: "WARNING ≥ 10", c: ADMIN.amber600 },
                { k: "Disputes backlog", rule: "WARNING ≥ 3 open", c: ADMIN.navy400 },
                { k: "Occupancy", rule: "INFO < 70% portfolio", c: ADMIN.navy400 },
              ].map((r) => (
                <div
                  key={r.k}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: `0.5px solid ${ADMIN.borderLight}` }}
                >
                  <div style={{ fontSize: 12, color: ADMIN.navy700 }}>{r.k}</div>
                  <div className="th-admin-mono" style={{ fontSize: 10, color: r.c }}>
                    {r.rule}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={C}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase", color: ADMIN.navy400 }}>Users by role</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                <AdminRoleDonut slices={roleSlices} total={donutTotal} />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div className="th-admin-mono" style={{ fontSize: 16, fontWeight: 600, color: ADMIN.navy900, lineHeight: 1 }}>
                    {donutTotal}
                  </div>
                  <div style={{ fontSize: 9, color: ADMIN.navy400, marginTop: 1 }}>users</div>
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                {roleSlices.slice(0, 6).map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: ADMIN.navy700 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                      {s.label}
                    </div>
                    <div className="th-admin-mono" style={{ fontWeight: 500, color: ADMIN.navy900 }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* User management */}
        <div style={C}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase", color: ADMIN.navy400 }}>User management</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
                style={{
                  height: 30,
                  padding: "0 10px",
                  background: ADMIN.surface,
                  border: `0.5px solid ${ADMIN.borderMd}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: ADMIN.navy900,
                  width: 180,
                  outline: "none",
                }}
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  height: 30,
                  padding: "0 24px 0 9px",
                  background: ADMIN.surface,
                  border: `0.5px solid ${ADMIN.borderMd}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: ADMIN.navy900,
                  cursor: "pointer",
                  appearance: "none",
                }}
              >
                <option value="">All roles</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <Link href="/admin/users" style={{ fontSize: 12, color: ADMIN.green500, fontWeight: 500 }}>
                Full list →
              </Link>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={TH}>User</th>
                <th style={TH}>Role</th>
                <th style={TH}>Joined</th>
                <th style={TH}>Status</th>
                <th style={{ ...TH, paddingRight: 0 }} />
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...TD, border: "none", padding: "20px 0", textAlign: "center", color: ADMIN.navy400 }}>
                    No users match this filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} style={{ transition: "background 0.15s" }}>
                    <td style={TD}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#fff",
                            background: adminRoleDonutColor(u.role_name),
                            flexShrink: 0,
                          }}
                        >
                          {initials(u)}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: ADMIN.navy900 }}>
                            {u.first_name} {u.last_name}
                          </div>
                          <div className="th-admin-mono" style={{ fontSize: 11, color: ADMIN.navy400, marginTop: 1 }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={TD}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 7px",
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.2px",
                          textTransform: "uppercase",
                          ...adminRoleBadgeStyle(u.role_name),
                        }}
                      >
                        {u.role_name}
                      </span>
                    </td>
                    <td className="th-admin-mono" style={{ ...TD, fontSize: 11, color: ADMIN.navy400 }}>
                      {new Date(u.date_joined).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={TD}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: u.is_active ? ADMIN.green500 : ADMIN.navy200,
                          }}
                        />
                        <span style={{ fontSize: 11, color: u.is_active ? ADMIN.navy700 : ADMIN.navy400 }}>{u.is_active ? "Active" : "Inactive"}</span>
                      </div>
                    </td>
                    <td style={{ ...TD, paddingRight: 0 }}>
                      <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                        {u.is_active ? (
                          <button
                            type="button"
                            disabled={actingId === u.id}
                            onClick={() => toggleUserActive(u)}
                            style={{
                              height: 22,
                              padding: "0 8px",
                              borderRadius: 3,
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: actingId === u.id ? "wait" : "pointer",
                              fontFamily: "inherit",
                              border: `0.5px solid ${ADMIN.red300}`,
                              background: ADMIN.red50,
                              color: ADMIN.red600,
                              opacity: actingId === u.id ? 0.6 : 1,
                            }}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actingId === u.id}
                            onClick={() => toggleUserActive(u)}
                            style={{
                              height: 22,
                              padding: "0 8px",
                              borderRadius: 3,
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: actingId === u.id ? "wait" : "pointer",
                              fontFamily: "inherit",
                              border: `0.5px solid ${ADMIN.green300}`,
                              background: ADMIN.green50,
                              color: ADMIN.green700,
                              opacity: actingId === u.id ? 0.6 : 1,
                            }}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) {
          .admin-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 720px) {
          .admin-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 480px) {
          .admin-kpi-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 1100px) {
          .admin-three-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── Landlord Dashboard ──

function LandlordDash() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [unitLookup, setUnitLookup] = useState<Record<number, { unitLabel: string; propertyName: string }>>({});

  useEffect(() => {
    Promise.all([getDashboard(), listApplications(), listNotifications(true), listProperties()])
      .then(async ([dash, applications, notifs, properties]) => {
        const unitEntries = await Promise.all(
          properties.map(async (p: Property) => {
            try {
              const units = await listUnits(p.id);
              return units.map((u: Unit) => ({
                unitId: u.id,
                unitLabel: u.name || `Unit ${u.id}`,
                propertyName: p.name,
              }));
            } catch {
              return [];
            }
          }),
        );
        const lookup = unitEntries.flat().reduce<Record<number, { unitLabel: string; propertyName: string }>>((acc, item) => {
          acc[item.unitId] = { unitLabel: item.unitLabel, propertyName: item.propertyName };
          return acc;
        }, {});
        setData(dash);
        setApps(applications);
        setNotifications(notifs);
        setUnitLookup(lookup);
      })
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  async function handleApprove(id: number) {
    setActioningId(id);
    try {
      await approveApplication(id, {
        status: "approved",
        start_date: new Date().toISOString().slice(0, 10),
        rent_amount: "0",
      });
      setApps((prev) => prev.map((a) => a.id === id ? { ...a, status: "approved" as ApplicationStatus } : a));
    } catch { /* ignore */ } finally { setActioningId(null); }
  }

  async function handleReject(id: number) {
    setActioningId(id);
    try {
      await rejectApplication(id);
      setApps((prev) => prev.map((a) => a.id === id ? { ...a, status: "rejected" as ApplicationStatus } : a));
    } catch { /* ignore */ } finally { setActioningId(null); }
  }

  async function handleWithdraw(id: number) {
    setActioningId(id);
    try {
      await withdrawApplication(id);
      setApps((prev) => prev.map((a) => a.id === id ? { ...a, status: "withdrawn" as ApplicationStatus } : a));
    } catch {
      // ignore
    } finally {
      setActioningId(null);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <Alert variant="error" title="Error" message={error} />;
  if (!data) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.first_name ?? "there";
  const dateStr = new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const pendingApps = apps.filter((a) => a.status === "pending");

  // Vacancy drawer data
  const vacantUnits = data.properties.vacant_units;
  const occupancyPct = parseFloat(data.properties.occupancy_rate) || 0;
  const vacancyRate = 100 - occupancyPct;
  const collectedThisMonth = Number(data.billing.collected_this_month) || 0;
  const estimatedMonthlyVacancyImpact =
    data.properties.occupied_units > 0
      ? Math.round((collectedThisMonth / data.properties.occupied_units) * vacantUnits)
      : 0;
  const avgVacantPerProperty = data.properties.total > 0 ? (vacantUnits / data.properties.total).toFixed(1) : "0.0";
  const mostVacant = data.performance.by_property.reduce(
    (best, p) => {
      const vacant = p.total_units - p.occupied_units;
      if (!best || vacant > best.vacant) return { name: p.name, vacant };
      return best;
    },
    null as { name: string; vacant: number } | null,
  );

  function exportVacancyCsv() {
    const rows = [
      ["Property", "Total Units", "Occupied Units", "Vacant Units", "Vacancy Rate %"].join(","),
      ...(data?.performance?.by_property ?? []).map((p) => {
        const vacant = p.total_units - p.occupied_units;
        const rate = p.total_units > 0 ? Math.round((vacant / p.total_units) * 100) : 0;
        return [`"${p.name.replace(/"/g, '""')}"`, String(p.total_units), String(p.occupied_units), String(vacant), String(rate)].join(",");
      }),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `vacancy-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const C: React.CSSProperties = { background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "16px 18px" };
  const TH: React.CSSProperties = { fontSize: 11, fontWeight: 500, letterSpacing: "0.3px", textTransform: "uppercase", color: "#888780", textAlign: "left", paddingBottom: 9, paddingRight: 12, borderBottom: "0.5px solid rgba(0,0,0,0.08)" };
  const TD: React.CSSProperties = { fontSize: 12, color: "#444441", padding: "10px 12px 10px 0", borderBottom: "0.5px solid rgba(0,0,0,0.06)", verticalAlign: "middle" };

  return (
    <div style={{ background: "#F7F6F2", minHeight: "100%", margin: "-24px -24px 0" }}>

      {/* Topbar */}
      <div style={{ background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.08)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#1a1a1a" }}>{greeting}, {firstName}</div>
          <div style={{ fontSize: 12, color: "#888780", marginTop: 2 }}>{dateStr}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Notification bell */}
          <Link href="/notifications" style={{ position: "relative", width: 34, height: 34, borderRadius: 8, background: "#F7F6F2", border: "0.5px solid rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "none", stroke: "#444441", strokeWidth: 1.8, strokeLinecap: "round" }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifications.length > 0 && (
              <div style={{ position: "absolute", top: 7, right: 7, width: 6, height: 6, borderRadius: "50%", background: "#A32D2D", border: "1.5px solid #fff" }} />
            )}
          </Link>

          {vacantUnits > 0 && (
            <button onClick={() => setDrawerOpen(true)} style={{ height: 34, padding: "0 14px", background: "#FCEBEB", color: "#A32D2D", border: "0.5px solid #F09595", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "none", stroke: "#A32D2D", strokeWidth: 2, strokeLinecap: "round" }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {vacantUnits} vacanc{vacantUnits === 1 ? "y" : "ies"}
            </button>
          )}
          <Link href="/properties/new" style={{ height: 34, padding: "0 14px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round" }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add property
          </Link>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 24px" }}>

        {/* KPI grid */}
        <div className="th-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
          <KpiCard label="Monthly revenue" value={`KES ${Number(data.billing.collected_this_month).toLocaleString()}`} valueColor="#0F6E56" trend={null} delay="0.05s" />
          <KpiCard label="Occupancy rate" value={data.properties.occupancy_rate} sub={`${data.properties.occupied_units} of ${data.properties.total_units} units occupied`} delay="0.10s" />
          <KpiCard label="Outstanding invoices" value={`KES ${Number(data.billing.outstanding).toLocaleString()}`} valueColor={Number(data.billing.outstanding) > 0 ? "#854F0B" : undefined} sub={`${data.billing.overdue_invoices} invoice${data.billing.overdue_invoices !== 1 ? "s" : ""} pending`} delay="0.15s" />
          <KpiCard label="Open maintenance" value={String(data.maintenance.open)} valueColor={data.maintenance.open > 0 ? "#A32D2D" : undefined} sub={data.maintenance.assigned > 0 ? `${data.maintenance.assigned} awaiting artisan bid` : data.maintenance.open > 0 ? "Awaiting assignment" : "No open requests"} delay="0.20s" />
        </div>

        {/* Two-col: properties + at a glance */}
        <div className="th-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14, marginBottom: 14 }}>

          {/* Properties */}
          <div style={C}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>My properties</div>
              <Link href="/properties" style={{ fontSize: 12, color: "#1D9E75", textDecoration: "none" }}>View all →</Link>
            </div>
            {data.performance.by_property.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#888780" }}>No properties yet.</p>
                <Link href="/properties/new" style={{ fontSize: 12, color: "#1D9E75", marginTop: 6, display: "block" }}>Add your first property →</Link>
              </div>
            ) : data.performance.by_property.slice(0, 5).map((p) => {
              const pct = p.total_units > 0 ? (p.occupied_units / p.total_units) * 100 : 0;
              const warn = pct < 70;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "none", stroke: "#0F6E56", strokeWidth: 1.8, strokeLinecap: "round" }}>
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{p.total_units} units</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ width: 64, height: 4, background: "#D3D1C7", borderRadius: 2, marginBottom: 4, marginLeft: "auto" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: warn ? "#EF9F27" : "#1D9E75" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#888780" }}>{p.occupied_units} / {p.total_units} occupied</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent activity */}
          <div style={C}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", marginBottom: 14 }}>Recent activity</div>
            {(() => {
              const items: { dot: string; text: string; sub: string; href: string }[] = [];
              if (data.applications.pending > 0)
                items.push({ dot: "#EF9F27", text: `${data.applications.pending} pending application${data.applications.pending !== 1 ? "s" : ""}`, sub: "Awaiting your review", href: "/applications" });
              if (data.applications.approved_this_month > 0)
                items.push({ dot: "#1D9E75", text: `${data.applications.approved_this_month} application${data.applications.approved_this_month !== 1 ? "s" : ""} approved this month`, sub: "New tenants onboarded", href: "/applications" });
              if (data.billing.overdue_invoices > 0)
                items.push({ dot: "#A32D2D", text: `${data.billing.overdue_invoices} invoice${data.billing.overdue_invoices !== 1 ? "s" : ""} overdue`, sub: `KES ${Number(data.billing.outstanding).toLocaleString()} outstanding`, href: "/billing" });
              if (data.maintenance.open > 0)
                items.push({ dot: "#EF9F27", text: `${data.maintenance.open} open maintenance request${data.maintenance.open !== 1 ? "s" : ""}`, sub: data.maintenance.assigned > 0 ? `${data.maintenance.assigned} assigned` : "Awaiting assignment", href: "/maintenance" });
              data.leases_ending_soon.slice(0, 2).forEach((l) =>
                items.push({ dot: l.days_remaining <= 14 ? "#A32D2D" : "#EF9F27", text: `Lease ending · ${l.unit}`, sub: `${l.tenant} · ${l.days_remaining} days remaining`, href: "/properties" })
              );
              if (data.adverts.count > 0)
                items.push({ dot: "#1D9E75", text: `${data.adverts.count} unit${data.adverts.count !== 1 ? "s" : ""} advertised`, sub: "Listed for rent", href: "/properties" });
              if (items.length === 0)
                items.push({ dot: "#D3D1C7", text: "All clear", sub: "No recent activity to show", href: "/" });
              return items.slice(0, 6).map((item, i) => (
                <Link key={i} href={item.href} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: "0.5px solid rgba(0,0,0,0.08)", textDecoration: "none" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.dot, flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <div style={{ fontSize: 12, color: "#1a1a1a", lineHeight: 1.4 }}>{item.text}</div>
                    <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{item.sub}</div>
                  </div>
                </Link>
              ));
            })()}
          </div>
        </div>

        {/* Pending applications table */}
        <div style={C}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>Pending applications</div>
            <Link href="/applications" style={{ fontSize: 12, color: "#1D9E75", textDecoration: "none" }}>View all →</Link>
          </div>
          {pendingApps.length === 0 ? (
            <p style={{ fontSize: 13, color: "#888780", padding: "12px 0" }}>No pending applications.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={TH}>Applicant</th>
                  <th style={TH}>Unit</th>
                  <th style={TH}>Property</th>
                  <th style={TH}>Applied</th>
                  <th style={TH}>Status</th>
                  <th style={{ ...TH, paddingRight: 0 }}></th>
                </tr>
              </thead>
              <tbody>
                {pendingApps.slice(0, 5).map((a) => {
                  const acting = actioningId === a.id;
                  const unitInfo = unitLookup[a.unit];
                  const statusColors: Record<ApplicationStatus, { bg: string; color: string }> = {
                    pending:   { bg: "#FAEEDA", color: "#854F0B" },
                    approved:  { bg: "#E1F5EE", color: "#085041" },
                    rejected:  { bg: "#FCEBEB", color: "#791F1F" },
                    withdrawn: { bg: "#F1EFE8", color: "#444441" },
                  };
                  const sc = statusColors[a.status];
                  return (
                    <tr key={a.id}>
                      <td style={{ ...TD, fontWeight: 500, color: "#1a1a1a" }}>Applicant #{a.applicant}</td>
                      <td style={TD}>{unitInfo?.unitLabel ?? `Unit #${a.unit}`}</td>
                      <td style={TD}>{unitInfo?.propertyName ?? "—"}</td>
                      <td style={TD}>{new Date(a.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td style={TD}>
                        <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: sc.bg, color: sc.color }}>
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ ...TD, paddingRight: 0 }}>
                        {a.status === "pending" && (
                          <div style={{ display: "flex", gap: 5 }}>
                            <button disabled={acting} onClick={() => handleApprove(a.id)} style={{ height: 24, padding: "0 9px", borderRadius: 5, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: "#E1F5EE", color: "#085041", border: "0.5px solid #5DCAA5", opacity: acting ? 0.5 : 1 }}>
                              Approve
                            </button>
                            <button disabled={acting} onClick={() => handleReject(a.id)} style={{ height: 24, padding: "0 9px", borderRadius: 5, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: "#FCEBEB", color: "#791F1F", border: "0.5px solid #F09595", opacity: acting ? 0.5 : 1 }}>
                              Reject
                            </button>
                          </div>
                        )}
                        {a.status === "approved" && (
                          <button disabled={acting} onClick={() => handleWithdraw(a.id)} style={{ height: 24, padding: "0 9px", borderRadius: 5, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: "#F1EFE8", color: "#444441", border: "0.5px solid rgba(0,0,0,0.18)", opacity: acting ? 0.5 : 1 }}>
                            Withdraw
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Vacancy drawer */}
      {drawerOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", justifyContent: "flex-end" }}
          role="dialog"
          aria-modal="true"
          aria-label="Vacancy report"
        >
          <div style={{ width: 520, background: "#fff", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)", transform: "translateX(0)", transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
            {/* Drawer head */}
            <div style={{ padding: "16px 20px", borderBottom: "0.5px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>Vacancy report</div>
                <div style={{ fontSize: 12, color: "#888780", marginTop: 2 }}>As of {dateStr} · All properties</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ width: 30, height: 30, borderRadius: 8, background: "#F7F6F2", border: "0.5px solid rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg viewBox="0 0 14 14" style={{ width: 14, height: 14, fill: "none", stroke: "#444441", strokeWidth: 2, strokeLinecap: "round" }}>
                  <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
                </svg>
              </button>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>

              {/* Summary stats */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#888780", marginBottom: 10 }}>Summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[
                    { label: "Vacant units", value: vacantUnits, color: "#A32D2D", hint: `of ${data.properties.total_units} total` },
                    { label: "Vacancy rate", value: `${Math.round(vacancyRate)}%`, color: vacancyRate > 15 ? "#854F0B" : "#1a1a1a", hint: "target < 10%" },
                    { label: "Avg vacant/property", value: avgVacantPerProperty, color: "#1a1a1a", hint: `${data.properties.total} properties` },
                  ].map(({ label, value, color, hint }) => (
                    <div key={label} style={{ background: "#F7F6F2", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontSize: 11, color: "#888780", marginBottom: 5 }}>{label}</div>
                      <div style={{ fontSize: 20, fontWeight: 500, color }}>{value}</div>
                      <div style={{ fontSize: 11, color: "#888780", marginTop: 3 }}>{hint}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 22, background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#F7C1C1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "none", stroke: "#A32D2D", strokeWidth: 2, strokeLinecap: "round" }}>
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#A32D2D", marginBottom: 2 }}>Estimated monthly vacancy impact</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: "#791F1F" }}>KES {estimatedMonthlyVacancyImpact.toLocaleString("en-KE")}</div>
                  <div style={{ fontSize: 11, color: "#A32D2D", marginTop: 2 }}>
                    Approximation from collected rent per occupied unit.
                    {mostVacant ? ` Highest vacancy: ${mostVacant.name} (${mostVacant.vacant} units).` : ""}
                  </div>
                </div>
              </div>

              {/* Vacancy by property */}
              {data.performance.by_property.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#888780", marginBottom: 10 }}>Vacancy by property</div>
                  {data.performance.by_property.map((p) => {
                    const vPct = p.total_units > 0 ? ((p.total_units - p.occupied_units) / p.total_units) * 100 : 0;
                    const isHigh = vPct > 20;
                    return (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                        <div style={{ fontSize: 12, color: "#888780", minWidth: 160, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                        <div style={{ flex: 1, height: 8, background: "#D3D1C7", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(vPct, 100)}%`, borderRadius: 4, background: isHigh ? "#A32D2D" : "#EF9F27", transition: "width 0.5s" }} />
                        </div>
                        <div style={{ fontSize: 11, color: "#888780", minWidth: 34 }}>{Math.round(vPct)}%</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Vacant units per property */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#888780", marginBottom: 10 }}>Vacant units</div>
                {data.performance.by_property.filter((p) => p.occupied_units < p.total_units).length === 0 ? (
                  <p style={{ fontSize: 13, color: "#888780" }}>No vacant units — fully occupied.</p>
                ) : data.performance.by_property.filter((p) => p.occupied_units < p.total_units).map((p) => {
                  const vacant = p.total_units - p.occupied_units;
                  return (
                    <div key={p.id} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "#F7F6F2", borderRadius: "8px 8px 0 0", border: "0.5px solid rgba(0,0,0,0.08)", borderBottom: "none" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: "#888780", marginTop: 1 }}>{vacant} vacant unit{vacant !== 1 ? "s" : ""}</div>
                        </div>
                        <Link href="/properties" style={{ fontSize: 12, fontWeight: 500, color: "#0F6E56", textDecoration: "none" }}>View →</Link>
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                        <thead>
                          <tr>
                            {["Units vacant", "Occupancy", "Action"].map((h) => (
                              <th key={h} style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.3px", textTransform: "uppercase", color: "#888780", textAlign: "left", padding: "7px 10px", background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontSize: 12, color: "#A32D2D", fontWeight: 500, padding: "9px 10px", background: "#fff" }}>{vacant}</td>
                            <td style={{ fontSize: 12, color: "#444441", padding: "9px 10px", background: "#fff" }}>{p.occupied_units}/{p.total_units}</td>
                            <td style={{ padding: "9px 10px", background: "#fff" }}>
                              <Link href="/properties" style={{ display: "inline-flex", height: 24, padding: "0 9px", alignItems: "center", borderRadius: 5, fontSize: 11, fontWeight: 500, background: "#E1F5EE", color: "#085041", border: "0.5px solid #5DCAA5", textDecoration: "none" }}>
                                List units
                              </Link>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Drawer footer */}
            <div style={{ padding: "12px 20px", borderTop: "0.5px solid rgba(0,0,0,0.08)", display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={exportVacancyCsv}
                style={{ flex: 1, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#fff", color: "#1a1a1a", border: "0.5px solid rgba(0,0,0,0.12)", cursor: "pointer", fontFamily: "inherit" }}
              >
                Export CSV
              </button>
              <Link href="/properties" style={{ flex: 1, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#0F6E56", color: "#fff", textDecoration: "none" }}>
                List all vacant units
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes th-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .th-kpi { animation: th-fade-in 0.3s ease both; }
        @media (max-width: 900px) { .th-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; } .th-two-col { grid-template-columns: 1fr !important; } }
        @media (max-width: 600px) { .th-kpi-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function KpiCard({ label, value, valueColor, sub, trend, delay }: { label: string; value: string; valueColor?: string; sub?: string; trend?: { dir: "up" | "down"; text: string } | null; delay?: string }) {
  return (
    <div className="th-kpi" style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "14px 16px", animationDelay: delay }}>
      <div style={{ fontSize: 11, color: "#888780", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.3px" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: valueColor ?? "#1a1a1a", lineHeight: 1 }}>{value}</div>
      {trend && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 500, marginTop: 5, color: trend.dir === "up" ? "#0F6E56" : "#A32D2D" }}>
          {trend.dir === "up" ? "↑" : "↓"} {trend.text}
        </div>
      )}
      {sub && !trend && <div style={{ fontSize: 11, color: "#888780", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ── Tenant Dashboard ──

function TenantDash() {
  const [data, setData] = useState<TenantDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTenantDashboard()
      .then(setData)
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Alert variant="error" title="Error" message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Tenant Dashboard</h1>

      {data.active_lease ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">Active Lease</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Unit" value={data.active_lease.unit} sub={data.active_lease.property} />
            <StatCard label="Rent" value={`KES ${data.active_lease.rent_amount}`} />
            <StatCard label="Ends" value={data.active_lease.end_date} sub={`${data.active_lease.days_remaining} days remaining`} />
            <StatCard label="Open Requests" value={data.maintenance.open_requests} />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 dark:text-gray-400">No active lease. <Link href="/applications" className="text-brand-500 hover:text-brand-600">Browse available units</Link>.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending Invoices" value={data.invoices.pending} />
        <StatCard label="Overdue Invoices" value={data.invoices.overdue} />
        <StatCard label="Unread Notifications" value={data.notifications.unread} />
      </div>

      {data.invoices.next_due && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Next Invoice Due</p>
              <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">KES {data.invoices.next_due.amount}</p>
              <p className="text-xs text-gray-400">Due {data.invoices.next_due.due_date}</p>
            </div>
            <Link href="/billing">
              <Badge variant="light" color={data.invoices.next_due.status === "overdue" ? "error" : "warning"}>{data.invoices.next_due.status}</Badge>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Agent Dashboard ──

function AgentDash() {
  const [data, setData] = useState<AgentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAgentDashboard()
      .then(setData)
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Alert variant="error" title="Error" message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Agent Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned Properties" value={data.assigned_properties.count} />
        <StatCard label="Occupancy" value={data.assigned_properties.occupancy_rate} sub={`${data.assigned_properties.occupied_units} / ${data.assigned_properties.total_units} units`} />
        <StatCard label="Pending Applications" value={data.pending_applications} />
        <StatCard label="Open Maintenance" value={data.open_maintenance_requests} />
      </div>

      {data.assigned_properties.items.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Assigned Properties</h2>
          <div className="space-y-2">
            {data.assigned_properties.items.map((p) => (
              <Link key={p.id} href={`/properties/${p.id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600">
                <div>
                  <span className="font-medium text-gray-800 dark:text-white/90">{p.name}</span>
                  <span className="ml-2 text-sm text-gray-400">{p.property_type}</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{p.occupied_units}/{p.total_units} occupied</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Artisan Dashboard ──

function ArtisanDash() {
  const [data, setData] = useState<ArtisanDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getArtisanDashboard()
      .then(setData)
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Alert variant="error" title="Error" message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Artisan Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Trade" value={data.trade} />
        <StatCard label="Open Jobs" value={data.open_jobs.count} />
        <StatCard label="Completed This Month" value={data.completed_this_month} />
      </div>

      {data.open_jobs.items.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Open Jobs</h2>
          <div className="space-y-2">
            {data.open_jobs.items.map((j) => (
              <Link key={j.id} href={`/maintenance/${j.id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition hover:border-gray-300 dark:border-gray-700">
                <div>
                  <span className="font-medium text-gray-800 dark:text-white/90">{j.title}</span>
                  <span className="ml-2 text-xs text-gray-400">{j.category}</span>
                </div>
                <Badge variant="light" size="sm" color={j.priority === "urgent" ? "error" : j.priority === "high" ? "warning" : "primary"}>{j.priority}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.active_bids.items.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Active Bids ({data.active_bids.count})</h2>
          <div className="space-y-2">
            {data.active_bids.items.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                <div>
                  <span className="font-medium text-gray-800 dark:text-white/90">{b.request_title}</span>
                  <span className="ml-2 text-sm text-gray-400">KES {b.proposed_price}</span>
                </div>
                <Badge variant="light" size="sm" color={b.status === "pending" ? "warning" : "success"}>{b.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Moving Company Dashboard ──

function MovingDash() {
  const [data, setData] = useState<MovingCompanyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMovingCompanyDashboard()
      .then(setData)
      .catch(() => setError("Failed to load dashboard. Please set up your company profile first."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Alert variant="error" title="Error" message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">{data.company_name}</h1>
        {data.is_verified && <Badge variant="light" color="success">Verified</Badge>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Bookings" value={data.bookings.total} />
        <StatCard label="Pending" value={data.bookings.pending} />
        <StatCard label="Confirmed" value={data.bookings.confirmed} />
        <StatCard label="Completed This Month" value={data.bookings.completed_this_month} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Average Rating" value={data.reviews.average_rating.toFixed(1)} sub={`${data.reviews.total} reviews`} />
        <StatCard label="In Progress" value={data.bookings.in_progress} />
      </div>

      {data.reviews.recent.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Recent Reviews</h2>
          <div className="space-y-3">
            {data.reviews.recent.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 dark:text-white/90">{r.reviewer_name}</span>
                  <span className="text-sm text-yellow-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared components ──

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

