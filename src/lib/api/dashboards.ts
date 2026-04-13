import api from "./client";
import type {
  AdminDashboard,
  AdminUser,
  AdminUserDetail,
  ModerationReview,
  TenantDashboard,
  ArtisanDashboard,
  AgentDashboard,
  MovingCompanyDashboard,
} from "@/types/api";

// ── Admin ──

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const res = await api.get<AdminDashboard>("/api/dashboard/admin/");
  return res.data;
}

export async function listAdminUsers(params?: {
  role?: string;
  search?: string;
  is_active?: boolean;
}): Promise<AdminUser[]> {
  const query = new URLSearchParams();
  if (params?.role) query.set("role", params.role);
  if (params?.search) query.set("search", params.search);
  if (params?.is_active !== undefined)
    query.set("is_active", String(params.is_active));
  const qs = query.toString();
  const res = await api.get<AdminUser[]>(
    `/api/dashboard/admin/users/${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function getAdminUserDetail(
  id: number,
): Promise<AdminUserDetail> {
  const res = await api.get<AdminUserDetail>(
    `/api/dashboard/admin/users/${id}/`,
  );
  return res.data;
}

export async function updateAdminUser(
  id: number,
  data: { role?: number; is_active?: boolean; reason?: string },
): Promise<AdminUser> {
  const res = await api.put<AdminUser>(
    `/api/dashboard/admin/users/${id}/`,
    data,
  );
  return res.data;
}

export async function listModerationReviews(
  type?: "property" | "tenant",
): Promise<ModerationReview[]> {
  const params = type ? `?type=${type}` : "";
  const res = await api.get<ModerationReview[]>(
    `/api/dashboard/admin/moderation/reviews/${params}`,
  );
  return res.data;
}

export async function deleteModerationReview(
  id: number,
  type: "property" | "tenant",
): Promise<void> {
  await api.delete(
    `/api/dashboard/admin/moderation/reviews/${id}/?type=${type}`,
  );
}

// ── Tenant ──

export async function getTenantDashboard(): Promise<TenantDashboard> {
  const res = await api.get<TenantDashboard>("/api/dashboard/tenant/");
  return res.data;
}

// ── Artisan ──

export async function getArtisanDashboard(): Promise<ArtisanDashboard> {
  const res = await api.get<ArtisanDashboard>("/api/dashboard/artisan/");
  return res.data;
}

// ── Agent ──

export async function getAgentDashboard(): Promise<AgentDashboard> {
  const res = await api.get<AgentDashboard>("/api/dashboard/agent/");
  return res.data;
}

// ── Moving Company ──

export async function getMovingCompanyDashboard(): Promise<MovingCompanyDashboard> {
  const res = await api.get<MovingCompanyDashboard>(
    "/api/dashboard/moving-company/",
  );
  return res.data;
}
