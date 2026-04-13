"use client";
import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createRequest } from "@/lib/api/maintenance";
import { listProperties } from "@/lib/api/properties";
import type { Property, MaintenanceCategory, MaintenancePriority } from "@/types/api";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import { AxiosError } from "axios";
import type { ApiErrorDetail } from "@/types/api";

const categoryOptions = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "carpentry", label: "Carpentry" },
  { value: "painting", label: "Painting" },
  { value: "masonry", label: "Masonry" },
  { value: "other", label: "Other" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function NewMaintenancePage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProperties().then(setProperties).catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const unitVal = fd.get("unit") as string;

    try {
      const req = await createRequest({
        property: Number(selectedProperty),
        ...(unitVal ? { unit: Number(unitVal) } : {}),
        title: fd.get("title") as string,
        description,
        category: category as MaintenanceCategory,
        priority: priority as MaintenancePriority,
      });
      router.push(`/maintenance/${req.id}`);
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorDetail>;
      setError(
        axErr.response?.data?.detail ?? "Failed to submit request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const propertyOptions = properties.map((p) => ({
    value: String(p.id),
    label: p.name,
  }));

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">
        New Maintenance Request
      </h1>

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Property</Label>
            <Select
              options={propertyOptions}
              placeholder="Select a property"
              onChange={setSelectedProperty}
            />
          </div>
          <div>
            <Label>Unit (optional)</Label>
            <Input name="unit" type="number" placeholder="Leave blank for common area" />
          </div>
          <div>
            <Label>Title</Label>
            <Input name="title" placeholder="e.g. Leaking kitchen tap" />
          </div>
          <div>
            <Label>Description</Label>
            <TextArea
              placeholder="Describe the issue in detail"
              rows={4}
              onChange={setDescription}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select
                options={categoryOptions}
                placeholder="Select category"
                onChange={setCategory}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                options={priorityOptions}
                placeholder="Select priority"
                onChange={setPriority}
              />
            </div>
          </div>
          <Button className="w-full" size="sm" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Request"}
          </Button>
        </form>
      </div>
    </div>
  );
}
