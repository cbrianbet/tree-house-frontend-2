import api from "./client";
import type {
  MaintenanceRequest,
  MaintenanceRequestCreate,
  MaintenanceStatus,
  Bid,
  BidStatus,
  Note,
  MaintenanceImage,
} from "@/types/api";

// ── Requests ──

export async function listRequests(): Promise<MaintenanceRequest[]> {
  const res = await api.get<MaintenanceRequest[]>(
    "/api/maintenance/requests/",
  );
  return res.data;
}

export async function getRequest(id: number): Promise<MaintenanceRequest> {
  const res = await api.get<MaintenanceRequest>(
    `/api/maintenance/requests/${id}/`,
  );
  return res.data;
}

export async function createRequest(
  data: MaintenanceRequestCreate,
): Promise<MaintenanceRequest> {
  const res = await api.post<MaintenanceRequest>(
    "/api/maintenance/requests/",
    data,
  );
  return res.data;
}

export async function updateRequestStatus(
  id: number,
  status: MaintenanceStatus,
): Promise<MaintenanceRequest> {
  const res = await api.put<MaintenanceRequest>(
    `/api/maintenance/requests/${id}/`,
    { status },
  );
  return res.data;
}

// ── Bids ──

export async function listBids(requestId: number): Promise<Bid[]> {
  const res = await api.get<Bid[]>(
    `/api/maintenance/requests/${requestId}/bids/`,
  );
  return res.data;
}

export async function createBid(
  requestId: number,
  data: { proposed_price: string; message: string },
): Promise<Bid> {
  const res = await api.post<Bid>(
    `/api/maintenance/requests/${requestId}/bids/`,
    data,
  );
  return res.data;
}

export async function updateBidStatus(
  requestId: number,
  bidId: number,
  status: BidStatus,
): Promise<Bid> {
  const res = await api.put<Bid>(
    `/api/maintenance/requests/${requestId}/bids/${bidId}/`,
    { status },
  );
  return res.data;
}

// ── Notes ──

export async function listNotes(requestId: number): Promise<Note[]> {
  const res = await api.get<Note[]>(
    `/api/maintenance/requests/${requestId}/notes/`,
  );
  return res.data;
}

export async function createNote(
  requestId: number,
  note: string,
): Promise<Note> {
  const res = await api.post<Note>(
    `/api/maintenance/requests/${requestId}/notes/`,
    { note },
  );
  return res.data;
}

// ── Images ──

export async function listImages(
  requestId: number,
): Promise<MaintenanceImage[]> {
  const res = await api.get<MaintenanceImage[]>(
    `/api/maintenance/requests/${requestId}/images/`,
  );
  return res.data;
}

export async function uploadImage(
  requestId: number,
  file: File,
): Promise<MaintenanceImage> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await api.post<MaintenanceImage>(
    `/api/maintenance/requests/${requestId}/images/`,
    formData,
  );
  return res.data;
}
