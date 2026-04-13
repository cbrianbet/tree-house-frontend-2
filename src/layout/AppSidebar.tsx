"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import {
  ROLE_ADMIN,
  ROLE_TENANT,
  ROLE_LANDLORD,
  ROLE_AGENT,
  ROLE_ARTISAN,
  ROLE_MOVING,
} from "@/constants/roles";

// ── Inline SVG icons ─────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}
function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  );
}
function IconDollar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
function IconWrench() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}
function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function IconMessage() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
function IconTruck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

// ── Nav data by role ─────────────────────────────────────────────────────────

type NavItem = { name: string; path: string; icon: React.ReactNode };
type NavSection = { label: string; items: NavItem[] };

function getNavSections(roleId: number): NavSection[] {
  const sections: NavSection[] = [];

  // Portfolio
  const portfolio: NavItem[] = [
    { name: "Dashboard", path: "/", icon: <IconDashboard /> },
  ];
  if ([ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT].includes(roleId)) {
    portfolio.push(
      { name: "Properties", path: "/properties", icon: <IconHome /> },
      { name: "Tenants", path: "/tenant", icon: <IconUsers /> },
    );
  }
  if ([ROLE_ADMIN, ROLE_LANDLORD, ROLE_TENANT].includes(roleId)) {
    portfolio.push({ name: "Applications", path: "/applications", icon: <IconDoc /> });
  }
  sections.push({ label: "Portfolio", items: portfolio });

  // Finance
  if ([ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT, ROLE_TENANT].includes(roleId)) {
    const finance: NavItem[] = [
      { name: "Invoices", path: "/billing", icon: <IconCard /> },
    ];
    if ([ROLE_ADMIN, ROLE_LANDLORD].includes(roleId)) {
      finance.push(
        { name: "Expenses", path: "/billing/finances", icon: <IconDollar /> },
        { name: "Reports", path: "/billing/reports", icon: <IconChart /> },
      );
    }
    sections.push({ label: "Finance", items: finance });
  }

  // Operations
  const ops: NavItem[] = [];
  if ([ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT, ROLE_TENANT, ROLE_ARTISAN].includes(roleId)) {
    ops.push({ name: "Maintenance", path: "/maintenance", icon: <IconWrench /> });
  }
  if ([ROLE_ADMIN, ROLE_LANDLORD, ROLE_TENANT, ROLE_AGENT].includes(roleId)) {
    ops.push({ name: "Disputes", path: "/disputes", icon: <IconAlert /> });
  }
  ops.push(
    {
      name: roleId === ROLE_MOVING ? "Bookings" : "Moving",
      path: "/moving",
      icon: <IconTruck />,
    },
    { name: "Messages", path: "/messages", icon: <IconMessage /> },
    { name: "Notifications", path: "/notifications", icon: <IconBell /> },
  );
  sections.push({ label: "Operations", items: ops });

  if (roleId === ROLE_ADMIN) {
    sections.push({
      label: "Admin",
      items: [
        { name: "Users", path: "/admin/users", icon: <IconUsers /> },
        { name: "Moderation", path: "/admin/moderation", icon: <IconAlert /> },
      ],
    });
  }

  sections.push({
    label: "General",
    items: [
      { name: "Saved Searches", path: "/saved-searches", icon: <IconSearch /> },
      { name: "Settings", path: "/settings", icon: <IconSettings /> },
    ],
  });

  return sections;
}

/** DESIGN.md — role-assigned sidebar backgrounds (never use one color for all roles). */
function getSidebarChrome(roleId: number) {
  switch (roleId) {
    case ROLE_ADMIN:
      return {
        bg: "#0D1520",
        brandBorder: "0.5px solid rgba(255,255,255,0.07)",
        footerBorder: "0.5px solid rgba(255,255,255,0.07)",
        logoTileBg: "#0F6E56",
        logoTileBorder: undefined as string | undefined,
        avatarBg: "#1E2E42",
        avatarBorder: "1px solid #28405A",
        sectionLabel: "rgba(255,255,255,0.22)",
      };
    case ROLE_AGENT:
      return {
        bg: "#16191E",
        brandBorder: "0.5px solid rgba(255,255,255,0.08)",
        footerBorder: "0.5px solid rgba(255,255,255,0.08)",
        logoTileBg: "rgba(255,255,255,0.12)",
        logoTileBorder: undefined as string | undefined,
        avatarBg: "#2a3038",
        avatarBorder: "1px solid rgba(255,255,255,0.12)",
        sectionLabel: "rgba(255,255,255,0.35)",
      };
    case ROLE_ARTISAN:
      return {
        bg: "#1C2128",
        brandBorder: "0.5px solid rgba(255,255,255,0.08)",
        footerBorder: "0.5px solid rgba(255,255,255,0.08)",
        logoTileBg: "rgba(255,255,255,0.1)",
        logoTileBorder: undefined as string | undefined,
        avatarBg: "#2d333b",
        avatarBorder: "1px solid rgba(255,255,255,0.1)",
        sectionLabel: "rgba(255,255,255,0.35)",
      };
    default:
      /* Landlord, Tenant, MovingCompany — forest green */
      return {
        bg: "#0F6E56",
        brandBorder: "0.5px solid rgba(255,255,255,0.1)",
        footerBorder: "0.5px solid rgba(255,255,255,0.1)",
        logoTileBg: "rgba(255,255,255,0.15)",
        logoTileBorder: undefined as string | undefined,
        avatarBg: "#1D9E75",
        avatarBorder: undefined as string | undefined,
        sectionLabel: "rgba(255,255,255,0.35)",
      };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();
  const { user, roleName, logout } = useAuth();

  if (!user) return null;

  const chrome = getSidebarChrome(user.role);
  const sections = getNavSections(user.role);
  const initials =
    `${user.first_name?.charAt(0) ?? ""}${user.last_name?.charAt(0) ?? ""}`.toUpperCase() ||
    "U";

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen flex flex-col overflow-y-auto transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ width: 220, background: chrome.bg }}
      >
        {/* Brand */}
        <div
          style={{
            padding: "18px 16px 16px",
            borderBottom: chrome.brandBorder,
            display: "flex",
            alignItems: "center",
            gap: 9,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: chrome.logoTileBg,
              border: chrome.logoTileBorder,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 17, height: 17, fill: "#fff" }}>
              <path d="M12 2L2 9h3v11h6v-6h2v6h6V9h3L12 2z" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: "-0.3px",
              flex: 1,
              minWidth: 0,
            }}
          >
            Tree House
          </span>
          {user.role === ROLE_ADMIN && (
            <span
              style={{
                flexShrink: 0,
                background: "rgba(224,75,74,0.2)",
                color: "#F09595",
                fontSize: 10,
                fontWeight: 500,
                padding: "2px 7px",
                borderRadius: 4,
                fontFamily: '"Geist Mono", ui-monospace, monospace',
              }}
            >
              ADMIN
            </span>
          )}
        </div>

        {/* Nav */}
        <div style={{ flex: 1, paddingBottom: 8 }}>
          {sections.map((section) => (
            <div key={section.label}>
              <div
                style={{
                  padding: "14px 14px 4px",
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  color: chrome.sectionLabel,
                }}
              >
                {section.label}
              </div>
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={isMobileOpen ? toggleMobileSidebar : undefined}
                    className="th-sb-link"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "8px 10px",
                      margin: "1px 8px",
                      borderRadius: 6,
                      fontSize: 13,
                      color: active ? "#fff" : "rgba(255,255,255,0.65)",
                      background: active ? "rgba(255,255,255,0.16)" : "transparent",
                      fontWeight: active ? 500 : 400,
                      textDecoration: "none",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* User footer */}
        <div
          style={{
            padding: 12,
            borderTop: chrome.footerBorder,
            display: "flex",
            alignItems: "center",
            gap: 9,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: chrome.avatarBg,
              border: chrome.avatarBorder,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 600,
              color: user.role === ROLE_ADMIN ? "#B8CCDB" : "#fff",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.85)",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.first_name} {user.last_name}
            </div>
            <div
              style={{
                fontSize: 10,
                color: user.role === ROLE_ADMIN ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.4)",
                marginTop: 1,
                fontFamily: user.role === ROLE_ADMIN ? '"Geist Mono", ui-monospace, monospace' : "inherit",
              }}
            >
              {user.role === ROLE_ADMIN && user.is_staff ? "is_staff=true" : roleName(user.role)}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="th-sb-logout"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, opacity: 0.4, flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      <style>{`
        .th-sb-link:hover { background: rgba(255,255,255,0.08) !important; color: #fff !important; }
        .th-sb-logout:hover { opacity: 0.8 !important; }
      `}</style>
    </>
  );
};

export default AppSidebar;
