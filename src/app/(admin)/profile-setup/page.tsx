"use client";
import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import TextArea from "@/components/form/input/TextArea";
import {
  createTenantProfile,
  createLandlordProfile,
  createAgentProfile,
  createArtisanProfile,
  createMovingCompanyProfile,
} from "@/lib/api/profiles";
import { AxiosError } from "axios";
import type { ApiErrorDetail, ArtisanTrade } from "@/types/api";

import { ROLE_TENANT, ROLE_LANDLORD, ROLE_AGENT, ROLE_ARTISAN, ROLE_MOVING } from "@/constants/roles";

const tradeOptions = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "carpentry", label: "Carpentry" },
  { value: "painting", label: "Painting" },
  { value: "masonry", label: "Masonry" },
  { value: "other", label: "Other" },
];

export default function ProfileSetupPage() {
  const { user, roleName } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [trade, setTrade] = useState("");

  if (!user) return null;

  const role = user.role;
  const rn = roleName(role);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);

    try {
      if (role === ROLE_TENANT) {
        await createTenantProfile({
          user: user!.pk,
          national_id: fd.get("national_id") as string,
          emergency_contact_name: fd.get("emergency_contact_name") as string,
          emergency_contact_phone: fd.get("emergency_contact_phone") as string,
        });
      } else if (role === ROLE_LANDLORD) {
        await createLandlordProfile({
          user: user!.pk,
          company_name: fd.get("company_name") as string,
          tax_id: fd.get("tax_id") as string,
        });
      } else if (role === ROLE_AGENT) {
        await createAgentProfile({
          user: user!.pk,
          agency_name: fd.get("agency_name") as string,
          license_number: fd.get("license_number") as string,
          commission_rate: fd.get("commission_rate") as string,
        });
      } else if (role === ROLE_ARTISAN) {
        await createArtisanProfile({
          user: user!.pk,
          trade: trade as ArtisanTrade,
          bio: fd.get("bio") as string,
        });
      } else if (role === ROLE_MOVING) {
        const areas = (fd.get("service_areas") as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        await createMovingCompanyProfile({
          user: user!.pk,
          company_name: fd.get("company_name") as string,
          description: fd.get("description") as string,
          phone: fd.get("phone") as string,
          address: fd.get("address") as string,
          city: fd.get("city") as string,
          service_areas: areas,
          base_price: fd.get("base_price") as string,
          price_per_km: fd.get("price_per_km") as string,
        });
      }
      setSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorDetail>;
      setError(
        axErr.response?.data?.detail ??
          "Failed to save profile. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Complete Your {rn} Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Fill in your professional details to finish setting up your account.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert
            variant="success"
            title="Profile saved"
            message="Redirecting to dashboard…"
          />
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-5">
          {role === ROLE_TENANT && (
            <>
              <div>
                <Label>National ID</Label>
                <Input name="national_id" placeholder="e.g. 32145678" />
              </div>
              <div>
                <Label>Emergency Contact Name</Label>
                <Input name="emergency_contact_name" placeholder="John Doe" />
              </div>
              <div>
                <Label>Emergency Contact Phone</Label>
                <Input
                  name="emergency_contact_phone"
                  placeholder="+254700000000"
                />
              </div>
            </>
          )}

          {role === ROLE_LANDLORD && (
            <>
              <div>
                <Label>Company Name</Label>
                <Input
                  name="company_name"
                  placeholder="e.g. Bett Properties Ltd"
                />
              </div>
              <div>
                <Label>Tax ID</Label>
                <Input name="tax_id" placeholder="e.g. A001234567B" />
              </div>
            </>
          )}

          {role === ROLE_AGENT && (
            <>
              <div>
                <Label>Agency Name</Label>
                <Input
                  name="agency_name"
                  placeholder="e.g. Prime Realtors"
                />
              </div>
              <div>
                <Label>License Number</Label>
                <Input
                  name="license_number"
                  placeholder="e.g. RE-2024-001"
                />
              </div>
              <div>
                <Label>Commission Rate (%)</Label>
                <Input
                  name="commission_rate"
                  type="number"
                  step={0.01}
                  placeholder="5.00"
                />
              </div>
            </>
          )}

          {role === ROLE_ARTISAN && (
            <>
              <div>
                <Label>Trade</Label>
                <Select
                  options={tradeOptions}
                  placeholder="Select your trade"
                  onChange={setTrade}
                />
              </div>
              <div>
                <Label>Bio</Label>
                <TextArea
                  name="bio"
                  placeholder="Describe your experience…"
                  rows={4}
                />
              </div>
            </>
          )}

          {role === ROLE_MOVING && (
            <>
              <div>
                <Label>Company Name</Label>
                <Input name="company_name" placeholder="Swift Movers Ltd" />
              </div>
              <div>
                <Label>Description</Label>
                <TextArea name="description" placeholder="Professional moving services…" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input name="phone" placeholder="+254712345678" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input name="city" placeholder="Nairobi" />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input name="address" placeholder="123 Mover Street" />
              </div>
              <div>
                <Label>Service Areas (comma-separated)</Label>
                <Input name="service_areas" placeholder="Nairobi, Mombasa, Kisumu" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Base Price (KES)</Label>
                  <Input name="base_price" placeholder="5000.00" />
                </div>
                <div>
                  <Label>Price per KM (KES)</Label>
                  <Input name="price_per_km" placeholder="50.00" />
                </div>
              </div>
            </>
          )}

          <Button className="w-full" size="sm" disabled={submitting}>
            {submitting ? "Saving…" : "Save Profile"}
          </Button>
        </form>
      </div>
    </div>
  );
}
