"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api/notifications";
import type { Notification } from "@/types/api";
import Link from "next/link";
import PageLoader from "@/components/ui/PageLoader";

// ── Design tokens ─────────────────────────────────────────────────────────────
const G5 = "#1D9E75";
const G1 = "#E1F5EE";
const K9 = "#111827";
const K7 = "#374151";
const K5 = "#6B7280";
const K0 = "#F9FAFB";
const BD = "#E5E7EB";

// ── Type → icon color ─────────────────────────────────────────────────────────
function typeColor(t: string): string {
  if (t === "payment" || t === "payment_reminder") return G5;
  if (t === "maintenance") return "#D97706";
  if (t === "application") return "#2563EB";
  if (t === "dispute") return "#EF4444";
  if (t === "message") return "#7C3AED";
  if (t === "lease") return "#0EA5E9";
  if (t === "moving") return "#8B5CF6";
  return K5;
}

function TypeIcon({ type }: { type: string }) {
  const color = typeColor(type);
  if (type === "payment" || type === "payment_reminder") {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    );
  }
  if (type === "maintenance") {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  if (type === "application") {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    );
  }
  if (type === "dispute") {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  if (type === "message") {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ── Filter types ──────────────────────────────────────────────────────────────
type FilterTab = "all" | "unread" | "payment" | "maintenance" | "applications" | "disputes" | "messages";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "payment", label: "Payment" },
  { key: "maintenance", label: "Maintenance" },
  { key: "applications", label: "Applications" },
  { key: "disputes", label: "Disputes" },
  { key: "messages", label: "Messages" },
];

function matchesFilter(n: Notification, filter: FilterTab): boolean {
  if (filter === "all") return true;
  if (filter === "unread") return !n.is_read;
  if (filter === "payment") return n.notification_type === "payment" || n.notification_type === "payment_reminder";
  if (filter === "maintenance") return n.notification_type === "maintenance";
  if (filter === "applications") return n.notification_type === "application";
  if (filter === "disputes") return n.notification_type === "dispute";
  if (filter === "messages") return n.notification_type === "message";
  return true;
}

function fmtDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await listNotifications(false);
      setNotifications(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifs();
  }, [fetchNotifs]);

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
  const filtered = notifications.filter((n) => matchesFilter(n, filter));

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 4px" }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: K9, margin: 0 }}>Notifications</h1>
          {unreadCount > 0 && (
            <p style={{ fontSize: 13, color: K5, margin: "4px 0 0" }}>{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            style={{
              background: "#fff",
              color: K7,
              border: `0.5px solid ${BD}`,
              borderRadius: 8,
              padding: "0 16px",
              height: 36,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                border: isActive ? "none" : `0.5px solid ${BD}`,
                background: isActive ? G5 : "#fff",
                color: isActive ? "#fff" : K7,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: `0.5px solid ${BD}`,
            borderRadius: 16,
            padding: "48px 24px",
            textAlign: "center",
            color: K5,
            fontSize: 14,
          }}
        >
          {filter === "all" ? "You have no notifications." : "No notifications in this category."}
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: `0.5px solid ${BD}`,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {filtered.map((n, idx) => {
            const color = typeColor(n.notification_type);
            return (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "14px 18px",
                  borderBottom: idx < filtered.length - 1 ? `0.5px solid ${BD}` : "none",
                  background: n.is_read ? "#fff" : K0,
                  cursor: "default",
                  transition: "background 0.15s",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: color + "18",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <TypeIcon type={n.notification_type} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: n.is_read ? 400 : 500, fontSize: 13, color: K9, lineHeight: 1.4 }}>
                      {n.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {!n.is_read && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: G5,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span style={{ fontSize: 11, color: K5, whiteSpace: "nowrap" }}>
                        {fmtDate(n.created_at)}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: K5, margin: "3px 0 0", lineHeight: 1.5 }}>
                    {n.body}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                    {n.action_url && (
                      <Link
                        href={n.action_url}
                        style={{ fontSize: 12, color: G5, fontWeight: 500, textDecoration: "none" }}
                        onClick={() => { if (!n.is_read) void handleMarkRead(n.id); }}
                      >
                        View →
                      </Link>
                    )}
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => void handleMarkRead(n.id)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: 12,
                          color: K5,
                          cursor: "pointer",
                          padding: 0,
                          fontFamily: "inherit",
                        }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
