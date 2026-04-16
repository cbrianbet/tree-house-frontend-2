"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DM_Sans } from "next/font/google";
import { createRequest } from "@/lib/api/maintenance";
import { listProperties, listUnits } from "@/lib/api/properties";
import type {
  MaintenanceCategory,
  MaintenancePriority,
  Property,
  Unit,
} from "@/types/api";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";
import {
  FD,
  FINANCE_FIELD_CLASS,
  financeFieldInputStyle,
  financeFieldSelectStyle,
  financeFieldTextAreaStyle,
  financeFieldLabelStyle,
  financePbtn,
  financeGbtn,
} from "@/constants/financeDesign";
import { AxiosError } from "axios";
import type { ApiErrorDetail } from "@/types/api";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

const CATEGORIES: { value: MaintenanceCategory; label: string }[] = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "carpentry", label: "Carpentry" },
  { value: "painting", label: "Painting" },
  { value: "masonry", label: "Masonry" },
  { value: "other", label: "Other" },
];

const PRIORITIES: { value: MaintenancePriority; label: string; hint: string }[] = [
  { value: "low", label: "Low", hint: "Non-urgent, can wait" },
  { value: "medium", label: "Medium", hint: "Should be addressed soon" },
  { value: "high", label: "High", hint: "Needs prompt attention" },
  { value: "urgent", label: "Urgent", hint: "Safety or habitability risk" },
];

export default function NewMaintenancePage() {
  const router = useRouter();
  const font = dmSans.style.fontFamily;

  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProperties().then(setProperties).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProperty) {
      setUnits([]);
      setSelectedUnit("");
      return;
    }
    setLoadingUnits(true);
    setSelectedUnit("");
    listUnits(Number(selectedProperty))
      .then(setUnits)
      .catch(() => setUnits([]))
      .finally(() => setLoadingUnits(false));
  }, [selectedProperty]);

  const canSubmit =
    selectedProperty && title.trim() && category && priority && !submitting;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const req = await createRequest({
        property: Number(selectedProperty),
        ...(selectedUnit ? { unit: Number(selectedUnit) } : {}),
        title: title.trim(),
        description,
        category: category as MaintenanceCategory,
        priority: priority as MaintenancePriority,
      });
      router.push(`/maintenance/${req.id}`);
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorDetail>;
      setError(axErr.response?.data?.detail ?? "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectStyle = financeFieldSelectStyle(font);
  const inputStyle = financeFieldInputStyle({ fontFamily: font });
  const textareaStyle = financeFieldTextAreaStyle(100);
  const labelStyle = financeFieldLabelStyle;

  const card: React.CSSProperties = {
    background: FD.wh,
    border: `0.5px solid ${FD.bd}`,
    borderRadius: FD.rlg,
    padding: "18px 20px",
  };

  const cardTitle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 500,
    color: FD.k9,
    marginBottom: 4,
  };

  const cardSub: React.CSSProperties = {
    fontSize: 12,
    color: FD.k5,
    marginBottom: 18,
  };

  return (
    <div
      className={`${dmSans.className} -m-4 md:-m-6`}
      style={{
        fontFamily: font,
        fontSize: 14,
        color: FD.k9,
        background: FD.surf,
        minHeight: "calc(100vh - 80px)",
      }}
    >
      <FinancePageTopBar
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Maintenance", href: "/maintenance" },
          { label: "Log request" },
        ]}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => router.push("/maintenance")}
              style={financeGbtn(font)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="new-request-form"
              disabled={!canSubmit}
              className="transition-colors hover:bg-[#085041]"
              style={{
                ...financePbtn(font),
                opacity: canSubmit ? 1 : 0.5,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {submitting ? "Submitting…" : "Log request"}
            </button>
          </div>
        }
      />

      <div style={{ padding: "22px 24px", maxWidth: 680, margin: "0 auto" }}>
        {/* Error banner */}
        {error && (
          <div
            style={{
              ...card,
              background: FD.r0,
              border: `0.5px solid ${FD.r3}`,
              marginBottom: 14,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke={FD.r6}
              strokeWidth={2}
              strokeLinecap="round"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ fontSize: 13, color: FD.r6 }}>{error}</div>
          </div>
        )}

        <form
          id="new-request-form"
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {/* Location */}
          <div style={card}>
            <div style={cardTitle}>Location</div>
            <div style={cardSub}>Which property and unit is affected?</div>

            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
              className="max-sm:grid-cols-1"
            >
              <div>
                <label style={labelStyle}>Property *</label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className={FINANCE_FIELD_CLASS}
                  style={selectStyle}
                >
                  <option value="">Select property</option>
                  {properties.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Unit (optional)</label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  disabled={!selectedProperty || loadingUnits}
                  className={FINANCE_FIELD_CLASS}
                  style={{
                    ...selectStyle,
                    opacity: !selectedProperty ? 0.6 : 1,
                    cursor: !selectedProperty ? "not-allowed" : "pointer",
                  }}
                >
                  <option value="">
                    {loadingUnits
                      ? "Loading units…"
                      : !selectedProperty
                        ? "Select property first"
                        : "Common area"}
                  </option>
                  {units.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>
                  Leave blank for common area issues
                </div>
              </div>
            </div>
          </div>

          {/* Issue details */}
          <div style={card}>
            <div style={cardTitle}>Issue details</div>
            <div style={cardSub}>Describe the maintenance issue</div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Burst pipe under kitchen sink"
                className={FINANCE_FIELD_CLASS}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide as much detail as possible — what happened, where exactly, any damage observed…"
                className={FINANCE_FIELD_CLASS}
                style={{ ...textareaStyle, fontFamily: font }}
              />
            </div>
          </div>

          {/* Classification */}
          <div style={card}>
            <div style={cardTitle}>Classification</div>
            <div style={cardSub}>
              Help us route this to the right artisan
            </div>

            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
              className="max-sm:grid-cols-1"
            >
              <div>
                <label style={labelStyle}>Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={FINANCE_FIELD_CLASS}
                  style={selectStyle}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority *</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={FINANCE_FIELD_CLASS}
                  style={selectStyle}
                >
                  <option value="">Select priority</option>
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label} — {p.hint}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Mobile submit */}
          <div className="sm:hidden" style={{ marginTop: 4 }}>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                ...financePbtn(font),
                width: "100%",
                justifyContent: "center",
                height: 40,
                opacity: canSubmit ? 1 : 0.5,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {submitting ? "Submitting…" : "Log request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
