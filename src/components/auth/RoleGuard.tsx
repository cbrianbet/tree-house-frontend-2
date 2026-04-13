"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

interface RoleGuardProps {
  /** Role names (strings) that are permitted to see the children. */
  allowed: string[];
  children: React.ReactNode;
  /** Custom fallback rendered when access is denied. Defaults to an inline 403 message. */
  fallback?: React.ReactNode;
}

/**
 * Renders children only when the current user's role is in the `allowed` list.
 * On mismatch, shows an inline "You don't have permission" message (no redirect).
 *
 * Usage:
 *   <RoleGuard allowed={["Admin", "Landlord"]}>
 *     <SensitiveSection />
 *   </RoleGuard>
 */
export default function RoleGuard({ allowed, children, fallback }: RoleGuardProps) {
  const { user, roles, loading } = useAuth();

  if (loading) return null;

  const currentRoleName = roles.find((r) => r.id === user?.role)?.name ?? "";
  const permitted = !!user && allowed.includes(currentRoleName);

  if (!permitted) {
    return <>{fallback ?? <ForbiddenMessage />}</>;
  }

  return <>{children}</>;
}

function ForbiddenMessage() {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 16px",
        background: "#FEF2F2",
        border: "1px solid #FECACA",
        borderRadius: "10px",
        color: "#B91C1C",
        fontSize: "0.875rem",
        lineHeight: 1.5,
      }}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        style={{ width: 18, height: 18, flexShrink: 0, color: "#DC2626" }}
        aria-hidden="true"
      >
        <path
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm0-12v4m0 4h.01"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span>
        <strong style={{ fontWeight: 600 }}>Access restricted.</strong>{" "}
        You don&apos;t have permission to view this content.
      </span>
    </div>
  );
}
