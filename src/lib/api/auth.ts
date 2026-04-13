import axios from "axios";
import api from "./client";
import type {
  AuthTokenResponse,
  LoginRequest,
  RegisterRequest,
  Role,
  User,
  AccountInfo,
  NotificationPreferences,
  TenantInviteAcceptRequest,
  TenantInviteAcceptResponse,
} from "@/types/api";

export async function login(data: LoginRequest): Promise<AuthTokenResponse> {
  const res = await api.post<AuthTokenResponse>("/api/auth/login/", data);
  return res.data;
}

export async function register(
  data: RegisterRequest,
): Promise<AuthTokenResponse> {
  const res = await api.post<AuthTokenResponse>("/api/auth/register/", data);
  return res.data;
}

/** Public — no auth header (use bare axios so logged-in users do not send Token). */
export async function acceptTenantInvite(
  data: TenantInviteAcceptRequest,
): Promise<TenantInviteAcceptResponse> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  const res = await axios.post<TenantInviteAcceptResponse>(
    `${base}/api/auth/tenant-invite/accept/`,
    data,
    { headers: { "Content-Type": "application/json" } },
  );
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/logout/");
}

export async function getCurrentUser(): Promise<User> {
  const res = await api.get<User>("/api/auth/user/");
  return res.data;
}

export async function getRoles(): Promise<Role[]> {
  const res = await api.get<Role[]>("/api/auth/roles/");
  return res.data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/api/auth/password/reset/", { email });
}

export async function confirmPasswordReset(data: {
  uid: string;
  token: string;
  new_password1: string;
  new_password2: string;
}): Promise<void> {
  await api.post("/api/auth/password/reset/confirm/", data);
}

export async function changePassword(data: {
  old_password: string;
  new_password1: string;
  new_password2: string;
}): Promise<void> {
  await api.post("/api/auth/password/change/", data);
}

// ── Account Self-Service ──

export async function getAccount(): Promise<AccountInfo> {
  const res = await api.get<AccountInfo>("/api/auth/me/");
  return res.data;
}

export async function updateAccount(
  data: Partial<Pick<AccountInfo, "first_name" | "last_name" | "phone" | "email">>,
): Promise<AccountInfo> {
  const res = await api.patch<AccountInfo>("/api/auth/me/", data);
  return res.data;
}

export async function getMyProfile<T = Record<string, unknown>>(): Promise<T> {
  const res = await api.get<T>("/api/auth/me/profile/");
  return res.data;
}

export async function updateMyProfile<T = Record<string, unknown>>(
  data: Partial<T>,
): Promise<T> {
  const res = await api.patch<T>("/api/auth/me/profile/", data);
  return res.data;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await api.get<NotificationPreferences>(
    "/api/auth/me/notifications/",
  );
  return res.data;
}

export async function updateNotificationPreferences(
  data: Partial<Omit<NotificationPreferences, "updated_at">>,
): Promise<NotificationPreferences> {
  const res = await api.patch<NotificationPreferences>(
    "/api/auth/me/notifications/",
    data,
  );
  return res.data;
}
