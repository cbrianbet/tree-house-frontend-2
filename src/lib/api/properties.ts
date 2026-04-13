import api from "./client";
import type {
  Property,
  PropertyCreateRequest,
  Unit,
  UnitCreateRequest,
  Lease,
  LeaseCreateRequest,
  PropertyAgent,
  Application,
  ApplicationCreateRequest,
  ApplicationApproveRequest,
  TenantApplicationItem,
  DashboardData,
  LeaseDocument,
  LeaseDocumentCreateRequest,
  PropertyReview,
  PropertyReviewCreateRequest,
  TenantReview,
  TenantReviewCreateRequest,
  UnitImage,
  TenantInvitation,
  TenantInvitationCreateRequest,
  CreateTenantInvitationResult,
  TenantInvitationCreatedResponse,
} from "@/types/api";

// ── Properties ──

export async function listProperties(): Promise<Property[]> {
  const res = await api.get<Property[]>("/api/property/properties/");
  return res.data;
}

export async function getProperty(id: number): Promise<Property> {
  const res = await api.get<Property>(`/api/property/properties/${id}/`);
  return res.data;
}

export async function createProperty(
  data: PropertyCreateRequest,
): Promise<Property> {
  const res = await api.post<Property>("/api/property/properties/", data);
  return res.data;
}

export async function updateProperty(
  id: number,
  data: Partial<PropertyCreateRequest>,
): Promise<Property> {
  const res = await api.put<Property>(
    `/api/property/properties/${id}/`,
    data,
  );
  return res.data;
}

export async function deleteProperty(id: number): Promise<void> {
  await api.delete(`/api/property/properties/${id}/`);
}

// ── Units ──

export async function listUnits(propertyId: number): Promise<Unit[]> {
  const res = await api.get<Unit[]>(
    `/api/property/properties/${propertyId}/units/`,
  );
  return res.data;
}

export async function getUnit(id: number): Promise<Unit> {
  const res = await api.get<Unit>(`/api/property/units/${id}/`);
  return res.data;
}

export async function createUnit(
  propertyId: number,
  data: UnitCreateRequest,
): Promise<Unit> {
  const res = await api.post<Unit>(
    `/api/property/properties/${propertyId}/units/`,
    data,
  );
  return res.data;
}

export async function updateUnit(
  id: number,
  data: Partial<UnitCreateRequest>,
): Promise<Unit> {
  const res = await api.put<Unit>(`/api/property/units/${id}/`, data);
  return res.data;
}

export async function deleteUnit(id: number): Promise<void> {
  await api.delete(`/api/property/units/${id}/`);
}

// ── Leases ──

export async function getUnitLease(unitId: number): Promise<Lease> {
  const res = await api.get<Lease>(`/api/property/units/${unitId}/lease/`);
  return res.data;
}

export async function createLease(
  unitId: number,
  data: LeaseCreateRequest,
): Promise<Lease> {
  const res = await api.post<Lease>(
    `/api/property/units/${unitId}/lease/`,
    data,
  );
  return res.data;
}

// ── Agents ──

export async function listPropertyAgents(
  propertyId: number,
): Promise<PropertyAgent[]> {
  const res = await api.get<PropertyAgent[]>(
    `/api/property/properties/${propertyId}/agents/`,
  );
  return res.data;
}

export async function appointAgent(
  propertyId: number,
  agentUserId: number,
): Promise<PropertyAgent> {
  const res = await api.post<PropertyAgent>(
    `/api/property/properties/${propertyId}/agents/`,
    { agent: agentUserId },
  );
  return res.data;
}

export async function removeAgent(
  propertyId: number,
  appointmentId: number,
): Promise<void> {
  await api.delete(
    `/api/property/properties/${propertyId}/agents/${appointmentId}/`,
  );
}

// ── Public Units (for tenant browsing) ──

export async function listPublicUnits(): Promise<Unit[]> {
  const res = await api.get<Unit[]>("/api/property/units/public/");
  return res.data;
}

// ── Applications ──

export async function listApplications(): Promise<Application[]> {
  const res = await api.get<Application[]>("/api/property/applications/");
  return res.data;
}

export async function getApplication(id: number): Promise<Application> {
  const res = await api.get<Application>(`/api/property/applications/${id}/`);
  return res.data;
}

/** Tenant-facing list — returns nested unit/property shape. */
export async function listTenantApplications(): Promise<TenantApplicationItem[]> {
  const res = await api.get<TenantApplicationItem[]>("/api/property/applications/");
  return res.data;
}

export async function createApplication(
  data: ApplicationCreateRequest,
): Promise<Application> {
  const res = await api.post<Application>(
    "/api/property/applications/",
    data,
  );
  return res.data;
}

export async function approveApplication(
  id: number,
  data: ApplicationApproveRequest,
): Promise<Application> {
  const res = await api.put<Application>(
    `/api/property/applications/${id}/`,
    data,
  );
  return res.data;
}

export async function rejectApplication(id: number): Promise<Application> {
  const res = await api.put<Application>(
    `/api/property/applications/${id}/`,
    { status: "rejected" },
  );
  return res.data;
}

export async function withdrawApplication(id: number): Promise<Application> {
  const res = await api.put<Application>(
    `/api/property/applications/${id}/`,
    { status: "withdrawn" },
  );
  return res.data;
}

// ── Dashboard ──

export async function getDashboard(): Promise<DashboardData> {
  const res = await api.get<DashboardData>("/api/property/dashboard/");
  return res.data;
}

// ── Lease Documents ──

export async function listLeaseDocuments(
  leaseId: number,
): Promise<LeaseDocument[]> {
  const res = await api.get<LeaseDocument[]>(
    `/api/property/leases/${leaseId}/documents/`,
  );
  return res.data;
}

export async function createLeaseDocument(
  leaseId: number,
  data: LeaseDocumentCreateRequest,
): Promise<LeaseDocument> {
  const res = await api.post<LeaseDocument>(
    `/api/property/leases/${leaseId}/documents/`,
    data,
  );
  return res.data;
}

export async function signLeaseDocument(
  leaseId: number,
  docId: number,
): Promise<LeaseDocument> {
  const res = await api.post<LeaseDocument>(
    `/api/property/leases/${leaseId}/documents/${docId}/sign/`,
  );
  return res.data;
}

export async function deleteLeaseDocument(leaseId: number, docId: number): Promise<void> {
  await api.delete(`/api/property/leases/${leaseId}/documents/${docId}/`);
}

// ── Property Reviews ──

export async function listPropertyReviews(
  propertyId: number,
): Promise<PropertyReview[]> {
  const res = await api.get<PropertyReview[]>(
    `/api/property/properties/${propertyId}/reviews/`,
  );
  return res.data;
}

export async function createPropertyReview(
  propertyId: number,
  data: PropertyReviewCreateRequest,
): Promise<PropertyReview> {
  const res = await api.post<PropertyReview>(
    `/api/property/properties/${propertyId}/reviews/`,
    data,
  );
  return res.data;
}

export async function updatePropertyReview(
  propertyId: number,
  reviewId: number,
  data: Partial<PropertyReviewCreateRequest>,
): Promise<PropertyReview> {
  const res = await api.patch<PropertyReview>(
    `/api/property/properties/${propertyId}/reviews/${reviewId}/`,
    data,
  );
  return res.data;
}

export async function deletePropertyReview(
  propertyId: number,
  reviewId: number,
): Promise<void> {
  await api.delete(
    `/api/property/properties/${propertyId}/reviews/${reviewId}/`,
  );
}

// ── Tenant Reviews ──

export async function listTenantReviews(
  propertyId: number,
): Promise<TenantReview[]> {
  const res = await api.get<TenantReview[]>(
    `/api/property/properties/${propertyId}/tenant-reviews/`,
  );
  return res.data;
}

export async function createTenantReview(
  propertyId: number,
  data: TenantReviewCreateRequest,
): Promise<TenantReview> {
  const res = await api.post<TenantReview>(
    `/api/property/properties/${propertyId}/tenant-reviews/`,
    data,
  );
  return res.data;
}

export async function updateTenantReview(
  propertyId: number,
  reviewId: number,
  data: Partial<TenantReviewCreateRequest>,
): Promise<TenantReview> {
  const res = await api.patch<TenantReview>(
    `/api/property/properties/${propertyId}/tenant-reviews/${reviewId}/`,
    data,
  );
  return res.data;
}

export async function deleteTenantReview(
  propertyId: number,
  reviewId: number,
): Promise<void> {
  await api.delete(
    `/api/property/properties/${propertyId}/tenant-reviews/${reviewId}/`,
  );
}

// ── Unit Images (multipart: field `image` only) ──

function unitImageRowsFromPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data !== null && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.results)) return o.results;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.images)) return o.images;
  }
  return [];
}

function extractUnitImagePath(r: Record<string, unknown>): string | null {
  const raw = r.image ?? r.image_url ?? r.url ?? r.file;
  if (typeof raw === "string" && raw.trim() !== "") return raw.trim();
  if (raw && typeof raw === "object" && "url" in raw) {
    const u = (raw as { url?: unknown }).url;
    if (typeof u === "string" && u.trim() !== "") return u.trim();
  }
  return null;
}

function normalizeUnitImagesResponse(data: unknown): UnitImage[] {
  const rows = unitImageRowsFromPayload(data);
  const out: UnitImage[] = [];

  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") return;
    const r = row as Record<string, unknown>;
    const img = extractUnitImagePath(r);
    if (!img) return;

    const idRaw = r.id ?? r.pk;
    let id: number;
    if (idRaw !== undefined && idRaw !== null && String(idRaw).trim() !== "") {
      const n = Number(idRaw);
      id = Number.isFinite(n) ? n : -(index + 1);
    } else {
      id = -(index + 1);
    }

    const prop = r.property;
    let property = 0;
    if (typeof prop === "number" && Number.isFinite(prop)) property = prop;
    else if (typeof prop === "string" && prop.trim() !== "") {
      const pn = Number(prop);
      if (Number.isFinite(pn)) property = pn;
    }

    out.push({
      id,
      property,
      image: img,
      uploaded_at:
        typeof r.uploaded_at === "string"
          ? r.uploaded_at
          : typeof r.created_at === "string"
            ? r.created_at
            : "",
    });
  });

  return out;
}

export async function listUnitImages(unitId: number): Promise<UnitImage[]> {
  const res = await api.get<unknown>(`/api/property/units/${unitId}/images/`);
  return normalizeUnitImagesResponse(res.data);
}

export async function uploadUnitImage(unitId: number, file: File): Promise<UnitImage> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await api.post<unknown>(`/api/property/units/${unitId}/images/`, fd);
  const normalized = normalizeUnitImagesResponse([res.data]);
  if (normalized.length > 0) return normalized[0];
  return res.data as UnitImage;
}

export async function deleteUnitImage(unitId: number, imageId: number): Promise<void> {
  await api.delete(`/api/property/units/${unitId}/images/${imageId}/`);
}

// ── Tenant invitations ──

export async function listUnitTenantInvitations(
  unitId: number,
): Promise<TenantInvitation[]> {
  const res = await api.get<TenantInvitation[]>(
    `/api/property/units/${unitId}/tenant-invitations/`,
  );
  return res.data;
}

export async function createUnitTenantInvitation(
  unitId: number,
  data: TenantInvitationCreateRequest,
): Promise<CreateTenantInvitationResult> {
  const res = await api.post<CreateTenantInvitationResult>(
    `/api/property/units/${unitId}/tenant-invitations/`,
    data,
  );
  return res.data;
}

export async function resendTenantInvitation(
  invitationId: number,
): Promise<TenantInvitationCreatedResponse> {
  const res = await api.post<TenantInvitationCreatedResponse>(
    `/api/property/tenant-invitations/${invitationId}/resend/`,
    {},
  );
  return res.data;
}

export type { UnitImage };
