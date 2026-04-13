"use client";
import React, { useEffect, useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getAccount,
  updateAccount,
  getMyProfile,
  updateMyProfile,
  changePassword,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/api/auth";
import type { AccountInfo, NotificationPreferences } from "@/types/api";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import { AxiosError } from "axios";
import type { ApiErrorDetail } from "@/types/api";

import { ROLE_ADMIN, ROLE_TENANT, ROLE_LANDLORD, ROLE_AGENT, ROLE_ARTISAN, ROLE_MOVING } from "@/constants/roles";

const notifLabels: Record<string, string> = {
  email_notifications: "Email notifications",
  payment_due_reminder: "Payment due reminders",
  payment_received: "Payment received",
  maintenance_updates: "Maintenance updates",
  new_maintenance_request: "New maintenance requests",
  new_application: "New applications",
  application_status_change: "Application status changes",
  lease_expiry_notice: "Lease expiry notices",
};

export default function SettingsPage() {
  const { user, refreshUser, roleName } = useAuth();

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const [accountMsg, setAccountMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [prefsMsg, setPrefsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [acc, prof, notifs] = await Promise.all([
          getAccount(),
          user?.role !== ROLE_ADMIN
            ? getMyProfile()
            : Promise.resolve(null),
          getNotificationPreferences(),
        ]);
        setAccount(acc);
        setProfile(prof as Record<string, unknown> | null);
        setPrefs(notifs);
      } catch {
        // partial load is fine
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.role]);

  async function handleAccountSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setAccountMsg(null);
    const fd = new FormData(e.currentTarget);
    try {
      const updated = await updateAccount({
        first_name: fd.get("first_name") as string,
        last_name: fd.get("last_name") as string,
        phone: fd.get("phone") as string,
        email: fd.get("email") as string,
      });
      setAccount(updated);
      await refreshUser();
      setAccountMsg({ type: "success", text: "Account updated." });
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorDetail>;
      setAccountMsg({
        type: "error",
        text: axErr.response?.data?.detail ?? "Failed to update.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProfileSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setProfileMsg(null);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    fd.forEach((v, k) => {
      data[k] = v as string;
    });
    if (roleId === ROLE_MOVING && typeof data.service_areas === "string") {
      data.service_areas = (data.service_areas as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    try {
      const updated = await updateMyProfile(data);
      setProfile(updated as Record<string, unknown>);
      setProfileMsg({ type: "success", text: "Profile updated." });
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorDetail>;
      setProfileMsg({
        type: "error",
        text: axErr.response?.data?.detail ?? "Failed to update profile.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordChange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setPwMsg(null);
    const fd = new FormData(e.currentTarget);
    const old_password = fd.get("old_password") as string;
    const new_password1 = fd.get("new_password1") as string;
    const new_password2 = fd.get("new_password2") as string;
    if (new_password1 !== new_password2) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
      setSubmitting(false);
      return;
    }
    try {
      await changePassword({ old_password, new_password1, new_password2 });
      setPwMsg({ type: "success", text: "Password changed." });
      e.currentTarget.reset();
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorDetail>;
      const data = axErr.response?.data;
      const msg =
        data?.old_password?.[0] ??
        data?.new_password2?.[0] ??
        data?.detail ??
        "Failed to change password.";
      setPwMsg({ type: "error", text: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePref(key: string, current: boolean) {
    if (!prefs) return;
    try {
      const updated = await updateNotificationPreferences({ [key]: !current });
      setPrefs(updated);
    } catch {
      setPrefsMsg({ type: "error", text: "Failed to update preferences." });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const roleId = user?.role ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        Settings
      </h1>

      {/* Account Info */}
      {account && (
        <Section title="Account Information">
          {accountMsg && (
            <div className="mb-4">
              <Alert variant={accountMsg.type} title="" message={accountMsg.text} />
            </div>
          )}
          <form onSubmit={handleAccountSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>First Name</Label>
                <Input name="first_name" defaultValue={account.first_name} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input name="last_name" defaultValue={account.last_name} />
              </div>
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={account.email} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input name="phone" defaultValue={account.phone} />
              </div>
            </div>
            <Button size="sm" disabled={submitting}>
              {submitting ? "Saving…" : "Save Account"}
            </Button>
          </form>
        </Section>
      )}

      {/* Role Profile */}
      {profile && roleId !== ROLE_ADMIN && (
        <Section title={`${roleName(roleId)} Profile`}>
          {profileMsg && (
            <div className="mb-4">
              <Alert variant={profileMsg.type} title="" message={profileMsg.text} />
            </div>
          )}
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {roleId === ROLE_TENANT && (
                <>
                  <div>
                    <Label>National ID</Label>
                    <Input name="national_id" defaultValue={String(profile.national_id ?? "")} />
                  </div>
                  <div>
                    <Label>Emergency Contact Name</Label>
                    <Input name="emergency_contact_name" defaultValue={String(profile.emergency_contact_name ?? "")} />
                  </div>
                  <div>
                    <Label>Emergency Contact Phone</Label>
                    <Input name="emergency_contact_phone" defaultValue={String(profile.emergency_contact_phone ?? "")} />
                  </div>
                </>
              )}
              {roleId === ROLE_LANDLORD && (
                <>
                  <div>
                    <Label>Company Name</Label>
                    <Input name="company_name" defaultValue={String(profile.company_name ?? "")} />
                  </div>
                  <div>
                    <Label>Tax ID</Label>
                    <Input name="tax_id" defaultValue={String(profile.tax_id ?? "")} />
                  </div>
                </>
              )}
              {roleId === ROLE_AGENT && (
                <>
                  <div>
                    <Label>Agency Name</Label>
                    <Input name="agency_name" defaultValue={String(profile.agency_name ?? "")} />
                  </div>
                  <div>
                    <Label>License Number</Label>
                    <Input name="license_number" defaultValue={String(profile.license_number ?? "")} />
                  </div>
                  <div>
                    <Label>Commission Rate (%)</Label>
                    <Input name="commission_rate" defaultValue={String(profile.commission_rate ?? "")} />
                  </div>
                </>
              )}
              {roleId === ROLE_ARTISAN && (
                <>
                  <div>
                    <Label>Trade</Label>
                    <Input name="trade" defaultValue={String(profile.trade ?? "")} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Bio</Label>
                    <Input name="bio" defaultValue={String(profile.bio ?? "")} />
                  </div>
                </>
              )}
              {roleId === ROLE_MOVING && (
                <>
                  <div>
                    <Label>Company Name</Label>
                    <Input name="company_name" defaultValue={String(profile.company_name ?? "")} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Description</Label>
                    <Input name="description" defaultValue={String(profile.description ?? "")} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input name="phone" defaultValue={String(profile.phone ?? "")} />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input name="city" defaultValue={String(profile.city ?? "")} />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input name="address" defaultValue={String(profile.address ?? "")} />
                  </div>
                  <div>
                    <Label>Service Areas (comma-separated)</Label>
                    <Input name="service_areas" defaultValue={Array.isArray(profile.service_areas) ? (profile.service_areas as string[]).join(", ") : ""} />
                  </div>
                  <div>
                    <Label>Base Price (KES)</Label>
                    <Input name="base_price" defaultValue={String(profile.base_price ?? "")} />
                  </div>
                  <div>
                    <Label>Price per KM (KES)</Label>
                    <Input name="price_per_km" defaultValue={String(profile.price_per_km ?? "")} />
                  </div>
                </>
              )}
            </div>
            <Button size="sm" disabled={submitting}>
              {submitting ? "Saving…" : "Save Profile"}
            </Button>
          </form>
        </Section>
      )}

      {/* Change Password */}
      <Section title="Change Password">
        {pwMsg && (
          <div className="mb-4">
            <Alert variant={pwMsg.type} title="" message={pwMsg.text} />
          </div>
        )}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>Current Password</Label>
              <Input name="old_password" type="password" placeholder="Current password" />
            </div>
            <div>
              <Label>New Password</Label>
              <Input name="new_password1" type="password" placeholder="New password" />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input name="new_password2" type="password" placeholder="Confirm" />
            </div>
          </div>
          <Button size="sm" disabled={submitting}>
            {submitting ? "Changing…" : "Change Password"}
          </Button>
        </form>
      </Section>

      {/* Notification Preferences */}
      {prefs && (
        <Section title="Notification Preferences">
          {prefsMsg && (
            <div className="mb-4">
              <Alert variant={prefsMsg.type} title="" message={prefsMsg.text} />
            </div>
          )}
          <div className="space-y-3">
            {Object.entries(notifLabels).map(([key, label]) => {
              const val = prefs[key as keyof NotificationPreferences];
              if (typeof val !== "boolean") return null;
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTogglePref(key, val)}
                    className={`relative h-6 w-11 rounded-full transition ${
                      val ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        val ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </label>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        {title}
      </h2>
      {children}
    </div>
  );
}
