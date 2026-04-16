"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  FormEvent,
  useRef,
} from "react";
import { DM_Sans, DM_Mono } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import {
  listConversations,
  createConversation,
  listMessages,
  sendMessage,
  markConversationRead,
} from "@/lib/api/messaging";
import { listAdminUsers } from "@/lib/api/dashboards";
import type { Conversation, Message, AdminUser } from "@/types/api";
import PageLoader from "@/components/ui/PageLoader";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

const C = {
  g7: "#0F6E56", g5: "#1D9E75", g3: "#5DCAA5", g1: "#E1F5EE",
  a7: "#854F0B", a0: "#FAEEDA",
  r6: "#A32D2D", r0: "#FCEBEB",
  k9: "#1A1A1A", k7: "#3D3D3D", k5: "#6B6B6B", k2: "#D3D1C7", k0: "#F2F1EB",
  surf: "#F7F6F2", wh: "#fff",
  bd: "rgba(0,0,0,0.07)", bdm: "rgba(0,0,0,0.12)",
  rmd: 8, rlg: 14, rxl: 18,
} as const;

const AVATAR_COLORS = [
  "#D85A30", "#1D9E75", "#378ADD", "#7F77DD", "#185FA5",
  "#993C1D", "#854F0B", "#534AB7", "#993556", "#0F6E56",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getAvatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtConvTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return fmtTime(iso);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-KE", { weekday: "short" });
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

function fmtDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [newBody, setNewBody] = useState("");
  const [showNewConv, setShowNewConv] = useState(false);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<AdminUser[]>([]);
  const [userSearchQ, setUserSearchQ] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const font = dmSans.style.fontFamily;
  const mono = dmMono.style.fontFamily;

  const fetchConversations = useCallback(async () => {
    try {
      const data = await listConversations();
      setConversations(data);
    } catch {
      setError("Failed to load conversations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!showNewConv || allUsers.length > 0) return;
    setUsersLoading(true);
    listAdminUsers()
      .then(setAllUsers)
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, [showNewConv, allUsers.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openConversation(conv: Conversation) {
    setActiveConv(conv);
    setMsgLoading(true);
    setError(null);
    try {
      const msgs = await listMessages(conv.id);
      setMessages(msgs);
      await markConversationRead(conv.id);
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)),
      );
    } catch {
      setError("Failed to load messages.");
    } finally {
      setMsgLoading(false);
    }
  }

  async function handleSend(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (!activeConv || !newBody.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(activeConv.id, newBody.trim());
      setMessages((prev) => [...prev, msg]);
      setNewBody("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch {
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  const filteredUsers = allUsers.filter((u) => {
    if (u.id === user?.pk) return false;
    if (selectedParticipants.some((p) => p.id === u.id)) return false;
    if (!userSearchQ) return true;
    const q = userSearchQ.toLowerCase();
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    return fullName.includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  function toggleParticipant(u: AdminUser) {
    setSelectedParticipants((prev) =>
      prev.some((p) => p.id === u.id) ? prev.filter((p) => p.id !== u.id) : [...prev, u],
    );
    setUserSearchQ("");
  }

  function removeParticipant(id: number) {
    setSelectedParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleCreateConversation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const subject = fd.get("subject") as string;
    if (!subject || selectedParticipants.length === 0) {
      setError("Subject and at least one participant are required.");
      return;
    }
    try {
      const conv = await createConversation({
        subject,
        participant_ids: selectedParticipants.map((p) => p.id),
      });
      setConversations((prev) => [conv, ...prev]);
      setShowNewConv(false);
      setSelectedParticipants([]);
      setUserSearchQ("");
      openConversation(conv);
    } catch {
      setError("Failed to create conversation.");
    }
  }

  useEffect(() => {
    if (!activeConv) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await listMessages(activeConv.id);
        setMessages(msgs);
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeConv]);

  const filteredConvs = searchQ
    ? conversations.filter(
        (c) =>
          c.subject.toLowerCase().includes(searchQ.toLowerCase()) ||
          (c.last_message?.body ?? "").toLowerCase().includes(searchQ.toLowerCase()),
      )
    : conversations;

  const unreadCount = conversations.filter((c) => c.unread_count > 0).length;

  const groupedMessages = messages.reduce<{ label: string; msgs: Message[] }[]>((acc, msg) => {
    const label = fmtDayLabel(msg.created_at);
    const last = acc[acc.length - 1];
    if (last && last.label === label) {
      last.msgs.push(msg);
    } else {
      acc.push({ label, msgs: [msg] });
    }
    return acc;
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div
      className={`${dmSans.className} -mx-4 md:-mx-6 -mt-4 md:-mt-6`}
      style={{ fontFamily: font, fontSize: 14, color: C.k9, height: "calc(100vh - 64px)", display: "flex", overflow: "hidden" }}
    >
      {/* ── Conversation list ── */}
      <div style={{ width: 320, flexShrink: 0, background: C.wh, borderRight: `0.5px solid ${C.bd}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: `0.5px solid ${C.bd}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: C.k9 }}>Messages</span>
            {unreadCount > 0 && (
              <span style={{ marginLeft: 6, background: C.r6, color: "#fff", fontSize: 10, fontWeight: 500, padding: "1px 6px", borderRadius: 10 }}>{unreadCount}</span>
            )}
          </div>
          <button
            onClick={() => setShowNewConv(!showNewConv)}
            style={{ width: 28, height: 28, borderRadius: C.rmd, background: C.g7, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 12px", borderBottom: `0.5px solid ${C.bd}`, flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.k5} strokeWidth={2} strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              style={{ width: "100%", height: 32, padding: "0 10px 0 29px", background: C.k0, border: `0.5px solid ${C.bdm}`, borderRadius: 20, fontSize: 12, color: C.k9, fontFamily: font, outline: "none" }}
            />
          </div>
        </div>

        {/* New conversation form */}
        {showNewConv && (
          <div style={{ padding: "12px", borderBottom: `0.5px solid ${C.bd}`, flexShrink: 0 }}>
            <form onSubmit={handleCreateConversation}>
              <input
                name="subject"
                placeholder="Subject"
                style={{ width: "100%", height: 32, padding: "0 10px", background: C.k0, border: `0.5px solid ${C.bdm}`, borderRadius: C.rmd, fontSize: 12, color: C.k9, fontFamily: font, outline: "none", marginBottom: 6 }}
              />
              <input
                name="participants"
                placeholder="Participant IDs (e.g. 3, 5)"
                style={{ width: "100%", height: 32, padding: "0 10px", background: C.k0, border: `0.5px solid ${C.bdm}`, borderRadius: C.rmd, fontSize: 12, color: C.k9, fontFamily: font, outline: "none", marginBottom: 8 }}
              />
              <button
                type="submit"
                style={{ width: "100%", height: 30, borderRadius: C.rmd, background: C.g7, color: "#fff", border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font }}
              >
                Create
              </button>
            </form>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: "8px 12px", borderBottom: `0.5px solid ${C.bd}`, flexShrink: 0 }}>
            <div style={{ padding: "8px 10px", borderRadius: C.rmd, background: C.r0, color: C.r6, fontSize: 12, border: `0.5px solid ${C.r6}20` }}>{error}</div>
          </div>
        )}

        {/* Conversation items */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredConvs.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: C.k5, fontSize: 13 }}>
              No conversations yet.
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const isActive = activeConv?.id === conv.id;
              const isUnread = conv.unread_count > 0;
              const senderName = conv.last_message?.sender_name ?? "";
              const initial = getInitials(conv.subject || senderName || "?");
              const color = getAvatarColor(conv.id);
              return (
                <div
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", cursor: "pointer",
                    borderBottom: `0.5px solid ${C.bd}`, position: "relative",
                    background: isActive ? C.g1 : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = C.surf; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  {isActive && (
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: C.g7, borderRadius: "0 2px 2px 0" }} />
                  )}
                  <div style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: "#fff", flexShrink: 0, background: color }}>
                    {initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <div style={{ fontSize: 13, color: C.k9, fontWeight: isUnread ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.subject}</div>
                      <div style={{ fontSize: 10, color: C.k5, flexShrink: 0, marginLeft: 6 }}>
                        {conv.last_message ? fmtConvTime(conv.last_message.created_at) : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                      <div style={{ fontSize: 12, color: isUnread ? C.k9 : C.k5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                        {conv.last_message ? `${conv.last_message.sender_name}: ${conv.last_message.body}` : "No messages yet"}
                      </div>
                      {isUnread && (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.g7, flexShrink: 0 }} />
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: C.k5, marginTop: 2 }}>
                      {conv.participants.length} participant{conv.participants.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Thread panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: C.surf }}>
        {!activeConv ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.k0, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.k2} strokeWidth={1.5} strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.k7, marginBottom: 6 }}>Select a conversation</div>
            <div style={{ fontSize: 13, color: C.k5, lineHeight: 1.5 }}>Choose a conversation from the left to start messaging.</div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div style={{ background: C.wh, borderBottom: `0.5px solid ${C.bd}`, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: "#fff", flexShrink: 0, background: getAvatarColor(activeConv.id) }}>
                {getInitials(activeConv.subject || "?")}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: C.k9 }}>{activeConv.subject}</div>
                <div style={{ fontSize: 12, color: C.k5, marginTop: 1 }}>
                  {activeConv.participants.length} participant{activeConv.participants.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
              {msgLoading ? (
                <PageLoader inline />
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: C.k5, fontSize: 13 }}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                groupedMessages.map((group) => (
                  <React.Fragment key={group.label}>
                    {/* Day separator */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
                      <div style={{ flex: 1, height: 0.5, background: C.k2 }} />
                      <div style={{ fontSize: 11, color: C.k5, fontWeight: 500, whiteSpace: "nowrap" }}>{group.label}</div>
                      <div style={{ flex: 1, height: 0.5, background: C.k2 }} />
                    </div>
                    {group.msgs.map((msg) => {
                      const isMe = msg.sender === user?.pk;
                      const avColor = getAvatarColor(msg.sender);
                      return (
                        <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: isMe ? "flex-end" : "flex-start" }}>
                          {!isMe && (
                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                              <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 500, color: "#fff", flexShrink: 0, background: avColor }}>
                                {getInitials(msg.sender_name)}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 500, color: C.k5 }}>{msg.sender_name}</div>
                            </div>
                          )}
                          <div
                            style={{
                              maxWidth: "72%", padding: "10px 13px", borderRadius: C.rxl, fontSize: 13, lineHeight: 1.55, wordBreak: "break-word",
                              ...(isMe
                                ? { background: C.g7, color: "#fff", borderBottomRightRadius: 4 }
                                : { background: C.wh, color: C.k9, borderBottomLeftRadius: 4, border: `0.5px solid ${C.bd}` }),
                            }}
                          >
                            {msg.body}
                            <div style={{ fontSize: 10, marginTop: 5, opacity: 0.6, color: isMe ? "rgba(255,255,255,0.7)" : C.k5, textAlign: isMe ? "right" : "left" }}>
                              {fmtTime(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose bar */}
            <div style={{ background: C.wh, borderTop: `0.5px solid ${C.bd}`, padding: "10px 14px", flexShrink: 0 }}>
              <form onSubmit={handleSend} style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <textarea
                    ref={textareaRef}
                    value={newBody}
                    onChange={(e) => {
                      setNewBody(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message…"
                    rows={1}
                    style={{
                      width: "100%", minHeight: 40, maxHeight: 120, padding: "10px 14px", background: C.k0, border: `0.5px solid ${C.bdm}`, borderRadius: 20,
                      fontSize: 13, color: C.k9, fontFamily: font, outline: "none", resize: "none", lineHeight: 1.45, boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || !newBody.trim()}
                  style={{
                    width: 38, height: 38, borderRadius: "50%", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: newBody.trim() ? "pointer" : "default", flexShrink: 0,
                    background: newBody.trim() ? C.g7 : C.k2,
                    transition: "all 0.15s",
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
