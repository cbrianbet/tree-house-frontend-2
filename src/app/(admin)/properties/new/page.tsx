"use client";
import React, { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import PropertiesTopHeader from "@/components/properties/PropertiesTopHeader";
import { createProperty } from "@/lib/api/properties";
import { AxiosError } from "axios";
import type { ApiErrorDetail, PropertyType } from "@/types/api";

const OSMMapPicker = dynamic(() => import("@/components/properties/OSMMapPicker"), {
  ssr: false,
});

const propertyTypeOptions = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land" },
  { value: "bungalow", label: "Bungalow" },
  { value: "duplex", label: "Duplex" },
  { value: "townhouse", label: "Townhouse" },
  { value: "studio", label: "Studio" },
  { value: "cottage", label: "Cottage" },
  { value: "penthouse", label: "Penthouse" },
  { value: "other", label: "Other" },
];

const amenityOptions = [
  "Parking",
  "Security",
  "CCTV",
  "Swimming Pool",
  "Generator",
  "Gym",
  "Elevator",
  "Borehole",
  "WiFi Lobby",
  "Playground",
  "Rooftop",
  "DSQ",
];

export default function NewPropertyPage() {
  const router = useRouter();
  const [propertyType, setPropertyType] = useState("");
  const [description, setDescription] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [city, setCity] = useState("Nairobi");
  const [address, setAddress] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [latitude, setLatitude] = useState(-1.2921);
  const [longitude, setLongitude] = useState(36.8172);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checklist = useMemo(
    () => ({
      name: Boolean(propertyName.trim()),
      type: Boolean(propertyType),
      address: Boolean(address.trim()),
      city: Boolean(city),
      amenities: amenities.length > 0,
      photos: files.length > 0,
    }),
    [address, amenities.length, city, files.length, propertyName, propertyType],
  );

  const completedCount = Object.values(checklist).filter(Boolean).length;

  function toggleAmenity(amenity: string) {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity],
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);

    try {
      const property = await createProperty({
        name: propertyName || (fd.get("name") as string),
        description: [
          description,
          address ? `Address: ${address}` : "",
          city ? `City: ${city}` : "",
          amenities.length ? `Amenities: ${amenities.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        property_type: propertyType as PropertyType,
        latitude,
        longitude,
      });
      router.push(`/properties/${property.id}`);
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorDetail>;
      setError(axErr.response?.data?.detail ?? "Failed to create property.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="landlord-light space-y-4 text-[#1A1A1A]" style={{ background: "#F7F6F2", minHeight: "100%", margin: "-24px -24px 0", padding: "24px" }}>
      <style jsx>{`
        .landlord-light :global(input),
        .landlord-light :global(textarea),
        .landlord-light :global(select) {
          background: #ffffff !important;
          color: #1a1a1a !important;
          border-color: rgba(0, 0, 0, 0.18) !important;
        }
        .landlord-light :global(input::placeholder),
        .landlord-light :global(textarea::placeholder) {
          color: #6b6b6b !important;
        }
      `}</style>
      <PropertiesTopHeader
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Properties", href: "/properties" },
          { label: "Add property" },
        ]}
        rightActions={
          <>
            <button
              type="button"
              onClick={() => router.push("/properties")}
              style={{ height: 34, padding: "0 14px", background: "#fff", color: "#3D3D3D", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="property-create-form"
              disabled={submitting}
              style={{ height: 34, padding: "0 14px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Saving..." : "Save property"}
            </button>
          </>
        }
      />

    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h1 className="text-xl font-semibold text-gray-800">
            Add Property
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete property details, amenities, and media.
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
            <Step label="Basic details" state={completedCount >= 2 ? "done" : "active"} />
            <Step label="Amenities" state={completedCount >= 4 ? "done" : "pending"} />
            <Step label="Photos" state={checklist.photos ? "done" : "pending"} />
            <Step label="Review" state={completedCount === 6 ? "done" : "pending"} />
          </div>
        </div>

        {error && (
          <div className="mb-1">
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <form id="property-create-form" onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Basic details
              </h2>
              <div>
                <Label>Property Name</Label>
                <Input
                  name="name"
                  placeholder="e.g. Sunset Apartments"
                  onChange={(e) => setPropertyName(e.target.value)}
                />
              </div>
              <div>
                <Label>Description</Label>
                <TextArea
                  placeholder="Describe the property"
                  rows={3}
                  value={description}
                  onChange={setDescription}
                />
              </div>
              <div>
                <Label>Property Type</Label>
                <Select
                  options={propertyTypeOptions}
                  placeholder="Select type"
                  onChange={setPropertyType}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Street Address</Label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300"
                    placeholder="Westlands Road, Plot 14"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300"
                  >
                    <option>Nairobi</option>
                    <option>Mombasa</option>
                    <option>Kisumu</option>
                    <option>Nakuru</option>
                    <option>Eldoret</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location picker (OpenStreetMap)</Label>
                <OSMMapPicker
                  latitude={latitude}
                  longitude={longitude}
                  onChange={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Latitude</Label>
                    <input
                      value={latitude}
                      onChange={(e) => setLatitude(Number(e.target.value))}
                      type="number"
                      step={0.0001}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300"
                    />
                  </div>
                  <div>
                    <Label>Longitude</Label>
                    <input
                      value={longitude}
                      onChange={(e) => setLongitude(Number(e.target.value))}
                      type="number"
                      step={0.0001}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Amenities
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {amenityOptions.map((amenity) => {
                  const checked = amenities.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                        checked
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-brand-200"
                      }`}
                    >
                      {amenity}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Property photos
              </h2>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
                <span className="text-sm font-medium text-gray-700">
                  Click to upload photos
                </span>
                <span className="mt-1 text-xs text-gray-500">
                  Preview only — this form does not upload files. Add photos per unit after save (
                  <span className="font-medium">Unit detail → upload</span>
                  ).
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                />
              </label>
              {files.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {files.slice(0, 9).map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="truncate rounded bg-gray-100 px-2 py-1 text-xs text-gray-600"
                    >
                      {f.name}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Billing defaults
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Rent due day</Label>
                  <select className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300">
                    <option>1st of month</option>
                    <option>5th of month</option>
                    <option>15th of month</option>
                    <option>25th of month</option>
                  </select>
                </div>
                <div>
                  <Label>Late fee (%)</Label>
                  <Input type="number" placeholder="5" />
                </div>
              </div>
            </section>

            <Button className="w-full" size="sm" disabled={submitting}>
              {submitting ? "Creating..." : "Create Property"}
            </Button>
          </form>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-4 xl:h-fit">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Completion checklist
          </h3>
          <ChecklistItem done={checklist.name} label="Property name" />
          <ChecklistItem done={checklist.type} label="Property type" />
          <ChecklistItem done={checklist.address} label="Street address" />
          <ChecklistItem done={checklist.city} label="City" />
          <ChecklistItem done={checklist.amenities} label="Amenities selected" />
          <ChecklistItem done={checklist.photos} label="At least 1 photo" />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Tips
          </h3>
          <div className="space-y-0">
            <p className="py-2">📸 Properties with 5+ photos get 3× more applications from tenants.</p>
            <p className="border-t border-gray-200 py-2">📍 A precise address helps tenants find the property on the map.</p>
            <p className="border-t border-gray-200 py-2">📝 A clear description boosts your search ranking on the public search page.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            What happens next
          </h3>
          <p>
            After saving, you can add individual units to this property. Each unit can have its own rent, bedrooms, bathrooms, and images.
          </p>
          <p className="mt-3">
            The property will not appear on public search until at least one unit is listed as available.
          </p>
        </div>
      </aside>
    </div>
    </div>
  );
}

function Step({ label, state }: { label: string; state: "done" | "active" | "pending" }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
          state === "done"
            ? "bg-success-100 text-success-700"
            : state === "active"
              ? "bg-brand-100 text-brand-700"
              : "bg-gray-100 text-gray-500"
        }`}
      >
        {state === "done" ? "✓" : "•"}
      </span>
      <span className="text-[11px] text-gray-600">{label}</span>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
          done
            ? "bg-success-100 text-success-700"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {done ? "✓" : "○"}
      </span>
      <span className={done ? "text-gray-800" : "text-gray-500"}>
        {label}
      </span>
    </div>
  );
}
