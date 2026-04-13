"use client";

import React, { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getUnit,
  getUnitLease,
  getProperty,
  updateUnit,
  uploadUnitImage,
  listUnitImages,
  listUnitTenantInvitations,
  createUnitTenantInvitation,
  resendTenantInvitation,
  type UnitImage,
} from "@/lib/api/properties";
import { apiMediaUrl } from "@/lib/api/mediaUrl";
import { listInvoices } from "@/lib/api/billing";
import { listRequests } from "@/lib/api/maintenance";
import { useAuth } from "@/context/AuthContext";
import { ROLE_ADMIN, ROLE_AGENT, ROLE_LANDLORD, ROLE_TENANT } from "@/constants/roles";
import type {
  Unit,
  Lease,
  Invoice,
  MaintenanceRequest,
  Property,
  TenantInvitation,
} from "@/types/api";

// ── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  green800: "#085041",
  green700: "#0F6E56",
  green500: "#1D9E75",
  green300: "#5DCAA5",
  green50: "#E1F5EE",
  amber700: "#854F0B",
  amber500: "#EF9F27",
  amber50: "#FAEEDA",
  red600: "#A32D2D",
  red300: "#F09595",
  red50: "#FCEBEB",
  blue800: "#0C447C",
  blue50: "#E6F1FB",
  gray900: "#1A1A1A",
  gray700: "#3D3D3D",
  gray500: "#6B6B6B",
  gray200: "#D3D1C7",
  gray100: "#E8E7E1",
  gray50: "#F2F1EB",
  surface: "#F7F6F2",
  border: "rgba(0,0,0,0.07)",
  borderMd: "rgba(0,0,0,0.12)",
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(v: string | number) {
  return `KES ${Number(v).toLocaleString("en-KE")}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function leaseProgress(lease: Lease): { pct: number; daysLeft: number } {
  const start = new Date(lease.start_date).getTime();
  const end = new Date(lease.end_date).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
  const daysLeft = Math.max(0, Math.round((end - now) / 86400000));
  return { pct, daysLeft };
}

// ── Sub-components ───────────────────────────────────────────────────────────

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
      style={{
        padding: "10px 18px",
        fontSize: 13,
        fontWeight: 500,
        color: active ? C.green700 : C.gray500,
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${active ? C.green700 : "transparent"}`,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 5,
        marginBottom: -1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: active ? C.green50 : C.gray100,
            fontSize: 10,
            fontWeight: 500,
            color: active ? C.green700 : C.gray700,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `0.5px solid ${C.border}`,
        borderRadius: 14,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.4px",
          textTransform: "uppercase" as const,
          color: C.gray500,
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  green,
  amber,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  green?: boolean;
  amber?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "7px 0",
        borderBottom: `0.5px solid ${C.border}`,
      }}
    >
      <span style={{ fontSize: 13, color: C.gray500 }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: green ? C.green700 : amber ? C.amber700 : C.gray900,
          fontFamily: mono ? "'DM Mono', monospace" : "inherit",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    paid: { bg: C.green50, color: C.green800, label: "Paid" },
    pending: { bg: C.amber50, color: C.amber700, label: "Pending" },
    overdue: { bg: C.red50, color: C.red600, label: "Overdue" },
    partial: { bg: C.blue50, color: C.blue800, label: "Partial" },
    cancelled: { bg: C.gray100, color: C.gray500, label: "Cancelled" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span
      style={{
        padding: "2px 7px",
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function MaintenanceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    open: { bg: C.amber50, color: C.amber700 },
    in_progress: { bg: C.blue50, color: C.blue800 },
    resolved: { bg: C.green50, color: C.green800 },
    closed: { bg: C.gray100, color: C.gray500 },
  };
  const s = map[status] ?? map.open;
  return (
    <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color }}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function UnitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const unitId = Number(params.id);

  const [unit, setUnit] = useState<Unit | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [lease, setLease] = useState<Lease | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [images, setImages] = useState<UnitImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tenant" | "invoices" | "details" | "photos">("tenant");
  const [showEdit, setShowEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [resendBusyId, setResendBusyId] = useState<number | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editFloor, setEditFloor] = useState("");
  const [editBeds, setEditBeds] = useState(0);
  const [editBaths, setEditBaths] = useState(0);
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const isManager = user && [ROLE_ADMIN, ROLE_LANDLORD, ROLE_AGENT].includes(user.role);
  const isTenant = user?.role === ROLE_TENANT;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const fetchAll = useCallback(async () => {
    try {
      const u = await getUnit(unitId);
      setUnit(u);
      setEditName(u.name);
      setEditFloor(u.floor);
      setEditBeds(u.bedrooms);
      setEditBaths(u.bathrooms);
      setEditPrice(u.price);
      setEditDesc(u.description);

      const [prop, imgs] = await Promise.all([
        getProperty(u.property).catch(() => null),
        listUnitImages(unitId).catch(() => []),
      ]);
      setProperty(prop);
      setImages(imgs);

      if (u.is_occupied) {
        setInvitations([]);
        const [l, allInvoices, allMaint] = await Promise.all([
          getUnitLease(unitId).catch(() => null),
          listInvoices().catch(() => []),
          listRequests().catch(() => []),
        ]);
        setLease(l);
        setInvoices(l ? allInvoices.filter((inv) => inv.lease === l.id) : []);
        setMaintenance(allMaint.filter((r) => r.unit === unitId));
      } else {
        const allMaint = await listRequests().catch(() => []);
        setMaintenance(allMaint.filter((r) => r.unit === unitId));
        try {
          const inv = await listUnitTenantInvitations(unitId);
          setInvitations(inv);
        } catch {
          setInvitations([]);
        }
      }
    } catch {
      // unit not found — stay with nulls
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!unit) return;
    setSubmitting(true);
    try {
      await updateUnit(unit.id, {
        name: editName,
        floor: editFloor,
        bedrooms: editBeds,
        bathrooms: editBaths,
        price: editPrice,
        description: editDesc,
        service_charge: unit.service_charge,
        security_deposit: unit.security_deposit,
        amenities: unit.amenities,
        parking_space: unit.parking_space,
        parking_slots: unit.parking_slots,
        is_public: unit.is_public,
      });
      setShowEdit(false);
      showToast("Unit details saved");
      await fetchAll();
    } catch {
      showToast("Failed to save changes");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    try {
      await uploadUnitImage(unitId, file);
      showToast("Photo uploaded");
      const imgs = await listUnitImages(unitId);
      setImages(imgs);
    } catch {
      showToast("Upload failed");
    }
  }

  async function handleInviteTenant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isManager || !unit || unit.is_occupied) return;
    const fd = new FormData(e.currentTarget);
    const email = ((fd.get("email") as string) ?? "").trim();
    const start_date = (fd.get("start_date") as string) ?? "";
    const rent_amount = ((fd.get("rent_amount") as string) ?? "").trim();
    if (!email || !start_date || !rent_amount) {
      showToast("Email, start date, and rent are required");
      return;
    }
    const endRaw = (fd.get("end_date") as string) ?? "";
    setInviteBusy(true);
    try {
      const res = await createUnitTenantInvitation(unitId, {
        email,
        start_date,
        rent_amount,
        phone: ((fd.get("phone") as string) ?? "").trim() || undefined,
        first_name: ((fd.get("first_name") as string) ?? "").trim() || undefined,
        last_name: ((fd.get("last_name") as string) ?? "").trim() || undefined,
        end_date: endRaw.trim() || undefined,
      });
      if ("lease_created" in res && res.lease_created) {
        showToast("Lease created for existing tenant account");
      } else {
        showToast("Invitation sent");
      }
      (e.currentTarget as HTMLFormElement).reset();
      await fetchAll();
    } catch {
      showToast("Could not send invitation");
    } finally {
      setInviteBusy(false);
    }
  }

  async function handleResendInvite(invitationId: number) {
    setResendBusyId(invitationId);
    try {
      await resendTenantInvitation(invitationId);
      showToast("Invitation resent");
      const inv = await listUnitTenantInvitations(unitId);
      setInvitations(inv);
    } catch {
      showToast("Could not resend invitation");
    } finally {
      setResendBusyId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {[130, 50, 300].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 14, background: "linear-gradient(90deg,#E8E7E1 25%,#F2F1EB 50%,#E8E7E1 75%)", backgroundSize: "700px 100%", animation: "shimmer 1.4s infinite linear" }} />
        ))}
        <style>{`@keyframes shimmer{from{background-position:-700px 0}to{background-position:700px 0}}`}</style>
      </div>
    );
  }

  if (!unit) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: C.gray500 }}>
        <p style={{ fontWeight: 500, marginBottom: 12, color: C.gray900 }}>Unit not found</p>
        <button onClick={() => router.back()} style={{ color: C.green700, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>← Go back</button>
      </div>
    );
  }

  const amenityList = (unit.amenities ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const progress = lease ? leaseProgress(lease) : null;
  const openMaintenance = maintenance.filter((r) => r.status === "open" || r.status === "in_progress");

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
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: C.gray900,
            color: "#fff",
            padding: "9px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            zIndex: 200,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {toast}
        </div>
      )}

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
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.gray500 }}>
          <Link href="/" style={{ color: C.gray500, textDecoration: "none" }}>Dashboard</Link>
          <svg viewBox="0 0 12 12" style={{ width: 10, height: 10 }}><polyline points="4,2 8,6 4,10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <Link href="/properties" style={{ color: C.gray500, textDecoration: "none" }}>Properties</Link>
          {property && (
            <>
              <svg viewBox="0 0 12 12" style={{ width: 10, height: 10 }}><polyline points="4,2 8,6 4,10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              <Link href={`/properties/${property.id}`} style={{ color: C.gray500, textDecoration: "none" }}>{property.name}</Link>
            </>
          )}
          <svg viewBox="0 0 12 12" style={{ width: 10, height: 10 }}><polyline points="4,2 8,6 4,10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <span style={{ color: C.gray900, fontWeight: 500 }}>{unit.name}</span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          {isManager && (
            <button
              type="button"
              onClick={() => setShowEdit((v) => !v)}
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
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit unit
            </button>
          )}
          {isManager && (
            <button
              type="button"
              onClick={() => showToast("Invoice creation coming soon")}
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
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round" }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New invoice
            </button>
          )}
          {isTenant && !unit.is_occupied && (
            <Link
              href={`/units/${unitId}/apply`}
              style={{
                height: 34,
                padding: "0 14px",
                background: C.green700,
                color: "#fff",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "inherit",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
              }}
            >
              Apply for this unit →
            </Link>
          )}
        </div>
      </div>

      <div style={{ padding: "22px 24px" }}>

        {/* Unit hero */}
        <div
          style={{
            background: "#fff",
            border: `0.5px solid ${C.border}`,
            borderRadius: 18,
            padding: "22px 26px",
            marginBottom: 20,
            display: "flex",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          {/* Image swatch */}
          <div
            style={{
              width: 160,
              height: 120,
              borderRadius: 14,
              background: "#D4E8D0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {images[0]?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={apiMediaUrl(images[0].image)} alt={unit.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <svg viewBox="0 0 24 24" style={{ width: 44, height: 44, fill: "none", stroke: C.green700, strokeWidth: 1.2, strokeLinecap: "round" }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            )}
            {images.length > 0 && (
              <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 500, padding: "2px 6px", borderRadius: 4 }}>
                {images.length} photo{images.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: C.gray900, letterSpacing: "-0.3px", marginBottom: 3 }}>
              {unit.name}
            </div>
            <div style={{ fontSize: 13, color: C.gray500, marginBottom: 14, display: "flex", alignItems: "center", gap: 5 }}>
              <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", flexShrink: 0 }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {property?.name ?? `Property #${unit.property}`}
            </div>

            {/* Specs */}
            <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
              {[
                { icon: "M3 22V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14M2 22h20M7 22v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4", label: `${unit.bedrooms} bedroom${unit.bedrooms !== 1 ? "s" : ""}` },
                { icon: "M9 6C9 4 10.5 3 12 3c1.5 0 3 1 3 3v5H9zM4 11h16v2a8 8 0 0 1-16 0v-2z", label: `${unit.bathrooms} bathroom${unit.bathrooms !== 1 ? "s" : ""}` },
                ...(unit.parking_slots > 0 ? [{ icon: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", label: `${unit.parking_slots} parking` }] : []),
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: C.gray500 }}>
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" }}>
                    <path d={s.icon} />
                  </svg>
                  {s.label}
                </div>
              ))}
            </div>

            {/* Amenity tags */}
            {amenityList.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {amenityList.map((a) => (
                  <span key={a} style={{ padding: "2px 8px", borderRadius: 10, background: C.gray50, border: `0.5px solid ${C.borderMd}`, fontSize: 11, color: C.gray700 }}>
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: rent + status */}
          <div style={{ flexShrink: 0, textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.3px" }}>Monthly rent</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: C.green700, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.5px", lineHeight: 1 }}>
                {fmtMoney(unit.price)}
              </div>
              <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>Due 1st of month</div>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                background: unit.is_occupied ? C.green50 : C.amber50,
                color: unit.is_occupied ? C.green800 : C.amber700,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: unit.is_occupied ? C.green500 : C.amber500,
                  flexShrink: 0,
                }}
              />
              {unit.is_occupied ? "Occupied" : `Vacant${openMaintenance.length > 0 ? " · Maintenance open" : ""}`}
            </span>
            {unit.floor && (
              <div style={{ fontSize: 11, color: C.gray500 }}>{unit.floor}</div>
            )}
          </div>
        </div>

        {/* Inline edit panel */}
        {showEdit && (
          <div
            style={{
              background: "#fff",
              border: `0.5px solid ${C.border}`,
              borderRadius: 14,
              padding: "20px 22px",
              marginBottom: 20,
              animation: "fadeUp 0.2s ease both",
            }}
          >
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.gray900, marginBottom: 16 }}>Edit unit details</div>
            <form onSubmit={handleSaveEdit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: C.gray500, marginBottom: 5, letterSpacing: "0.4px", textTransform: "uppercase" }}>Unit number</label>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} style={inputBase} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: C.gray500, marginBottom: 5, letterSpacing: "0.4px", textTransform: "uppercase" }}>Floor</label>
                  <input value={editFloor} onChange={(e) => setEditFloor(e.target.value)} style={inputBase} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: C.gray500, marginBottom: 5, letterSpacing: "0.4px", textTransform: "uppercase" }}>Bedrooms</label>
                  <input type="number" min="0" value={editBeds} onChange={(e) => setEditBeds(Number(e.target.value))} style={inputBase} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: C.gray500, marginBottom: 5, letterSpacing: "0.4px", textTransform: "uppercase" }}>Bathrooms</label>
                  <input type="number" min="0" value={editBaths} onChange={(e) => setEditBaths(Number(e.target.value))} style={inputBase} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: C.gray500, marginBottom: 5, letterSpacing: "0.4px", textTransform: "uppercase" }}>Monthly rent (KES)</label>
                  <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} type="number" min="0" style={inputBase} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: C.gray500, marginBottom: 5, letterSpacing: "0.4px", textTransform: "uppercase" }}>Description</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} style={{ ...inputBase, height: "auto", padding: "10px 12px", lineHeight: 1.5, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={submitting} style={{ height: 36, padding: "0 16px", background: C.green700, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? "Saving..." : "Save changes"}
                </button>
                <button type="button" onClick={() => setShowEdit(false)} style={{ height: 36, padding: "0 14px", background: "#fff", color: C.gray700, border: `0.5px solid ${C.borderMd}`, borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `0.5px solid ${C.border}`, marginBottom: 20 }}>
          <TabBtn label="Tenant & lease" active={activeTab === "tenant"} onClick={() => setActiveTab("tenant")} />
          <TabBtn label="Invoices" count={invoices.length} active={activeTab === "invoices"} onClick={() => setActiveTab("invoices")} />
          <TabBtn label="Unit details" active={activeTab === "details"} onClick={() => setActiveTab("details")} />
          <TabBtn label="Photos" count={images.length} active={activeTab === "photos"} onClick={() => setActiveTab("photos")} />
        </div>

        {/* Tab: Tenant & Lease */}
        {activeTab === "tenant" && (
          <>
            {lease && unit.is_occupied ? (
              <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
                {/* Tenant header */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: `0.5px solid ${C.border}` }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.green500, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 500, color: "#fff", flexShrink: 0 }}>
                    T
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: C.gray900 }}>Tenant #{lease.tenant}</div>
                    <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>
                      Tenant since {fmtDate(lease.start_date)}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button type="button" onClick={() => showToast("Opening messages…")} style={{ height: 28, padding: "0 10px", background: "#fff", color: C.gray700, border: `0.5px solid ${C.borderMd}`, borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Message</button>
                    <button type="button" onClick={() => showToast("Viewing tenant profile…")} style={{ height: 28, padding: "0 10px", background: C.green700, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>View profile</button>
                    <button type="button" onClick={() => showToast("Opening end tenancy flow…")} style={{ height: 28, padding: "0 10px", background: C.red50, color: C.red600, border: `0.5px solid ${C.red300}`, borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>End tenancy</button>
                  </div>
                </div>

                {/* Lease progress bar */}
                {progress && (
                  <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `0.5px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: C.gray500, marginBottom: 10 }}>Lease progress</div>
                    <div style={{ height: 6, background: C.gray100, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ height: "100%", width: `${progress.pct}%`, background: C.green500, borderRadius: 3, transition: "width 0.4s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.gray500 }}>
                      <span>{fmtDate(lease.start_date)}</span>
                      <span style={{ color: C.green700, fontWeight: 500 }}>{progress.daysLeft} days remaining</span>
                      <span>{fmtDate(lease.end_date)}</span>
                    </div>
                  </div>
                )}

                {/* Lease + tenant info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: C.gray500, marginBottom: 10 }}>Lease details</div>
                    <InfoRow label="Lease start" value={fmtDate(lease.start_date)} />
                    <InfoRow label="Lease end" value={fmtDate(lease.end_date)} />
                    <InfoRow label="Monthly rent" value={fmtMoney(lease.rent_amount)} mono green />
                    <InfoRow label="Deposit held" value={fmtMoney(unit.security_deposit)} mono />
                    <InfoRow label="Status" value={<span style={{ padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: lease.is_active ? C.green50 : C.gray100, color: lease.is_active ? C.green800 : C.gray500 }}>{lease.is_active ? "Active" : "Inactive"}</span>} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: C.gray500, marginBottom: 10 }}>Financial</div>
                    <InfoRow label="Service charge" value={fmtMoney(unit.service_charge)} mono />
                    <InfoRow label="Security deposit" value={fmtMoney(unit.security_deposit)} mono />
                    <InfoRow
                      label="Overdue invoices"
                      value={invoices.filter((inv) => inv.status === "overdue").length}
                      amber={invoices.some((inv) => inv.status === "overdue")}
                    />
                    <InfoRow
                      label="Total collected"
                      value={fmtMoney(invoices.filter((inv) => inv.status === "paid").reduce((s, inv) => s + Number(inv.rent_amount), 0))}
                      mono
                      green
                    />
                  </div>
                </div>

                {/* Lease actions */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `0.5px solid ${C.border}`, display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => showToast("Viewing lease document…")} style={{ height: 28, padding: "0 10px", background: "#fff", color: C.gray700, border: `0.5px solid ${C.borderMd}`, borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>View lease document</button>
                  <button type="button" onClick={() => showToast("Renewing lease…")} style={{ height: 28, padding: "0 10px", background: "#fff", color: C.gray700, border: `0.5px solid ${C.borderMd}`, borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Renew lease</button>
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "22px 22px", textAlign: "left" }}>
                {isManager && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: C.gray500, marginBottom: 12 }}>
                      Invite tenant by email
                    </div>
                    <p style={{ fontSize: 12, color: C.gray500, marginBottom: 14, lineHeight: 1.5 }}>
                      Sends a signup link. If the email already belongs to a tenant account, a lease is created immediately instead.
                    </p>
                    <form onSubmit={handleInviteTenant}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: C.gray500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>Email *</label>
                          <input name="email" type="email" required style={inputBase} placeholder="tenant@example.com" />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: C.gray500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>Phone</label>
                          <input name="phone" type="tel" style={inputBase} placeholder="+254…" />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: C.gray500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>First name</label>
                          <input name="first_name" type="text" style={inputBase} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: C.gray500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>Last name</label>
                          <input name="last_name" type="text" style={inputBase} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: C.gray500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>Lease start *</label>
                          <input name="start_date" type="date" required style={inputBase} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: C.gray500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>Lease end</label>
                          <input name="end_date" type="date" style={inputBase} />
                        </div>
                        <div style={{ gridColumn: "span 2" }}>
                          <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: C.gray500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>Rent amount (KES) *</label>
                          <input name="rent_amount" type="text" required defaultValue={unit.price} style={inputBase} placeholder="e.g. 35000" />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={inviteBusy}
                        style={{
                          height: 34,
                          padding: "0 16px",
                          background: C.green700,
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 500,
                          fontFamily: "inherit",
                          cursor: inviteBusy ? "wait" : "pointer",
                          opacity: inviteBusy ? 0.75 : 1,
                        }}
                      >
                        {inviteBusy ? "Sending…" : "Send invitation"}
                      </button>
                    </form>

                    {invitations.length > 0 && (
                      <div style={{ marginTop: 22, paddingTop: 18, borderTop: `0.5px solid ${C.border}` }}>
                        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: C.gray500, marginBottom: 10 }}>
                          Pending invitations
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {invitations.map((inv) => (
                            <div
                              key={inv.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                flexWrap: "wrap",
                                padding: "10px 12px",
                                borderRadius: 8,
                                background: C.gray50,
                                border: `0.5px solid ${C.borderMd}`,
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 160 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: C.gray900 }}>{inv.email}</div>
                                <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>
                                  {inv.status} · expires {fmtDate(inv.expires_at)}
                                </div>
                              </div>
                              {inv.status === "pending" && (
                                <button
                                  type="button"
                                  disabled={resendBusyId === inv.id}
                                  onClick={() => handleResendInvite(inv.id)}
                                  style={{
                                    height: 28,
                                    padding: "0 10px",
                                    background: "#fff",
                                    color: C.gray700,
                                    border: `0.5px solid ${C.borderMd}`,
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 500,
                                    fontFamily: "inherit",
                                    cursor: resendBusyId === inv.id ? "wait" : "pointer",
                                  }}
                                >
                                  {resendBusyId === inv.id ? "…" : "Resend email"}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 22, paddingTop: 18, borderTop: `0.5px solid ${C.border}`, textAlign: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.amber50, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                        <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: "none", stroke: C.amber700, strokeWidth: 1.8, strokeLinecap: "round" }}>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: C.gray900, marginBottom: 5 }}>No active tenant</div>
                      <div style={{ fontSize: 13, color: C.gray500, marginBottom: 16 }}>
                        This unit is vacant until an invite is accepted or you add a lease another way.
                      </div>
                    </div>
                  </>
                )}

                {!isManager && (
                  <>
                    <div style={{ textAlign: "center", padding: "18px 0 8px" }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.amber50, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                        <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: "none", stroke: C.amber700, strokeWidth: 1.8, strokeLinecap: "round" }}>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: C.gray900, marginBottom: 5 }}>No active tenant</div>
                      <div style={{ fontSize: 13, color: C.gray500, marginBottom: 16 }}>
                        This unit is currently vacant. List it on public search to attract applications.
                      </div>
                    </div>
                  </>
                )}

                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  {!unit.is_public && isManager && (
                    <button
                      type="button"
                      onClick={() => showToast("Listing settings updated")}
                      style={{ height: 30, padding: "0 12px", background: C.green700, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}
                    >
                      List on search
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab("details")}
                    style={{ height: 30, padding: "0 12px", background: "#fff", color: C.gray700, border: `0.5px solid ${C.borderMd}`, borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}
                  >
                    View unit details
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab: Invoices */}
        {activeTab === "invoices" && (
          <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: C.gray500 }}>Invoice history</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {invoices.length > 0 && (
                  <span style={{ fontSize: 12, color: C.gray500 }}>
                    Collected:{" "}
                    <strong style={{ color: C.green700 }}>
                      {fmtMoney(invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.rent_amount), 0))}
                    </strong>
                  </span>
                )}
                {isManager && (
                  <button type="button" onClick={() => showToast("Invoice creation coming soon")} style={{ height: 28, padding: "0 10px", background: C.green700, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>New invoice</button>
                )}
              </div>
            </div>

            {invoices.length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: C.gray500, fontSize: 13 }}>
                {unit.is_occupied ? "No invoices yet for this unit." : "No active lease — invoices will appear here after a tenant moves in."}
              </div>
            ) : (
              invoices.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: `0.5px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: inv.status === "paid" ? C.green50 : inv.status === "overdue" ? C.red50 : C.amber50,
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "none", stroke: inv.status === "paid" ? C.green700 : inv.status === "overdue" ? C.red600 : C.amber700, strokeWidth: 1.8, strokeLinecap: "round" }}>
                      {inv.status === "paid" ? <polyline points="20 6 9 17 4 12" /> : <circle cx="12" cy="12" r="10" />}
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.gray900 }}>
                      {new Date(inv.period_start).toLocaleDateString("en-KE", { month: "long", year: "numeric" })} — Rent
                    </div>
                    <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>
                      Due {fmtDate(inv.due_date)}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: inv.status === "overdue" ? C.red600 : C.gray900, fontFamily: "'DM Mono', monospace" }}>
                    {fmtMoney(inv.total_amount)}
                  </div>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Unit details */}
        {activeTab === "details" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <InfoCard title="Unit specifications">
              <InfoRow label="Unit number" value={unit.name} />
              {unit.floor && <InfoRow label="Floor" value={unit.floor} />}
              <InfoRow label="Bedrooms" value={unit.bedrooms} />
              <InfoRow label="Bathrooms" value={unit.bathrooms} />
              <InfoRow label="Parking spaces" value={unit.parking_slots} />
              <InfoRow label="Monthly rent" value={fmtMoney(unit.price)} mono green />
              <InfoRow label="Service charge" value={fmtMoney(unit.service_charge)} mono />
              <InfoRow label="Security deposit" value={fmtMoney(unit.security_deposit)} mono />
            </InfoCard>

            <InfoCard title="Unit amenities">
              {amenityList.length > 0 ? (
                amenityList.map((a) => (
                  <InfoRow key={a} label={a} value="Included" green />
                ))
              ) : (
                <p style={{ fontSize: 13, color: C.gray500 }}>No amenities listed</p>
              )}
              {unit.is_public && <InfoRow label="Public listing" value="Yes" green />}
              {unit.tour_url && (
                <div style={{ padding: "7px 0", borderBottom: `0.5px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.gray500 }}>Virtual tour</span>
                  <a href={unit.tour_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "right", fontSize: 12, color: C.blue800, marginTop: 2 }}>
                    View tour ↗
                  </a>
                </div>
              )}
            </InfoCard>

            {unit.description && (
              <div style={{ gridColumn: "span 2", background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: C.gray500, marginBottom: 10 }}>Description</div>
                <p style={{ fontSize: 13, color: C.gray700, lineHeight: 1.6 }}>{unit.description}</p>
              </div>
            )}

            {/* Maintenance summary */}
            {maintenance.length > 0 && (
              <div style={{ gridColumn: "span 2", background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: C.gray500, marginBottom: 12 }}>Maintenance requests</div>
                {maintenance.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `0.5px solid ${C.border}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: r.status === "open" ? C.amber50 : r.status === "in_progress" ? C.blue50 : C.green50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "none", stroke: r.status === "open" ? C.amber700 : r.status === "in_progress" ? C.blue800 : C.green700, strokeWidth: 1.8, strokeLinecap: "round" }}>
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.gray900 }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>{r.category} · {fmtDate(r.created_at)}</div>
                    </div>
                    <MaintenanceStatusBadge status={r.status} />
                    <Link href={`/maintenance/${r.id}`} style={{ fontSize: 12, color: C.green700, textDecoration: "none", marginLeft: 4 }}>View →</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Photos */}
        {activeTab === "photos" && (
          <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: C.gray500 }}>Unit photos</div>
              {isManager && (
                <label style={{ height: 28, padding: "0 10px", background: C.green700, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  Upload photo
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleUploadImage} />
                </label>
              )}
            </div>

            {images.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: C.gray500, fontSize: 13 }}>
                No photos yet. {isManager ? "Upload some to show on public search." : ""}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ borderRadius: 14, overflow: "hidden", height: 180, background: "#D4E8D0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={apiMediaUrl(images[0].image)} alt="Hero" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                {images.slice(1, 3).map((img, i) => (
                  <div key={img.id} style={{ borderRadius: 8, overflow: "hidden", background: C.gray100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={apiMediaUrl(img.image)} alt={`Photo ${i + 2}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
                {images.length < 3 &&
                  Array.from({ length: 3 - images.length }).map((_, i) => (
                    isManager ? (
                      <label key={i} style={{ borderRadius: 8, border: `1.5px dashed ${C.borderMd}`, background: C.gray50, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: "none", stroke: C.gray500, strokeWidth: 1.5, strokeLinecap: "round" }}>
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleUploadImage} />
                      </label>
                    ) : (
                      <div key={i} style={{ borderRadius: 8, background: C.gray50, border: `0.5px solid ${C.border}` }} />
                    )
                  ))}
              </div>
            )}
            <p style={{ fontSize: 12, color: C.gray500 }}>
              First photo is shown as the hero on the public search page.
              {images.length > 0 ? ` ${images.length} photo${images.length !== 1 ? "s" : ""} uploaded.` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
