"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { listModerationReviews, deleteModerationReview } from "@/lib/api/dashboards";
import type { ModerationReview } from "@/types/api";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";

import { ROLE_ADMIN } from "@/constants/roles";

export default function ModerationPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ModerationReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"" | "property" | "tenant">("");

  const isAdmin = user?.role === ROLE_ADMIN;

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    listModerationReviews(filter || undefined)
      .then(setReviews)
      .catch(() => setError("Failed to load reviews."))
      .finally(() => setLoading(false));
  }, [filter, isAdmin]);

  if (!isAdmin) return <Alert variant="error" title="Forbidden" message="Admin only." />;

  async function handleDelete(id: number, type: "property" | "tenant") {
    if (!confirm("Delete this review?")) return;
    try {
      await deleteModerationReview(id, type);
      setReviews((prev) => prev.filter((r) => !(r.id === id && r.type === type)));
    } catch {
      setError("Failed to delete review.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Content Moderation</h1>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "" ? "primary" : "outline"} onClick={() => setFilter("")}>All</Button>
          <Button size="sm" variant={filter === "property" ? "primary" : "outline"} onClick={() => setFilter("property")}>Property</Button>
          <Button size="sm" variant={filter === "tenant" ? "primary" : "outline"} onClick={() => setFilter("tenant")}>Tenant</Button>
        </div>
      </div>

      {error && <div className="mb-4"><Alert variant="error" title="Error" message={error} /></div>}

      {loading ? (
        <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-400">No reviews to moderate.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={`${r.type}-${r.id}`} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="light" size="sm" color={r.type === "property" ? "primary" : "info"}>{r.type} review</Badge>
                    <span className="text-sm text-yellow-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  </div>
                  <p className="mt-2 font-medium text-gray-800 dark:text-white/90">{r.subject_name}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{r.comment}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    by {r.reviewer_name} · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleDelete(r.id, r.type)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
