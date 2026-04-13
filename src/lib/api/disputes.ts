import api from "./client";
import type {
  Dispute,
  DisputeCreateRequest,
  DisputeStatus,
  DisputeMessage,
} from "@/types/api";

export async function listDisputes(): Promise<Dispute[]> {
  const res = await api.get<Dispute[]>("/api/disputes/");
  return res.data;
}

export async function getDispute(id: number): Promise<Dispute> {
  const res = await api.get<Dispute>(`/api/disputes/${id}/`);
  return res.data;
}

export async function createDispute(
  data: DisputeCreateRequest,
): Promise<Dispute> {
  const res = await api.post<Dispute>("/api/disputes/", data);
  return res.data;
}

export async function updateDisputeStatus(
  id: number,
  status: DisputeStatus,
): Promise<Dispute> {
  const res = await api.patch<Dispute>(`/api/disputes/${id}/`, { status });
  return res.data;
}

export async function listDisputeMessages(
  disputeId: number,
): Promise<DisputeMessage[]> {
  const res = await api.get<DisputeMessage[]>(
    `/api/disputes/${disputeId}/messages/`,
  );
  return res.data;
}

export async function postDisputeMessage(
  disputeId: number,
  body: string,
): Promise<DisputeMessage> {
  const res = await api.post<DisputeMessage>(
    `/api/disputes/${disputeId}/messages/`,
    { body },
  );
  return res.data;
}
