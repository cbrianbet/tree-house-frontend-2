"use client";
import React, { useEffect, useState, FormEvent, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  getRequest,
  updateRequestStatus,
  listBids,
  createBid,
  updateBidStatus,
  listNotes,
  createNote,
  listImages,
  uploadImage,
} from "@/lib/api/maintenance";
import type {
  MaintenanceRequest,
  MaintenanceStatus,
  Bid,
  Note,
  MaintenanceImage,
} from "@/types/api";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";

import { ROLE_ADMIN, ROLE_TENANT, ROLE_LANDLORD, ROLE_ARTISAN } from "@/constants/roles";

const statusColor: Record<string, "success" | "warning" | "error" | "info" | "primary"> = {
  submitted: "info",
  open: "primary",
  assigned: "warning",
  in_progress: "warning",
  completed: "success",
  cancelled: "primary",
  rejected: "error",
};

function getAvailableTransitions(
  status: MaintenanceStatus,
  roleId: number,
  isSubmitter: boolean,
  isAssignedArtisan: boolean,
): { label: string; value: MaintenanceStatus }[] {
  const transitions: { label: string; value: MaintenanceStatus }[] = [];

  if (status === "submitted" && [ROLE_LANDLORD, ROLE_ADMIN].includes(roleId)) {
    transitions.push({ label: "Open", value: "open" });
  }
  if (status === "assigned" && isAssignedArtisan) {
    transitions.push({ label: "Start Work", value: "in_progress" });
  }
  if (status === "in_progress" && isSubmitter) {
    transitions.push({ label: "Mark Completed", value: "completed" });
  }
  if (
    ["submitted", "open"].includes(status) &&
    isSubmitter
  ) {
    transitions.push({ label: "Cancel", value: "cancelled" });
  }
  if ([ROLE_LANDLORD, ROLE_ADMIN].includes(roleId)) {
    transitions.push({ label: "Reject", value: "rejected" });
  }

  return transitions;
}

export default function MaintenanceDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const requestId = Number(params.id);

  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [images, setImages] = useState<MaintenanceImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showBidForm, setShowBidForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [req, b, n, img] = await Promise.all([
        getRequest(requestId),
        listBids(requestId).catch(() => []),
        listNotes(requestId).catch(() => []),
        listImages(requestId).catch(() => []),
      ]);
      setRequest(req);
      setBids(b);
      setNotes(n);
      setImages(img);
    } catch {
      setError("Failed to load request.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleStatusChange(status: MaintenanceStatus) {
    setSubmitting(true);
    try {
      const updated = await updateRequestStatus(requestId, status);
      setRequest(updated);
    } catch {
      setError("Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateBid(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createBid(requestId, {
        proposed_price: fd.get("proposed_price") as string,
        message: fd.get("message") as string,
      });
      setShowBidForm(false);
      await fetchAll();
    } catch {
      setError("Failed to create bid.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBidAction(bidId: number, status: "accepted" | "rejected") {
    setSubmitting(true);
    try {
      await updateBidStatus(requestId, bidId, status);
      await fetchAll();
    } catch {
      setError(`Failed to ${status} bid.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setSubmitting(true);
    try {
      await createNote(requestId, noteText);
      setNoteText("");
      await fetchAll();
    } catch {
      setError("Failed to add note.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitting(true);
    try {
      await uploadImage(requestId, file);
      await fetchAll();
    } catch {
      setError("Failed to upload image.");
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!request) {
    return <Alert variant="error" title="Not found" message="Request not found." />;
  }

  const isSubmitter = user?.pk === request.submitted_by;
  const isAssignedArtisan =
    user?.role === ROLE_ARTISAN && user.pk === request.assigned_to;
  const transitions = user
    ? getAvailableTransitions(request.status, user.role, isSubmitter, isAssignedArtisan)
    : [];

  return (
    <div className="space-y-6">
      {error && <Alert variant="error" title="Error" message={error} />}

      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {request.title}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {request.description}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="light" size="sm" color={statusColor[request.status] ?? "primary"}>
              {request.status.replace("_", " ")}
            </Badge>
            <Badge variant="light" size="sm" color="info">
              {request.priority}
            </Badge>
            <Badge variant="light" size="sm" color="primary">
              {request.category}
            </Badge>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
          <span>Property #{request.property}</span>
          {request.unit && <span>Unit #{request.unit}</span>}
          <span>Submitted by #{request.submitted_by}</span>
          {request.assigned_to && (
            <span>Assigned to #{request.assigned_to}</span>
          )}
          <span>{new Date(request.created_at).toLocaleString()}</span>
        </div>

        {transitions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {transitions.map((t) => (
              <Button
                key={t.value}
                size="sm"
                variant={t.value === "rejected" || t.value === "cancelled" ? "outline" : "primary"}
                disabled={submitting}
                onClick={() => handleStatusChange(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Bids */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Bids ({bids.length})
          </h2>
          {user?.role === ROLE_ARTISAN && request.status === "open" && (
            <Button size="sm" onClick={() => setShowBidForm(!showBidForm)}>
              {showBidForm ? "Cancel" : "Place Bid"}
            </Button>
          )}
        </div>

        {showBidForm && (
          <form
            onSubmit={handleCreateBid}
            className="mb-4 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
          >
            <div>
              <Label>Proposed Price (KES)</Label>
              <Input name="proposed_price" placeholder="8500.00" />
            </div>
            <div>
              <Label>Message</Label>
              <Input name="message" placeholder="I can fix this within 2 days…" />
            </div>
            <Button size="sm" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Bid"}
            </Button>
          </form>
        )}

        {bids.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No bids yet.</p>
        ) : (
          <div className="space-y-3">
            {bids.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-gray-100 p-4 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      KES {b.proposed_price}
                    </span>
                    <span className="ml-2 text-sm text-gray-400">
                      Artisan #{b.artisan}
                    </span>
                  </div>
                  <Badge
                    variant="light"
                    size="sm"
                    color={
                      b.status === "accepted"
                        ? "success"
                        : b.status === "rejected"
                          ? "error"
                          : "warning"
                    }
                  >
                    {b.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {b.message}
                </p>
                {isSubmitter && b.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      disabled={submitting}
                      onClick={() => handleBidAction(b.id, "accepted")}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => handleBidAction(b.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          Notes ({notes.length})
        </h2>

        {notes.length > 0 && (
          <div className="mb-4 space-y-3">
            {notes.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-gray-100 p-3 dark:border-gray-700"
              >
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {n.note}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  By #{n.author} &middot;{" "}
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <TextArea
              placeholder="Add a note…"
              rows={2}
              value={noteText}
              onChange={setNoteText}
            />
          </div>
          <Button size="sm" disabled={submitting || !noteText.trim()} onClick={handleAddNote}>
            Add
          </Button>
        </div>
      </div>

      {/* Images */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          Images ({images.length})
        </h2>

        {images.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((img) => (
              <a
                key={img.id}
                href={`${process.env.NEXT_PUBLIC_API_BASE_URL}${img.image}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${img.image}`}
                  alt={`Maintenance image ${img.id}`}
                  className="h-32 w-full object-cover transition group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-100 dark:text-gray-400 dark:file:bg-brand-500/15 dark:file:text-brand-400"
          />
        </div>
      </div>
    </div>
  );
}
