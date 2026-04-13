"use client";
import React, { useEffect, useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  listDisputes,
  createDispute,
  getDispute,
  updateDisputeStatus,
  listDisputeMessages,
  postDisputeMessage,
} from "@/lib/api/disputes";
import { listProperties } from "@/lib/api/properties";
import type { Dispute, DisputeMessage, DisputeType, Property } from "@/types/api";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";

import { ROLE_ADMIN, ROLE_TENANT, ROLE_LANDLORD } from "@/constants/roles";

const statusColor: Record<string, "warning" | "info" | "success" | "error" | "primary"> = {
  open: "warning",
  under_review: "info",
  resolved: "success",
  closed: "primary",
};

const disputeTypes: DisputeType[] = [
  "rent",
  "maintenance",
  "noise",
  "damage",
  "lease",
  "other",
];

export default function DisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Detail view state
  const [activeDispute, setActiveDispute] = useState<Dispute | null>(null);
  const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMsg, setNewMsg] = useState("");

  const canCreate =
    user?.role === ROLE_ADMIN ||
    user?.role === ROLE_TENANT ||
    user?.role === ROLE_LANDLORD;

  useEffect(() => {
    async function load() {
      try {
        const [d, p] = await Promise.all([
          listDisputes(),
          canCreate ? listProperties() : Promise.resolve([]),
        ]);
        setDisputes(d);
        setProperties(p);
      } catch {
        setError("Failed to load disputes.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [canCreate]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const dispute = await createDispute({
        property: parseInt(fd.get("property") as string, 10),
        unit: fd.get("unit") ? parseInt(fd.get("unit") as string, 10) : undefined,
        dispute_type: fd.get("dispute_type") as DisputeType,
        title: fd.get("title") as string,
        description: fd.get("description") as string,
      });
      setDisputes((prev) => [dispute, ...prev]);
      setShowCreate(false);
      setSuccess("Dispute created.");
    } catch {
      setError("Failed to create dispute.");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(id: number) {
    setMsgLoading(true);
    setError(null);
    try {
      const [d, msgs] = await Promise.all([
        getDispute(id),
        listDisputeMessages(id),
      ]);
      setActiveDispute(d);
      setDisputeMessages(msgs);
    } catch {
      setError("Failed to load dispute details.");
    } finally {
      setMsgLoading(false);
    }
  }

  async function handleStatusChange(status: "under_review" | "resolved" | "closed") {
    if (!activeDispute) return;
    setSubmitting(true);
    try {
      const updated = await updateDisputeStatus(activeDispute.id, status);
      setActiveDispute(updated);
      setDisputes((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d)),
      );
      setSuccess(`Dispute marked as ${status.replace("_", " ")}.`);
    } catch {
      setError("Failed to update dispute.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeDispute || !newMsg.trim()) return;
    setSubmitting(true);
    try {
      const msg = await postDisputeMessage(activeDispute.id, newMsg.trim());
      setDisputeMessages((prev) => [...prev, msg]);
      setNewMsg("");
    } catch {
      setError("Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // Detail view
  if (activeDispute) {
    const canMoveToReview =
      activeDispute.status === "open" &&
      (user?.role === ROLE_ADMIN || user?.role === ROLE_LANDLORD);
    const canResolve =
      activeDispute.status === "under_review" && user?.role === ROLE_ADMIN;
    const canClose =
      (activeDispute.status === "open" || activeDispute.status === "under_review") &&
      activeDispute.created_by === user?.pk;

    return (
      <div>
        <button
          onClick={() => setActiveDispute(null)}
          className="mb-4 text-sm text-brand-500 hover:text-brand-600"
        >
          &larr; Back to disputes
        </button>

        {error && (
          <div className="mb-4">
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}
        {success && (
          <div className="mb-4">
            <Alert variant="success" title="Success" message={success} />
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                {activeDispute.title}
              </h1>
              <div className="mt-2 flex gap-2">
                <Badge
                  variant="light"
                  size="sm"
                  color={statusColor[activeDispute.status] ?? "primary"}
                >
                  {activeDispute.status.replace("_", " ")}
                </Badge>
                <Badge variant="light" size="sm" color="primary">
                  {activeDispute.dispute_type}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {canMoveToReview && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => handleStatusChange("under_review")}
                >
                  Move to Review
                </Button>
              )}
              {canResolve && (
                <Button
                  size="sm"
                  disabled={submitting}
                  onClick={() => handleStatusChange("resolved")}
                >
                  Resolve
                </Button>
              )}
              {canClose && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => handleStatusChange("closed")}
                >
                  Close
                </Button>
              )}
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {activeDispute.description}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Property #{activeDispute.property}
            {activeDispute.unit && ` · Unit #${activeDispute.unit}`}
            {" · "}Created {new Date(activeDispute.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Messages */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 p-4 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-white/90">
              Discussion
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto p-4 space-y-3">
            {msgLoading ? (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
              </div>
            ) : disputeMessages.length === 0 ? (
              <p className="text-center text-sm text-gray-400">
                No messages yet.
              </p>
            ) : (
              disputeMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {msg.sender_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {msg.body}
                  </p>
                </div>
              ))
            )}
          </div>
          {activeDispute.status !== "resolved" &&
            activeDispute.status !== "closed" && (
              <form
                onSubmit={handleSendMessage}
                className="border-t border-gray-100 p-4 dark:border-gray-700"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    placeholder="Add a message…"
                    className="flex-1 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                  <Button size="sm" disabled={submitting || !newMsg.trim()}>
                    Send
                  </Button>
                </div>
              </form>
            )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Disputes
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {disputes.length} dispute{disputes.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : "Raise Dispute"}
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert variant="success" title="Success" message={success} />
        </div>
      )}

      {showCreate && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Property</Label>
                <select
                  name="property"
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Unit (optional)</Label>
                <Input name="unit" placeholder="Unit ID" />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  name="dispute_type"
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
                >
                  {disputeTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Title</Label>
                <Input name="title" placeholder="Dispute title" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <TextArea
                name="description"
                placeholder="Describe the dispute in detail…"
                rows={3}
              />
            </div>
            <Button size="sm" disabled={submitting}>
              {submitting ? "Creating…" : "Submit Dispute"}
            </Button>
          </form>
        </div>
      )}

      {disputes.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 dark:text-gray-400">No disputes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => openDetail(d.id)}
              className="w-full rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-gray-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {d.title}
                  </span>
                  <div className="mt-1 flex gap-2">
                    <Badge
                      variant="light"
                      size="sm"
                      color={statusColor[d.status] ?? "primary"}
                    >
                      {d.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="light" size="sm" color="primary">
                      {d.dispute_type}
                    </Badge>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(d.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {d.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
