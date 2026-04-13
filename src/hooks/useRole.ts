"use client";

import { useAuth } from "@/context/AuthContext";

/**
 * Returns the current user's role name and ID.
 * Built on the existing AuthContext — no separate store needed.
 */
export function useRole() {
  const { user, roleName, loading } = useAuth();

  const roleId = user?.role ?? null;
  const name = roleId !== null ? roleName(roleId) : null;

  return {
    /** Numeric role ID from the user object */
    roleId,
    /** Human-readable role name resolved from GET /api/auth/roles/ */
    roleName: name,
    /** False once the auth check has completed */
    loading,
  };
}
