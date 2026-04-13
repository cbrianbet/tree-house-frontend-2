"use client";

import React, { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AxiosError } from "axios";
import { acceptTenantInvite } from "@/lib/api/auth";
import { setToken } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import type { ApiErrorDetail } from "@/types/api";

function formatAcceptError(err: unknown): string {
  const ax = err as AxiosError<ApiErrorDetail>;
  const data = ax.response?.data;
  if (!data || typeof data !== "object") {
    return "Could not complete invitation. Please try again or request a new link.";
  }
  if (typeof data.detail === "string") return data.detail;
  const firstField = Object.entries(data).find(
    ([k, v]) =>
      k !== "detail" &&
      v !== undefined &&
      (typeof v === "string" || Array.isArray(v)),
  );
  if (firstField) {
    const [, v] = firstField;
    if (Array.isArray(v) && v.length > 0) return String(v[0]);
    if (typeof v === "string") return v;
  }
  return "Could not complete invitation. Check your password and try again.";
}

function TenantInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const token = searchParams.get("token");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Invalid or missing invitation link.");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const password2 = fd.get("password2") as string;
    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const { key } = await acceptTenantInvite({
        token,
        password,
        first_name: (fd.get("first_name") as string) || undefined,
        last_name: (fd.get("last_name") as string) || undefined,
        phone: (fd.get("phone") as string) || undefined,
        national_id: (fd.get("national_id") as string) || undefined,
        emergency_contact_name:
          (fd.get("emergency_contact_name") as string) || undefined,
        emergency_contact_phone:
          (fd.get("emergency_contact_phone") as string) || undefined,
      });
      setToken(key);
      await refreshUser();
      router.replace("/tenant/dashboard");
    } catch (err) {
      setError(formatAcceptError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-lg font-medium text-gray-900 dark:text-white">
          Invalid or missing invitation link
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Open the link from your invitation email, or contact your landlord if
          you need help.
        </p>
        <Link
          href="/signin"
          className="mt-6 inline-block text-sm font-medium text-brand-500 hover:underline"
        >
          Sign in instead
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h1 className="text-lg font-medium text-gray-900 dark:text-white">
        Complete your account
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Set a password and optional profile details to finish accepting your
        lease invitation.
      </p>

      {error && (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none ring-brand-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="password2"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Confirm password <span className="text-red-500">*</span>
          </label>
          <input
            id="password2"
            name="password2"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none ring-brand-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="first_name"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              First name
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none ring-brand-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="last_name"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Last name
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none ring-brand-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="phone"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none ring-brand-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="national_id"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            National ID
          </label>
          <input
            id="national_id"
            name="national_id"
            type="text"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none ring-brand-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="emergency_contact_name"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Emergency contact name
          </label>
          <input
            id="emergency_contact_name"
            name="emergency_contact_name"
            type="text"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none ring-brand-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="emergency_contact_phone"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Emergency contact phone
          </label>
          <input
            id="emergency_contact_phone"
            name="emergency_contact_phone"
            type="tel"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none ring-brand-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Activate account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-brand-500 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function TenantInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <Suspense
        fallback={
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        }
      >
        <TenantInviteForm />
      </Suspense>
    </div>
  );
}
