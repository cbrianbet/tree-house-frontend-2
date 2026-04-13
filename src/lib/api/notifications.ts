import api from "./client";
import type { Notification } from "@/types/api";

export async function listNotifications(
  unreadOnly?: boolean,
): Promise<Notification[]> {
  const params = unreadOnly ? "?unread=true" : "";
  const res = await api.get<Notification[]>(`/api/notifications/${params}`);
  return res.data;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.post(`/api/notifications/${id}/read/`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/api/notifications/read-all/");
}
