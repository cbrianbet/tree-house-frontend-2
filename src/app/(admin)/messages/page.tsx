"use client";
import React, { useEffect, useState, useCallback, FormEvent, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  listConversations,
  createConversation,
  listMessages,
  sendMessage,
  markConversationRead,
} from "@/lib/api/messaging";
import type { Conversation, Message } from "@/types/api";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Alert from "@/components/ui/alert/Alert";

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newBody, setNewBody] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeConv || !newBody.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(activeConv.id, newBody.trim());
      setMessages((prev) => [...prev, msg]);
      setNewBody("");
    } catch {
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function handleCreateConversation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const subject = fd.get("subject") as string;
    const participantStr = fd.get("participants") as string;
    const participantIds = participantStr
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (!subject || participantIds.length === 0) {
      setError("Subject and at least one participant ID are required.");
      return;
    }
    try {
      const conv = await createConversation({
        subject,
        participant_ids: participantIds,
      });
      setConversations((prev) => [conv, ...prev]);
      setShowNew(false);
      openConversation(conv);
    } catch {
      setError("Failed to create conversation.");
    }
  }

  // Polling for new messages in active conversation
  useEffect(() => {
    if (!activeConv) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await listMessages(activeConv.id);
        setMessages(msgs);
      } catch {
        // silent
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeConv]);

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
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Messages
        </h1>
        <Button size="sm" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Cancel" : "New Conversation"}
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {showNew && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <form onSubmit={handleCreateConversation} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Subject</Label>
                <Input name="subject" placeholder="Conversation subject" />
              </div>
              <div>
                <Label>Participant User IDs (comma-separated)</Label>
                <Input name="participants" placeholder="3, 5" />
              </div>
            </div>
            <Button size="sm">Create</Button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Conversation list */}
        <div className="space-y-2 lg:col-span-1">
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No conversations yet.
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => openConversation(conv)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  activeConv?.id === conv.id
                    ? "border-brand-500 ring-2 ring-brand-500/20"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {conv.subject}
                  </span>
                  {conv.unread_count > 0 && (
                    <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                {conv.last_message && (
                  <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                    {conv.last_message.sender_name}: {conv.last_message.body}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {conv.participants.length} participant
                  {conv.participants.length !== 1 ? "s" : ""}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Message thread */}
        <div className="lg:col-span-2">
          {!activeConv ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-gray-400 dark:text-gray-500">
                Select a conversation
              </p>
            </div>
          ) : (
            <div className="flex h-[500px] flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="border-b border-gray-100 p-4 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-white/90">
                  {activeConv.subject}
                </h3>
                <p className="text-xs text-gray-400">
                  {activeConv.participants.length} participants
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-400">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender === user?.pk;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isMe
                              ? "bg-brand-500 text-white"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90"
                          }`}
                        >
                          {!isMe && (
                            <p className="mb-1 text-xs font-medium opacity-70">
                              {msg.sender_name}
                            </p>
                          )}
                          <p className="text-sm">{msg.body}</p>
                          <p
                            className={`mt-1 text-xs ${
                              isMe ? "text-white/60" : "text-gray-400"
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="border-t border-gray-100 p-4 dark:border-gray-700"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                  <Button size="sm" disabled={sending || !newBody.trim()}>
                    {sending ? "…" : "Send"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
