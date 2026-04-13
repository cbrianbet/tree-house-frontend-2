"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { listRequests } from "@/lib/api/maintenance";
import type { MaintenanceRequest } from "@/types/api";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";

import { ROLE_TENANT, ROLE_LANDLORD } from "@/constants/roles";

const statusColor: Record<string, "success" | "warning" | "error" | "info" | "primary"> = {
  submitted: "info",
  open: "primary",
  assigned: "warning",
  in_progress: "warning",
  completed: "success",
  cancelled: "light" as "primary",
  rejected: "error",
};

const priorityColor: Record<string, "success" | "warning" | "error" | "info"> = {
  low: "success",
  medium: "info",
  high: "warning",
  urgent: "error",
};

export default function MaintenancePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRequests()
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
            Maintenance Requests
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {requests.length} request{requests.length !== 1 ? "s" : ""}
          </p>
        </div>
        {user && [ROLE_TENANT, ROLE_LANDLORD].includes(user.role) && (
          <Link href="/maintenance/new">
            <Button size="sm">New Request</Button>
          </Link>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 dark:text-gray-400">
            No maintenance requests.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/maintenance/${r.id}`}
              className="block rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-800 dark:text-white/90">
                  {r.title}
                </h3>
                <div className="flex gap-2">
                  <Badge
                    variant="light"
                    size="sm"
                    color={priorityColor[r.priority] ?? "primary"}
                  >
                    {r.priority}
                  </Badge>
                  <Badge
                    variant="light"
                    size="sm"
                    color={statusColor[r.status] ?? "primary"}
                  >
                    {r.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                {r.description}
              </p>
              <div className="mt-3 flex gap-4 text-xs text-gray-400">
                <span>{r.category}</span>
                <span>Property #{r.property}</span>
                {r.unit && <span>Unit #{r.unit}</span>}
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
