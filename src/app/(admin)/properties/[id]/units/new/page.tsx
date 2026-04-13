"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createUnit, getProperty, uploadUnitImage } from "@/lib/api/properties";
import type { Property } from "@/types/api";
import { AxiosError } from "axios";

// ── Style tokens ────────────────────────────────────────────────────────────
const C = {
  green700: "#0F6E56",
  green800: "#085041",
  green500: "#1D9E75",
  green300: "#5DCAA5",
  green50: "#E1F5EE",
  gray900: "#1A1A1A",
  gray700: "#3D3D3D",
  gray500: "#6B6B6B",
  gray200: "#D3D1C7",
  gray100: "#E8E7E1",
  gray50: "#F2F1EB",
  surface: "#F7F6F2",
  border: "rgba(0,0,0,0.07)",
  borderMd: "rgba(0,0,0,0.12)",
  red600: "#A32D2D",
  red300: "#F09595",
  red50: "#FCEBEB",
};

const inputBase: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  background: C.gray50,
  border: `0.5px solid ${C.borderMd}`,
  borderRadius: 8,
  fontSize: 13,
  color: C.gray900,
  fontFamily: "inherit",
  outline: "none",
};

const UNIT_AMENITIES = [
  "WiFi",
  "Air conditioning",
  "Balcony",
  "Fitted kitchen",
  "Furnished",
  "Washing machine",
  "Dishwasher",
  "Pet-friendly",
  "Garden access",
  "Storage room",
  "Smart TV",
  "Fibre internet",
];

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "20px 22px" }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: C.gray900, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12, color: C.gray500, marginBottom: 18 }}>{sub}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 500,
          color: C.gray500,
          marginBottom: 5,
          letterSpacing: "0.4px",
          textTransform: "uppercase",
        }}
      >
        {label}
        {required && <span style={{ color: C.red600, marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {children}
    </div>
  );
}

function Stepper({ value, min = 0, max = 20, onChange }: { value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 38,
        background: C.gray50,
        border: `0.5px solid ${C.borderMd}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: 40, height: "100%", background: "transparent", border: "none", fontSize: 18, color: C.gray700, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}
      >
        −
      </button>
      <div style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 500, color: C.gray900 }}>
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{ width: 40, height: "100%", background: "transparent", border: "none", fontSize: 18, color: C.gray700, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}
      >
        +
      </button>
    </div>
  );
}

function ToggleRow({ label, sub, on, onToggle }: { label: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: `0.5px solid ${C.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.gray900 }}>{label}</div>
        <div style={{ fontSize: 11, color: C.gray500, marginTop: 2, lineHeight: 1.5 }}>{sub}</div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: on ? C.green500 : C.gray200,
          border: "none",
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 3,
            left: on ? 21 : 3,
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        />
      </button>
    </div>
  );
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: C.gray500, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: done ? C.green50 : C.gray100,
          border: `1px solid ${done ? C.green300 : C.gray200}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {done ? (
          <svg viewBox="0 0 10 10" style={{ width: 8, height: 8 }}>
            <polyline points="2,5 4,7 8,3" stroke={C.green700} strokeWidth="1.5" fill="none" />
          </svg>
        ) : (
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.gray200 }} />
        )}
      </div>
      <span style={{ fontSize: 12, color: done ? C.gray900 : C.gray500 }}>{label}</span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function NewUnitPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = Number(params.id);

  const [property, setProperty] = useState<Property | null>(null);
  const [unitName, setUnitName] = useState("");
  const [floor, setFloor] = useState("");
  const [description, setDescription] = useState("");
  const [beds, setBeds] = useState(2);
  const [baths, setBaths] = useState(1);
  const [parking, setParking] = useState(0);
  const [size, setSize] = useState("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [serviceCharge, setServiceCharge] = useState("");
  const [tourUrl, setTourUrl] = useState("");
  const [amenities, setAmenities] = useState<string[]>(["WiFi", "Balcony", "Fitted kitchen"]);
  const [isPublic, setIsPublic] = useState(true);
  const [acceptApps, setAcceptApps] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProperty(propertyId).then(setProperty).catch(() => {});
  }, [propertyId]);

  const checklist = useMemo(
    () => ({
      name: Boolean(unitName.trim()),
      rent: Boolean(rent.trim()),
      beds: beds > 0,
      amenities: amenities.length > 0,
      photos: files.length > 0,
    }),
    [unitName, rent, beds, amenities.length, files.length],
  );

  function toggleAmenity(a: string) {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!unitName.trim() || !rent.trim()) {
      setError("Unit number and rent are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const unit = await createUnit(propertyId, {
        name: unitName,
        floor,
        description,
        bedrooms: beds,
        bathrooms: baths,
        price: rent,
        service_charge: serviceCharge || "0",
        security_deposit: deposit || "0",
        amenities: amenities.join(", "),
        parking_space: parking > 0,
        parking_slots: parking,
        is_public: isPublic,
        tour_url: tourUrl || undefined,
      });
      for (const file of files.slice(0, 10)) {
        try {
          await uploadUnitImage(unit.id, file);
        } catch {
          // Unit exists; user can retry uploads on the unit detail page.
        }
      }
      router.push(`/units/${unit.id}`);
    } catch (err) {
      const axErr = err as AxiosError<Record<string, string[]>>;
      const detail = axErr.response?.data;
      setError(
        detail
          ? Object.values(detail).flat().join(" ")
          : "Failed to create unit.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Extract address from property description
  const propAddress = (() => {
    const parts = (property?.description ?? "").split("\n");
    const addr = parts.find((l) => l.toLowerCase().startsWith("address:"))?.replace(/^address:\s*/i, "") ?? "";
    const city = parts.find((l) => l.toLowerCase().startsWith("city:"))?.replace(/^city:\s*/i, "") ?? "";
    return [addr, city].filter(Boolean).join(", ") || "Nairobi";
  })();

  return (
    <div
      style={{
        background: C.surface,
        margin: "-24px",
        padding: 0,
        minHeight: "100%",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Topbar */}
      <div
        style={{
          background: "#fff",
          borderBottom: `0.5px solid ${C.border}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.gray500 }}>
          <Link href="/" style={{ color: C.gray500, textDecoration: "none" }}>
            Dashboard
          </Link>
          <svg viewBox="0 0 12 12" style={{ width: 10, height: 10 }}>
            <polyline points="4,2 8,6 4,10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <Link href="/properties" style={{ color: C.gray500, textDecoration: "none" }}>
            Properties
          </Link>
          <svg viewBox="0 0 12 12" style={{ width: 10, height: 10 }}>
            <polyline points="4,2 8,6 4,10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <Link href={`/properties/${propertyId}`} style={{ color: C.gray500, textDecoration: "none" }}>
            {property?.name ?? "..."}
          </Link>
          <svg viewBox="0 0 12 12" style={{ width: 10, height: 10 }}>
            <polyline points="4,2 8,6 4,10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span style={{ color: C.gray900, fontWeight: 500 }}>Add unit</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => router.push(`/properties/${propertyId}`)}
            style={{
              height: 34,
              padding: "0 14px",
              background: "#fff",
              color: C.gray700,
              border: `0.5px solid ${C.borderMd}`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="unit-form"
            disabled={submitting}
            style={{
              height: 34,
              padding: "0 14px",
              background: C.green700,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Saving..." : "Save unit"}
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 24px 40px" }}>
        {/* Property context banner */}
        {property && (
          <div
            style={{
              background: C.green50,
              border: `0.5px solid ${C.green300}`,
              borderRadius: 14,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              style={{ width: 18, height: 18, fill: "none", stroke: C.green700, strokeWidth: 1.8, strokeLinecap: "round", flexShrink: 0 }}
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span style={{ fontSize: 13, color: C.green800 }}>
              Adding a unit to <strong>{property.name}</strong>
              {propAddress ? ` · ${propAddress}` : ""}
            </span>
          </div>
        )}

        {error && (
          <div
            style={{
              background: C.red50,
              border: `0.5px solid ${C.red300}`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: C.red600,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 280px",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Form */}
          <form
            id="unit-form"
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Unit details */}
            <SectionCard title="Unit details" sub="Core information about this unit">
              <FieldRow>
                <Field label="Unit number" required>
                  <input
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="e.g. 1A, 204, PH1"
                    required
                    style={inputBase}
                  />
                </Field>
                <Field label="Floor">
                  <select
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    style={inputBase}
                  >
                    <option value="">Select floor</option>
                    <option>Ground floor</option>
                    <option>1st floor</option>
                    <option>2nd floor</option>
                    <option>3rd floor</option>
                    <option>4th floor</option>
                    <option>Penthouse</option>
                  </select>
                </Field>
              </FieldRow>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label="Bedrooms" required>
                  <Stepper value={beds} min={0} max={10} onChange={setBeds} />
                </Field>
                <Field label="Bathrooms" required>
                  <Stepper value={baths} min={0} max={10} onChange={setBaths} />
                </Field>
                <Field label="Parking spaces">
                  <Stepper value={parking} min={0} max={10} onChange={setParking} />
                </Field>
              </div>

              <Field label="Size (m²)">
                <input
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  type="number"
                  placeholder="e.g. 65"
                  min="10"
                  style={inputBase}
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this unit — views, layout, notable features…"
                  rows={3}
                  style={{
                    ...inputBase,
                    height: "auto",
                    padding: "10px 12px",
                    lineHeight: 1.5,
                    resize: "vertical",
                  }}
                />
                <p style={{ fontSize: 11, color: C.gray500, marginTop: 4 }}>
                  Shown to prospective tenants alongside photos
                </p>
              </Field>
            </SectionCard>

            {/* Pricing */}
            <SectionCard title="Pricing" sub="Rent and additional charges for this unit">
              <Field label="Monthly rent (KES)" required>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 12,
                      color: C.gray500,
                      fontWeight: 500,
                      pointerEvents: "none",
                    }}
                  >
                    KES
                  </span>
                  <input
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    type="number"
                    placeholder="e.g. 32000"
                    min="0"
                    required
                    style={{ ...inputBase, paddingLeft: 44 }}
                  />
                </div>
              </Field>

              <FieldRow>
                <Field label="Deposit amount (KES)">
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.gray500, fontWeight: 500, pointerEvents: "none" }}>KES</span>
                    <input
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value)}
                      type="number"
                      placeholder="e.g. 64000"
                      min="0"
                      style={{ ...inputBase, paddingLeft: 44 }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: C.gray500, marginTop: 4 }}>Typically 1–2 months rent</p>
                </Field>
                <Field label="Service charge (KES)">
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.gray500, fontWeight: 500, pointerEvents: "none" }}>KES</span>
                    <input
                      value={serviceCharge}
                      onChange={(e) => setServiceCharge(e.target.value)}
                      type="number"
                      placeholder="e.g. 3000"
                      min="0"
                      style={{ ...inputBase, paddingLeft: 44 }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: C.gray500, marginTop: 4 }}>Monthly charge for shared services</p>
                </Field>
              </FieldRow>

              <Field label="Tour URL">
                <input
                  value={tourUrl}
                  onChange={(e) => setTourUrl(e.target.value)}
                  type="url"
                  placeholder="https://matterport.com/…"
                  style={inputBase}
                />
                <p style={{ fontSize: 11, color: C.gray500, marginTop: 4 }}>
                  Virtual tour link shown on the public listing
                </p>
              </Field>
            </SectionCard>

            {/* Amenities */}
            <SectionCard
              title="Unit amenities"
              sub="Features specific to this unit (in addition to shared property amenities)"
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {UNIT_AMENITIES.map((a) => {
                  const checked = amenities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        background: checked ? C.green50 : C.gray50,
                        border: `0.5px solid ${checked ? C.green300 : C.borderMd}`,
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 12,
                        color: checked ? C.green800 : C.gray700,
                        fontFamily: "inherit",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 15,
                          height: 15,
                          border: `1.5px solid ${checked ? C.green700 : C.gray200}`,
                          borderRadius: 3,
                          background: checked ? C.green700 : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {checked && (
                          <svg viewBox="0 0 10 10" style={{ width: 8, height: 8 }}>
                            <polyline
                              points="2,5 4,7 8,3"
                              stroke="#fff"
                              strokeWidth="1.5"
                              fill="none"
                            />
                          </svg>
                        )}
                      </div>
                      {a}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            {/* Photos */}
            <SectionCard
              title="Unit photos"
              sub="Upload photos for this unit. First image is the hero on public search."
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1.5px dashed rgba(0,0,0,0.15)",
                  borderRadius: 12,
                  padding: "32px 20px",
                  cursor: "pointer",
                  background: C.gray50,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: 32,
                    height: 32,
                    fill: "none",
                    stroke: C.gray500,
                    strokeWidth: 1.5,
                    strokeLinecap: "round",
                    marginBottom: 8,
                  }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.gray700 }}>
                  Click to upload or drag &amp; drop
                </span>
                <span style={{ fontSize: 11, color: C.gray500, marginTop: 3 }}>
                  PNG, JPG up to 10MB · Max 10 photos
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                />
              </label>
              {files.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {files.map((f, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "3px 10px",
                        background: i === 0 ? C.green50 : C.gray50,
                        border: `0.5px solid ${i === 0 ? C.green300 : C.borderMd}`,
                        borderRadius: 20,
                        fontSize: 11,
                        color: i === 0 ? C.green800 : C.gray700,
                      }}
                    >
                      {i === 0 ? "★ Hero · " : ""}{f.name}
                    </span>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Listing settings */}
            <SectionCard
              title="Listing settings"
              sub="Control how this unit appears to prospective tenants"
            >
              <ToggleRow
                label="List on public search"
                sub="Make this unit visible to prospective tenants browsing the platform"
                on={isPublic}
                onToggle={() => setIsPublic((v) => !v)}
              />
              <ToggleRow
                label="Accept applications"
                sub="Allow tenants to submit applications for this unit directly"
                on={acceptApps}
                onToggle={() => setAcceptApps((v) => !v)}
              />
            </SectionCard>
          </form>

          {/* Sidebar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              position: "sticky",
              top: 70,
            }}
          >
            {/* Live preview */}
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                  color: C.gray500,
                  marginBottom: 8,
                }}
              >
                Search card preview
              </p>
              <div
                style={{
                  background: "#fff",
                  border: `0.5px solid ${C.border}`,
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "#D4E8D0",
                    height: 110,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{ width: 36, height: 36, fill: "none", stroke: C.green700, strokeWidth: 1.2, strokeLinecap: "round" }}
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: C.green700,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {rent ? `KES ${Number(rent).toLocaleString("en-KE")}` : "KES —"}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.gray900, marginTop: 2 }}>
                    {unitName || "Unit number"}
                  </div>
                  <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>
                    {property?.name ?? "..."} · Nairobi
                  </div>
                  <div style={{ fontSize: 11, color: C.gray500, marginTop: 4 }}>
                    {beds} bed · {baths} bath{size ? ` · ${size} m²` : ""}
                  </div>
                  {amenities.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {amenities.slice(0, 3).map((a) => (
                        <span
                          key={a}
                          style={{
                            padding: "2px 7px",
                            background: C.gray50,
                            border: `0.5px solid ${C.borderMd}`,
                            borderRadius: 10,
                            fontSize: 10,
                            color: C.gray700,
                          }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Checklist */}
            <SidebarCard title="Completion">
              <CheckItem done={checklist.name} label="Unit number" />
              <CheckItem done={checklist.rent} label="Monthly rent" />
              <CheckItem done={checklist.beds} label="Bedrooms set" />
              <CheckItem done={checklist.amenities} label="Amenities selected" />
              <CheckItem done={checklist.photos} label="At least 1 photo" />
            </SidebarCard>

            {/* Tip */}
            <SidebarCard title="Pricing tips">
              <p style={{ fontSize: 12, color: C.gray500, lineHeight: 1.6 }}>
                Setting a competitive rent increases your chances of filling the unit within 2 weeks.
                <br />
                <br />
                Properties with 5+ photos get <strong style={{ color: C.gray700 }}>3× more applications</strong> from prospective tenants.
              </p>
            </SidebarCard>

            <SidebarCard title="What happens next">
              <p style={{ fontSize: 12, color: C.gray500, lineHeight: 1.6 }}>
                After saving, the unit will appear on public search if you selected &ldquo;List on public search&rdquo;. Tenants can then submit applications directly.
              </p>
            </SidebarCard>
          </div>
        </div>
      </div>
    </div>
  );
}
