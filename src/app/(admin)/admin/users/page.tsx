"use client";
import React, { useEffect, useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  listAdminUsers,
  getAdminUserDetail,
  updateAdminUser,
} from "@/lib/api/dashboards";
import { getRoles } from "@/lib/api/auth";
import type { AdminUser, AdminUserDetail, Role } from "@/types/api";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import PageLoader from "@/components/ui/PageLoader";

import { ROLE_ADMIN } from "@/constants/roles";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === ROLE_ADMIN;

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    Promise.all([
      listAdminUsers(),
      getRoles(),
    ])
      .then(([u, r]) => { setUsers(u); setRoles(r); })
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  async function handleSearch() {
    setLoading(true);
    try {
      const data = await listAdminUsers({
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data);
    } catch {
      setError("Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(id: number) {
    try {
      const d = await getAdminUserDetail(id);
      setDetail(d);
    } catch {
      setError("Failed to load user details.");
    }
  }

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!detail) return;
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const newRole = parseInt(fd.get("role") as string, 10);
    const isActive = fd.get("is_active") === "on";
    const reason = fd.get("reason") as string;
    try {
      await updateAdminUser(detail.user.id, {
        role: newRole !== detail.user.role ? newRole : undefined,
        is_active: isActive,
        reason: reason || undefined,
      });
      setSuccess("User updated.");
      const updated = await getAdminUserDetail(detail.user.id);
      setDetail(updated);
      handleSearch();
    } catch {
      setError("Failed to update user.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) return <Alert variant="error" title="Forbidden" message="Admin only." />;

  if (detail) {
    return (
      <div>
        <button onClick={() => setDetail(null)} className="mb-4 text-sm text-brand-500 hover:text-brand-600">&larr; Back to users</button>

        {error && <div className="mb-4"><Alert variant="error" title="Error" message={error} /></div>}
        {success && <div className="mb-4"><Alert variant="success" title="Success" message={success} /></div>}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            {detail.user.first_name} {detail.user.last_name} (@{detail.user.username})
          </h2>
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-400">Email:</span> <span className="text-gray-800 dark:text-white/90">{detail.user.email}</span></div>
            <div><span className="text-gray-400">Phone:</span> <span className="text-gray-800 dark:text-white/90">{detail.user.phone}</span></div>
            <div><span className="text-gray-400">Role:</span> <Badge variant="light" size="sm" color="primary">{detail.user.role_name}</Badge></div>
            <div><span className="text-gray-400">Active:</span> <Badge variant="light" size="sm" color={detail.user.is_active ? "success" : "error"}>{detail.user.is_active ? "Yes" : "No"}</Badge></div>
            <div><span className="text-gray-400">Joined:</span> <span className="text-gray-800 dark:text-white/90">{new Date(detail.user.date_joined).toLocaleDateString()}</span></div>
          </div>

          <form onSubmit={handleUpdate} className="mt-4 space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <h3 className="font-medium text-gray-800 dark:text-white/90">Update User</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label>Role</Label>
                <select name="role" defaultValue={detail.user.role} className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:text-white/90">
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Reason (optional)</Label>
                <Input name="reason" placeholder="Reason for change" />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" name="is_active" defaultChecked={detail.user.is_active} />
                  Active
                </label>
              </div>
            </div>
            <Button size="sm" disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
          </form>
        </div>

        {detail.role_change_history.length > 0 && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Role Change History</h3>
            <div className="space-y-2">
              {detail.role_change_history.map((log) => (
                <div key={log.id} className="rounded-lg border border-gray-100 p-3 text-sm dark:border-gray-700">
                  <span className="text-gray-800 dark:text-white/90">{log.old_role_name} &rarr; {log.new_role_name}</span>
                  <span className="ml-2 text-gray-400">by @{log.changed_by_username}</span>
                  {log.reason && <span className="ml-2 text-gray-400">— {log.reason}</span>}
                  <span className="ml-2 text-xs text-gray-400">{new Date(log.changed_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">User Management</h1>

      {error && <div className="mb-4"><Alert variant="error" title="Error" message={error} /></div>}

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          placeholder="Search username, email, name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:text-white/90">
          <option value="">All Roles</option>
          {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
        <Button size="sm" onClick={handleSearch}>Search</Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : users.length === 0 ? (
        <p className="text-gray-400">No users found.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 font-medium text-gray-500">Username</th>
              <th className="px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 font-medium text-gray-500">Active</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-gray-800 dark:text-white/90">@{u.username}</td>
                  <td className="px-4 py-3 text-gray-500">{u.first_name} {u.last_name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><Badge variant="light" size="sm" color="primary">{u.role_name}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="light" size="sm" color={u.is_active ? "success" : "error"}>{u.is_active ? "Yes" : "No"}</Badge></td>
                  <td className="px-4 py-3"><button onClick={() => openDetail(u.id)} className="text-sm text-brand-500 hover:text-brand-600">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
