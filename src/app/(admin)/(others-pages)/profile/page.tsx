"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import Badge from "@/components/ui/badge/Badge";

import { ROLE_ADMIN } from "@/constants/roles";

export default function ProfilePage() {
  const { user, roleName } = useAuth();

  if (!user) return null;

  const initials =
    `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() ||
    user.username[0].toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-500 text-2xl font-bold text-white">
            {initials}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {user.first_name} {user.last_name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="light" color="primary">
                {roleName(user.role)}
              </Badge>
              {user.is_staff && (
                <Badge variant="light" color="warning">
                  Staff
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              @{user.username}
            </p>
          </div>
        </div>
      </div>

      {/* Account details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Account Details
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <InfoField label="Username" value={user.username} />
          <InfoField label="Email" value={user.email} />
          <InfoField label="First Name" value={user.first_name || "—"} />
          <InfoField label="Last Name" value={user.last_name || "—"} />
          <InfoField label="Phone" value={user.phone || "—"} />
          <InfoField label="Role" value={roleName(user.role)} />
          {user.role !== ROLE_ADMIN && (
            <InfoField label="User ID" value={String(user.pk)} />
          )}
        </div>
      </div>

      {/* Role info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">
          Role Permissions
        </h2>
        <RoleDescription roleId={user.role} />
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

function RoleDescription({ roleId }: { roleId: number }) {
  const descriptions: Record<number, string[]> = {
    1: [
      "Full access to all properties, billing, and maintenance across all landlords",
      "Approve or reject tenant applications",
      "Configure billing and view financial reports for any property",
      "Open or reject maintenance requests",
    ],
    2: [
      "Browse available units and submit rental applications",
      "View your invoices and make payments via Stripe",
      "Submit maintenance requests for your unit",
      "Track request status and communicate via notes",
    ],
    3: [
      "Create and manage your own properties and units",
      "Review and approve/reject tenant applications",
      "Configure billing, record income and expenses",
      "Generate financial reports for your portfolio",
      "Submit and manage maintenance requests",
    ],
    4: [
      "View and manage units on properties you are assigned to",
      "View invoices and receipts for assigned properties",
      "View financial reports for assigned properties",
      "Add notes and images to maintenance requests",
    ],
    5: [
      "View open maintenance requests matching your trade",
      "Place bids on open requests",
      "Start and track work on assigned requests",
      "Add notes and upload images for documentation",
    ],
  };

  const items = descriptions[roleId] ?? ["Standard account access."];

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400"
        >
          <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
          {item}
        </li>
      ))}
    </ul>
  );
}
