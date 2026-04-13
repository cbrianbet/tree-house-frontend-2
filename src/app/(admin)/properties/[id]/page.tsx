"use client";
import React, { useEffect, useState, FormEvent, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import {
  getProperty,
  deleteProperty,
  listUnits,
  createUnit,
  listPropertyAgents,
  appointAgent,
  removeAgent,
  createLease,
  getUnitLease,
  listLeaseDocuments,
  createLeaseDocument,
  signLeaseDocument,
  listPropertyReviews,
  createPropertyReview,
  deletePropertyReview,
  listTenantReviews,
  createTenantReview,
  deleteTenantReview,
} from "@/lib/api/properties";
import {
  listInsights,
  createInsight,
} from "@/lib/api/neighborhood";
import { listRequests } from "@/lib/api/maintenance";
import type {
  Property,
  Unit,
  PropertyAgent,
  UnitCreateRequest,
  Lease,
  LeaseDocument,
  PropertyReview,
  TenantReview,
  NeighborhoodInsight,
  InsightType,
  MaintenanceRequest,
} from "@/types/api";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Alert from "@/components/ui/alert/Alert";
import PropertiesTopHeader from "@/components/properties/PropertiesTopHeader";

import { ROLE_ADMIN, ROLE_TENANT, ROLE_LANDLORD, ROLE_AGENT } from "@/constants/roles";

const OSMMapPicker = dynamic(() => import("@/components/properties/OSMMapPicker"), {
  ssr: false,
});
const InsightsMap = dynamic(() => import("@/components/properties/InsightsMap"), {
  ssr: false,
});

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const propertyId = Number(params.id);

  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [agents, setAgents] = useState<PropertyAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // showUnitForm/showLeaseForm kept for legacy compatibility — unit creation now uses /properties/[id]/units/new
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showAgentForm, setShowAgentForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showLeaseForm, setShowLeaseForm] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Lease documents state
  const [unitLeases, setUnitLeases] = useState<Record<number, Lease>>({});
  const [leaseDocuments, setLeaseDocuments] = useState<Record<number, LeaseDocument[]>>({});
  const [showDocsFor, setShowDocsFor] = useState<number | null>(null);
  const [showDocUpload, setShowDocUpload] = useState(false);

  // Reviews state
  const [propReviews, setPropReviews] = useState<PropertyReview[]>([]);
  const [tenantReviews, setTenantReviews] = useState<TenantReview[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showTenantReviewForm, setShowTenantReviewForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"units" | "info" | "maintenance" | "neighborhood">("units");

  // Neighborhood insights state
  const [insights, setInsights] = useState<NeighborhoodInsight[]>([]);
  const [showInsightForm, setShowInsightForm] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [insightLat, setInsightLat] = useState(-1.2921);
  const [insightLng, setInsightLng] = useState(36.8172);

  const canManage =
    user && (user.role === ROLE_ADMIN || user.role === ROLE_LANDLORD || user.role === ROLE_AGENT);

  const fetchAll = useCallback(async () => {
    try {
      const [p, u, a, pr, tr, ni, allMaint] = await Promise.all([
        getProperty(propertyId),
        listUnits(propertyId),
        listPropertyAgents(propertyId).catch(() => []),
        listPropertyReviews(propertyId).catch(() => []),
        listTenantReviews(propertyId).catch(() => []),
        listInsights(propertyId).catch(() => []),
        listRequests().catch(() => []),
      ]);
      setProperty(p);
      setUnits(u);
      setAgents(a);
      setPropReviews(pr);
      setTenantReviews(tr);
      setInsights(ni);
      // Filter maintenance requests that belong to this property's units
      const unitIds = new Set(u.map((unit) => unit.id));
      setMaintenance(allMaint.filter((r) => r.unit !== null && unitIds.has(r.unit as number)));

      // Fetch leases for occupied units
      const leaseMap: Record<number, Lease> = {};
      await Promise.all(
        u
          .filter((unit) => unit.is_occupied)
          .map(async (unit) => {
            try {
              const lease = await getUnitLease(unit.id);
              leaseMap[unit.id] = lease;
            } catch {
              // no active lease
            }
          }),
      );
      setUnitLeases(leaseMap);
    } catch {
      setError("Failed to load property.");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleDeleteProperty() {
    if (!confirm("Delete this property?")) return;
    try {
      await deleteProperty(propertyId);
      router.push("/properties");
    } catch {
      setError("Failed to delete property.");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleAddUnit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const data: UnitCreateRequest = {
        name: fd.get("unit_name") as string,
        floor: fd.get("floor") as string,
        description: fd.get("unit_description") as string,
        bedrooms: Number(fd.get("bedrooms")),
        bathrooms: Number(fd.get("bathrooms")),
        price: fd.get("price") as string,
        service_charge: fd.get("service_charge") as string,
        security_deposit: fd.get("security_deposit") as string,
        amenities: fd.get("amenities") as string,
        parking_space: fd.get("parking_space") === "on",
        parking_slots: Number(fd.get("parking_slots") || 0),
        is_public: true,
      };
      await createUnit(propertyId, data);
      setShowUnitForm(false);
      await fetchAll();
    } catch {
      setError("Failed to add unit.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAppointAgent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await appointAgent(propertyId, Number(fd.get("agent_user_id")));
      setShowAgentForm(false);
      await fetchAll();
    } catch {
      setError("Failed to appoint agent.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveAgent(appointmentId: number) {
    if (!confirm("Remove this agent?")) return;
    try {
      await removeAgent(propertyId, appointmentId);
      await fetchAll();
    } catch {
      setError("Failed to remove agent.");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleCreateLease(e: FormEvent<HTMLFormElement>, unitId: number) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createLease(unitId, {
        tenant: Number(fd.get("tenant_id")),
        start_date: fd.get("start_date") as string,
        end_date: fd.get("end_date") as string,
        rent_amount: fd.get("rent_amount") as string,
        is_active: true,
      });
      setShowLeaseForm(null);
      await fetchAll();
    } catch {
      setError("Failed to create lease.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!property) {
    return (
      <Alert variant="error" title="Not found" message="Property not found." />
    );
  }

  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.is_occupied).length;
  const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
  const occupancyPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const monthlyRevenue = units
    .filter((u) => u.is_occupied)
    .reduce((sum, u) => sum + Number(u.price || 0), 0);

  const descriptionParts = (property.description || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const addressLine =
    descriptionParts.find((line) => line.toLowerCase().startsWith("address:"))?.replace(/^address:\s*/i, "") ?? "";
  const cityLine =
    descriptionParts.find((line) => line.toLowerCase().startsWith("city:"))?.replace(/^city:\s*/i, "") ?? "";
  const amenitiesLine =
    descriptionParts.find((line) => line.toLowerCase().startsWith("amenities:"))?.replace(/^amenities:\s*/i, "") ?? "";

  const canDelete = canManage && user?.role !== ROLE_AGENT;

  return (
    <div className="space-y-6 text-[#1A1A1A]">
      <PropertiesTopHeader
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Properties", href: "/properties" },
          { label: property.name },
        ]}
        rightActions={<>
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            style={{ height: 34, padding: "0 14px", background: "#fff", color: "#3D3D3D", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}
          >
            Edit property
          </button>
          {canDelete ? (
            <button
              type="button"
              onClick={handleDeleteProperty}
              style={{ height: 34, padding: "0 14px", background: "#FCEBEB", color: "#A32D2D", border: "0.5px solid #F09595", borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}
            >
              Delete
            </button>
          ) : null}
        </>}
      />

      {error && (
        <Alert variant="error" title="Error" message={error} />
      )}

      {/* Property header */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-[104px] w-[104px] flex-shrink-0 items-center justify-center rounded-2xl bg-[#D4E8D0]">
              <svg viewBox="0 0 24 24" style={{ width: 46, height: 46, fill: "none", stroke: "#0F6E56", strokeWidth: 1.4, strokeLinecap: "round" }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="text-[30px] leading-[1.08] font-semibold tracking-[-0.01em] text-[#1A1A1A]">
                  {property.name}
                </h1>
                <Badge variant="light" color="primary">
                  {property.property_type}
                </Badge>
              </div>
              <p className="text-[13px] text-[#6B6B6B]">
                {[addressLine, cityLine].filter(Boolean).join(", ") || "Address not set"}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-x-7 gap-y-3 sm:grid-cols-5">
                <MetricInline label="Units" value={totalUnits} />
                <MetricInline label="Occupied" value={occupiedUnits} tone="green" />
                <MetricInline label="Vacant" value={vacantUnits} tone="amber" />
                <MetricInline label="Revenue / mo" value={`KES ${monthlyRevenue.toLocaleString("en-KE")}`} tone="green" />
                <MetricInline label="Occupancy" value={`${occupancyPct}%`} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${occupancyPct >= 80 ? "bg-[#E1F5EE] text-[#085041]" : "bg-[#FAEEDA] text-[#854F0B]"}`}>
              {occupancyPct}% occupied
            </span>
            {agents.length > 0 ? (
              <div className="rounded-lg border border-[#5DCAA5] bg-[#E1F5EE] px-3 py-2">
                <div className="text-xs font-medium text-[#085041]">Agent #{agents[0].agent}</div>
                <div className="text-[11px] text-[#0F6E56]">Assigned agent</div>
              </div>
            ) : (
              <div className="rounded-lg border border-black/10 bg-[#F2F1EB] px-3 py-2 text-xs text-[#6B6B6B]">No agent assigned</div>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              style={{ height: 28, padding: "0 10px", background: "#fff", color: "#3D3D3D", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}
            >
              Change agent
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-5 border-b border-black/10">
        <TabBtn
          label="Units"
          count={units.length}
          active={activeTab === "units"}
          onClick={() => setActiveTab("units")}
        />
        <TabBtn
          label="Property Info"
          active={activeTab === "info"}
          onClick={() => setActiveTab("info")}
        />
        <TabBtn
          label="Maintenance"
          count={vacantUnits}
          active={activeTab === "maintenance"}
          onClick={() => setActiveTab("maintenance")}
        />
        <TabBtn
          label="Neighbourhood"
          count={insights.length}
          active={activeTab === "neighborhood"}
          onClick={() => setActiveTab("neighborhood")}
        />
      </div>

      {/* Units */}
      {activeTab === "units" && (
      <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .unit-card-anim{animation:fadeUp 0.25s ease both}
      `}</style>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p style={{ fontSize: 12, color: "#6B6B6B" }}>
            {units.length} units · {occupiedUnits} occupied · {vacantUnits} vacant
          </p>
          {canManage && (
            <button
              type="button"
              onClick={() => router.push(`/properties/${propertyId}/units/new`)}
              style={{ height: 30, padding: "0 12px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round" }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add unit
            </button>
          )}
        </div>

        {units.length === 0 ? (
          <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "40px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#6B6B6B", marginBottom: 12 }}>No units yet. Add your first unit to get started.</p>
            {canManage && (
              <button
                type="button"
                onClick={() => router.push(`/properties/${propertyId}/units/new`)}
                style={{ height: 34, padding: "0 16px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}
              >
                + Add first unit
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
            {units.map((u, idx) => {
              const hasMaintenance = maintenance.some((r) => r.unit === u.id && (r.status === "open" || r.status === "in_progress"));
              const borderColor = hasMaintenance ? "#A32D2D" : u.is_occupied ? "#1D9E75" : "#EF9F27";
              const statusBg = hasMaintenance ? "#FCEBEB" : u.is_occupied ? "#E1F5EE" : "#FAEEDA";
              const statusColor = hasMaintenance ? "#A32D2D" : u.is_occupied ? "#085041" : "#854F0B";
              const statusDot = hasMaintenance ? "#A32D2D" : u.is_occupied ? "#1D9E75" : "#EF9F27";
              const statusLabel = hasMaintenance ? "Maintenance open" : u.is_occupied ? "Occupied" : "Vacant";
              const tenantInfo = u.is_occupied ? unitLeases[u.id] ? `Lease ends ${new Date(unitLeases[u.id].end_date).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}` : "Lease active" : "No tenant";
              return (
                <div
                  key={u.id}
                  className="unit-card-anim"
                  style={{
                    background: "#fff",
                    border: `0.5px solid rgba(0,0,0,0.07)`,
                    borderLeft: `3px solid ${borderColor}`,
                    borderRadius: "0 14px 14px 0",
                    padding: 14,
                    animationDelay: `${idx * 0.03}s`,
                    cursor: "pointer",
                  }}
                  onClick={() => router.push(`/units/${u.id}`)}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A", marginBottom: 3 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: "#6B6B6B", marginBottom: 10 }}>
                    {u.bedrooms} bed · {u.bathrooms} bath{u.parking_slots > 0 ? ` · ${u.parking_slots} parking` : ""}
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500, background: statusBg, color: statusColor, marginBottom: 10 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusDot, flexShrink: 0 }} />
                    {statusLabel}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#0F6E56", fontFamily: "'DM Mono', monospace" }}>
                    KES {Number(u.price || 0).toLocaleString("en-KE")}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B6B6B", marginTop: 2 }}>{tenantInfo}</div>
                  <div style={{ display: "flex", gap: 5, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => router.push(`/units/${u.id}`)}
                      style={{ flex: 1, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: "#0F6E56", color: "#fff", border: "none" }}
                    >
                      View
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => router.push(`/units/${u.id}`)}
                        style={{ flex: 1, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: "#fff", color: "#3D3D3D", border: "0.5px solid rgba(0,0,0,0.12)" }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === "info" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoSectionCard title="Property Details">
            <InfoRow label="Property type" value={property.property_type ? `${property.property_type} block` : "Apartment block"} />
            <InfoRow label="Year built" value="2018" />
            <InfoRow label="Total floors" value="4" />
            <InfoRow label="Parking spaces" value={String(units.reduce((sum, u) => sum + Number(u.parking_slots || 0), 0))} />
            <InfoRow label="Water source" value="Nairobi Water Board + borehole" />
            <InfoRow label="Backup power" value="Generator (24hr)" />
          </InfoSectionCard>

          <InfoSectionCard title="Shared Amenities">
            <div className="flex items-start justify-between border-b border-black/10 py-2">
              <p className="text-sm text-[#6B6B6B]">Amenities</p>
              <div className="flex max-w-[75%] flex-wrap justify-end gap-1.5">
                {(amenitiesLine ? amenitiesLine.split(",").map((s) => s.trim()).filter(Boolean) : ["Gym", "Swimming pool", "Parking", "Security", "CCTV", "WiFi lobby", "Elevator"]).map((item) => (
                  <span key={item} className="rounded-full border border-black/10 bg-[#F7F6F2] px-2 py-0.5 text-[10px] text-[#3D3D3D]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <InfoRow label="Security hours" value="24/7" />
            <InfoRow label="Caretaker" value="Samuel Kariuki" />
            <InfoRow label="Caretaker phone" value="+254 712 000 111" />
          </InfoSectionCard>

          <InfoSectionCard title="Financial Summary">
            <InfoRow label="Gross revenue / mo" value={`KES ${monthlyRevenue.toLocaleString("en-KE")}`} emphasize />
            <InfoRow
              label="Potential at 100%"
              value={`KES ${units.reduce((sum, u) => sum + Number(u.price || 0), 0).toLocaleString("en-KE")}`}
              emphasize
            />
            <InfoRow
              label="Vacancy loss / mo"
              value={`KES ${Math.max(0, units.reduce((sum, u) => sum + Number(u.price || 0), 0) - monthlyRevenue).toLocaleString("en-KE")}`}
              emphasize
            />
            <InfoRow label="Outstanding invoices" value="KES 22,000" emphasize />
            <InfoRow label="Billing due day" value="1st of month" />
          </InfoSectionCard>

          <InfoSectionCard title="Agent">
            <InfoRow label="Agent" value={agents[0] ? `Agent #${agents[0].agent}` : "Unassigned"} />
            <InfoRow label="Agency" value={agents[0] ? "Prime Realtors" : "-"} />
            <InfoRow label="Commission rate" value="5.00%" />
            <InfoRow label="Phone" value="+254 700 123 456" />
            <InfoRow
              label="Assigned since"
              value={agents[0] ? new Date(agents[0].appointed_at).toLocaleDateString() : "-"}
            />
          </InfoSectionCard>
        </div>
      )}


      {/* Lease Documents */}
      <LeaseDocumentsSection
        units={units}
        unitLeases={unitLeases}
        leaseDocuments={leaseDocuments}
        setLeaseDocuments={setLeaseDocuments}
        showDocsFor={showDocsFor}
        setShowDocsFor={setShowDocsFor}
        showDocUpload={showDocUpload}
        setShowDocUpload={setShowDocUpload}
        user={user}
        submitting={submitting}
        setSubmitting={setSubmitting}
        setError={setError}
      />

      {/* Property Reviews */}
      {activeTab === "info" && (
      <>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Property Reviews ({propReviews.length})
          </h2>
          <Button size="sm" onClick={() => setShowReviewForm(!showReviewForm)}>
            {showReviewForm ? "Cancel" : "Write Review"}
          </Button>
        </div>

        {showReviewForm && (
          <form
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              setSubmitting(true);
              const fd = new FormData(e.currentTarget);
              try {
                await createPropertyReview(propertyId, {
                  rating: Number(fd.get("rating")),
                  comment: fd.get("comment") as string,
                });
                setShowReviewForm(false);
                const reviews = await listPropertyReviews(propertyId);
                setPropReviews(reviews);
              } catch {
                setError("Failed to submit review. You may have already reviewed this property.");
              } finally {
                setSubmitting(false);
              }
            }}
            className="mb-4 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Rating (1–5)</Label>
                <Input name="rating" type="number" placeholder="5" />
              </div>
              <div>
                <Label>Comment</Label>
                <Input name="comment" placeholder="Great property…" />
              </div>
            </div>
            <Button size="sm" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Review"}
            </Button>
          </form>
        )}

        {propReviews.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {propReviews.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-gray-100 p-3 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {r.reviewer_name}
                    </span>
                    <span className="text-sm text-yellow-500">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                  </div>
                  {(r.reviewer === user?.pk || user?.role === ROLE_ADMIN) && (
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this review?")) return;
                        await deletePropertyReview(propertyId, r.id);
                        setPropReviews((prev) => prev.filter((rv) => rv.id !== r.id));
                      }}
                      className="text-xs text-error-500 hover:text-error-600"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {r.comment}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tenant Reviews — visible to owner, agent, admin */}
      {user &&
        [ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT].includes(user.role) && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Tenant Reviews ({tenantReviews.length})
              </h2>
              {[ROLE_LANDLORD, ROLE_AGENT].includes(user.role) && (
                <Button
                  size="sm"
                  onClick={() => setShowTenantReviewForm(!showTenantReviewForm)}
                >
                  {showTenantReviewForm ? "Cancel" : "Review Tenant"}
                </Button>
              )}
            </div>

            {showTenantReviewForm && (
              <form
                onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  setSubmitting(true);
                  const fd = new FormData(e.currentTarget);
                  try {
                    await createTenantReview(propertyId, {
                      tenant: Number(fd.get("tenant_id")),
                      rating: Number(fd.get("rating")),
                      comment: fd.get("comment") as string,
                    });
                    setShowTenantReviewForm(false);
                    const reviews = await listTenantReviews(propertyId);
                    setTenantReviews(reviews);
                  } catch {
                    setError("Failed to submit tenant review.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="mb-4 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label>Tenant User ID</Label>
                    <Input name="tenant_id" type="number" placeholder="5" />
                  </div>
                  <div>
                    <Label>Rating (1–5)</Label>
                    <Input name="rating" type="number" placeholder="5" />
                  </div>
                  <div>
                    <Label>Comment</Label>
                    <Input name="comment" placeholder="Excellent tenant…" />
                  </div>
                </div>
                <Button size="sm" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit Review"}
                </Button>
              </form>
            )}

            {tenantReviews.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No tenant reviews yet.
              </p>
            ) : (
              <div className="space-y-3">
                {tenantReviews.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-gray-100 p-3 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          {r.tenant_name}
                        </span>
                        <span className="text-sm text-yellow-500">
                          {"★".repeat(r.rating)}
                          {"☆".repeat(5 - r.rating)}
                        </span>
                        <span className="text-xs text-gray-400">
                          by {r.reviewer_name}
                        </span>
                      </div>
                      {(r.reviewer === user.pk || user.role === ROLE_ADMIN) && (
                        <button
                          onClick={async () => {
                            if (!confirm("Delete this review?")) return;
                            await deleteTenantReview(propertyId, r.id);
                            setTenantReviews((prev) =>
                              prev.filter((rv) => rv.id !== r.id),
                            );
                          }}
                          className="text-xs text-error-500 hover:text-error-600"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {r.comment}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>
      )}

      {activeTab === "maintenance" && (
        <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "16px 18px" }}>
          {/* Summary row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Open requests", value: maintenance.filter((r) => r.status === "open").length, color: "#A32D2D", bg: "#FCEBEB" },
              { label: "In progress", value: maintenance.filter((r) => r.status === "in_progress").length, color: "#0C447C", bg: "#E6F1FB" },
              { label: "Completed", value: maintenance.filter((r) => r.status === "completed").length, color: "#0F6E56", bg: "#E1F5EE" },
            ].map((s) => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px", color: s.color, opacity: 0.7 }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 500, color: s.color, marginTop: 2 }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: "#6B6B6B", marginBottom: 12 }}>
            Requests
          </div>

          {maintenance.length === 0 ? (
            <div style={{ padding: "30px 0", textAlign: "center", color: "#6B6B6B", fontSize: 13 }}>
              No maintenance requests for this property.
            </div>
          ) : (
            maintenance.map((r) => {
              const iconBg = r.status === "open" || r.status === "submitted" ? "#FAEEDA" : r.status === "in_progress" || r.status === "assigned" ? "#E6F1FB" : "#E1F5EE";
              const iconColor = r.status === "open" || r.status === "submitted" ? "#854F0B" : r.status === "in_progress" || r.status === "assigned" ? "#0C447C" : "#0F6E56";
              const statusBg = r.status === "open" || r.status === "submitted" ? "#FAEEDA" : r.status === "in_progress" || r.status === "assigned" ? "#E6F1FB" : "#E1F5EE";
              const statusColor = r.status === "open" || r.status === "submitted" ? "#854F0B" : r.status === "in_progress" || r.status === "assigned" ? "#0C447C" : "#0F6E56";
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "0.5px solid rgba(0,0,0,0.07)" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 6, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "none", stroke: iconColor, strokeWidth: 1.8, strokeLinecap: "round" }}>
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: "#6B6B6B", marginTop: 2 }}>
                      {r.category} · Unit #{r.unit} · {new Date(r.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: statusBg, color: statusColor, flexShrink: 0 }}>
                    {r.status.replace("_", " ")}
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push(`/maintenance/${r.id}`)}
                    style={{ height: 26, padding: "0 10px", background: "#fff", color: "#3D3D3D", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 6, fontSize: 11, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", flexShrink: 0 }}
                  >
                    View
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Neighborhood Insights */}
      {activeTab === "neighborhood" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[#6B6B6B]">
              Neighbourhood Insights
            </div>
            {insights.length === 0 ? (
              <p className="text-sm text-gray-500">No neighborhood insights yet.</p>
            ) : (
              <div className="space-y-0">
                {insights.map((ins) => (
                  <div key={ins.id} className="border-b border-black/10 py-3 last:border-b-0">
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1 inline-block h-2 w-2 rounded-full ${
                          ins.insight_type === "transit"
                            ? "bg-[#0C447C]"
                            : ins.insight_type === "safety"
                            ? "bg-[#1D9E75]"
                            : "bg-[#EF9F27]"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-[#1A1A1A]">{ins.notes || ins.name}</p>
                        <p className="mt-1 text-[11px] text-[#6B6B6B]">
                          {ins.insight_type} · Added by {ins.added_by_name}
                          {ins.created_at ? ` · ${new Date(ins.created_at).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {user && [ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT].includes(user.role) && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setInsightLat(property.latitude);
                    setInsightLng(property.longitude);
                    setShowInsightForm((prev) => !prev);
                  }}
                  style={{ height: 30, padding: "0 12px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}
                >
                  + Add insight
                </button>
              </div>
            )}
            {showInsightForm && (
              <form
                onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  setSubmitting(true);
                  const fd = new FormData(e.currentTarget);
                  try {
                    await createInsight(propertyId, {
                      insight_type: fd.get("insight_type") as InsightType,
                      name: fd.get("name") as string,
                      address: (fd.get("address") as string) || undefined,
                      distance_km: (fd.get("distance_km") as string) || undefined,
                      rating: (fd.get("rating") as string) || undefined,
                      lat: insightLat.toString(),
                      lng: insightLng.toString(),
                      notes: (fd.get("notes") as string) || undefined,
                    });
                    setShowInsightForm(false);
                    const updated = await listInsights(propertyId);
                    setInsights(updated);
                  } catch {
                    setError("Failed to add insight.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="mt-3 space-y-2 rounded-xl border border-black/10 bg-[#F7F6F2] p-3"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select name="insight_type" className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-300">
                    <option value="school">School</option>
                    <option value="hospital">Hospital</option>
                    <option value="safety">Safety</option>
                    <option value="transit">Transit</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="other">Other</option>
                  </select>
                  <Input name="name" placeholder="Insight title" />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input name="address" placeholder="Address (optional)" />
                  <Input name="distance_km" placeholder="Distance in km (e.g. 0.8)" />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Input name="rating" placeholder="Rating (e.g. 4.2)" />
                  <div className="sm:col-span-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-[#6B6B6B]">
                    Selected coordinates: {insightLat.toFixed(5)}, {insightLng.toFixed(5)}
                  </div>
                </div>
                <OSMMapPicker
                  latitude={insightLat}
                  longitude={insightLng}
                  onChange={(lat, lng) => {
                    setInsightLat(lat);
                    setInsightLng(lng);
                  }}
                />
                <Input name="notes" placeholder="Insight description" />
                <Button size="sm" disabled={submitting}>
                  {submitting ? "Adding..." : "Save insight"}
                </Button>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[#6B6B6B]">
              Location
            </div>
            <div className="mb-3 h-[220px] overflow-hidden rounded-xl border border-black/10 bg-[#F2F1EB]">
              <InsightsMap
                propertyLat={property.latitude}
                propertyLng={property.longitude}
                propertyName={property.name}
                insights={insights}
              />
            </div>
            <div className="space-y-0">
              <div className="flex items-center justify-between border-b border-black/10 py-2 text-sm">
                <span className="text-[#6B6B6B]">Full address</span>
                <span className="text-[#1A1A1A]">{addressLine || "-"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-black/10 py-2 text-sm">
                <span className="text-[#6B6B6B]">City</span>
                <span className="text-[#1A1A1A]">{cityLine || "-"}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="text-[#6B6B6B]">Coordinates</span>
                <span className="text-[#1A1A1A]">
                  {property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}
                </span>
              </div>
            </div>
            <div className="mt-2">
              <a
                href={`https://www.openstreetmap.org/?mlat=${property.latitude}&mlon=${property.longitude}#map=16/${property.latitude}/${property.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#0F6E56] hover:underline"
              >
                Open in OpenStreetMap
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative -mb-px inline-flex items-center gap-1.5 border-b-2 px-0 pb-2 pt-1 text-sm transition ${
        active
          ? "border-[#1D9E75] text-[#0F6E56]"
          : "border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]"
      }`}
    >
      {label}
      {typeof count === "number" ? (
        <span
          className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none ${
            active ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-[#F2F1EB] text-[#6B6B6B]"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function InfoSectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-[#6B6B6B]">
        {title}
      </p>
      <div>{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-black/10 py-2 last:border-b-0">
      <p className="text-sm text-[#6B6B6B]">{label}</p>
      <p className={`text-sm ${emphasize ? "font-semibold text-[#0F6E56]" : "font-medium text-[#1A1A1A]"}`}>
        {value}
      </p>
    </div>
  );
}

function MetricInline({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "green" | "amber";
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.06em] text-[#6B6B6B]">{label}</p>
      <p
        className={`mt-1 text-[24px] leading-none font-semibold ${
          tone === "green"
            ? "text-[#0F6E56]"
            : tone === "amber"
            ? "text-[#854F0B]"
            : "text-[#1A1A1A]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function LeaseDocumentsSection({
  units,
  unitLeases,
  leaseDocuments,
  setLeaseDocuments,
  showDocsFor,
  setShowDocsFor,
  showDocUpload,
  setShowDocUpload,
  user,
  submitting,
  setSubmitting,
  setError,
}: {
  units: Unit[];
  unitLeases: Record<number, Lease>;
  leaseDocuments: Record<number, LeaseDocument[]>;
  setLeaseDocuments: React.Dispatch<React.SetStateAction<Record<number, LeaseDocument[]>>>;
  showDocsFor: number | null;
  setShowDocsFor: (v: number | null) => void;
  showDocUpload: boolean;
  setShowDocUpload: (v: boolean) => void;
  user: { pk: number; role: number } | null;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  setError: (v: string | null) => void;
}) {
  const occupiedUnitsWithLease = units.filter(
    (u) => u.is_occupied && unitLeases[u.id],
  );

  if (occupiedUnitsWithLease.length === 0) return null;

  const canUpload =
    user &&
    [ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT].includes(user.role);
  const isTenant = user?.role === ROLE_TENANT;

  async function loadDocs(leaseId: number) {
    try {
      const docs = await listLeaseDocuments(leaseId);
      setLeaseDocuments((prev) => ({ ...prev, [leaseId]: docs }));
    } catch {
      setError("Failed to load documents.");
    }
  }

  async function handleToggleDocs(unitId: number) {
    const lease = unitLeases[unitId];
    if (!lease) return;
    if (showDocsFor === unitId) {
      setShowDocsFor(null);
      return;
    }
    setShowDocsFor(unitId);
    if (!leaseDocuments[lease.id]) {
      await loadDocs(lease.id);
    }
  }

  async function handleUploadDoc(e: FormEvent<HTMLFormElement>, leaseId: number) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createLeaseDocument(leaseId, {
        document_type: fd.get("document_type") as LeaseDocument["document_type"],
        title: fd.get("title") as string,
        file_url: fd.get("file_url") as string,
      });
      setShowDocUpload(false);
      await loadDocs(leaseId);
    } catch {
      setError("Failed to upload document.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSign(leaseId: number, docId: number) {
    setSubmitting(true);
    try {
      await signLeaseDocument(leaseId, docId);
      await loadDocs(leaseId);
    } catch {
      setError("Failed to sign document. It may already be signed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        Lease Documents
      </h2>
      <div className="space-y-3">
        {occupiedUnitsWithLease.map((u) => {
          const lease = unitLeases[u.id];
          const docs = leaseDocuments[lease.id] ?? [];
          const isOpen = showDocsFor === u.id;

          return (
            <div key={u.id} className="rounded-xl border border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => handleToggleDocs(u.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <span className="font-medium text-gray-800 dark:text-white/90">
                  {u.name} — Lease #{lease.id}
                </span>
                <span className="text-xs text-gray-400">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 p-4 dark:border-gray-700">
                  {canUpload && (
                    <div className="mb-3">
                      {showDocUpload ? (
                        <form
                          onSubmit={(e) => handleUploadDoc(e, lease.id)}
                          className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
                        >
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                              <Label>Type</Label>
                              <select
                                name="document_type"
                                className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
                              >
                                <option value="lease_agreement">Lease Agreement</option>
                                <option value="addendum">Addendum</option>
                                <option value="notice">Notice</option>
                                <option value="inspection_report">Inspection Report</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div>
                              <Label>Title</Label>
                              <Input name="title" placeholder="Lease Agreement 2024" />
                            </div>
                            <div>
                              <Label>Document URL</Label>
                              <Input name="file_url" placeholder="https://storage.example.com/doc.pdf" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" disabled={submitting}>
                              Upload
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowDocUpload(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <Button size="sm" onClick={() => setShowDocUpload(true)}>
                          Add Document
                        </Button>
                      )}
                    </div>
                  )}
                  {docs.length === 0 ? (
                    <p className="text-sm text-gray-400">No documents.</p>
                  ) : (
                    <div className="space-y-2">
                      {docs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50"
                        >
                          <div>
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-brand-500 hover:text-brand-600"
                            >
                              {doc.title}
                            </a>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>{doc.document_type.replace("_", " ")}</span>
                              {doc.signed_by && (
                                <Badge variant="light" size="sm" color="success">
                                  Signed
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isTenant && !doc.signed_by && (
                            <Button
                              size="sm"
                              onClick={() => handleSign(lease.id, doc.id)}
                              disabled={submitting}
                            >
                              Sign
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
