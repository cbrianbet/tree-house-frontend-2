"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api/notifications";
import type { Notification } from "@/types/api";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Link from "next/link";

const typeColor: Record<string, "success" | "warning" | "error" | "info" | "primary"> = {
  payment_received: "success",
  payment_due: "warning",
  maintenance_update: "info",
  new_maintenance: "primary",
  new_application: "primary",
  application_update: "info",
  lease_expiry: "warning",
  message: "info",
  dispute: "error",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetch = useCallback(async () => {
    try {
      const data = await listNotifications(filter === "unread");
      setNotifications(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  async function handleMarkRead(id: number) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {unreadCount} unread
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "primary" : "outline"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filter === "unread" ? "primary" : "outline"}
            onClick={() => setFilter("unread")}
          >
            Unread
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={handleMarkAll}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 dark:text-gray-400">No notifications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-4 transition ${
                n.is_read
                  ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
                  : "border-brand-200 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-500/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="light"
                      size="sm"
                      color={typeColor[n.notification_type] ?? "primary"}
                    >
                      {n.notification_type.replace(/_/g, " ")}
                    </Badge>
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-brand-500" />
                    )}
                  </div>
                  <h3 className="mt-1 font-medium text-gray-800 dark:text-white/90">
                    {n.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {n.body}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                    {n.action_url && (
                      <Link
                        href={n.action_url}
                        className="text-xs text-brand-500 hover:text-brand-600"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
