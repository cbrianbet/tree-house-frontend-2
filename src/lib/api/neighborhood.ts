import api from "./client";
import type {
  NeighborhoodInsight,
  NeighborhoodInsightCreateRequest,
} from "@/types/api";

export async function listInsights(
  propertyId: number,
  type?: string,
): Promise<NeighborhoodInsight[]> {
  const params = type ? `?type=${type}` : "";
  const res = await api.get<NeighborhoodInsight[]>(
    `/api/neighborhood/properties/${propertyId}/insights/${params}`,
  );
  return res.data;
}

export async function createInsight(
  propertyId: number,
  data: NeighborhoodInsightCreateRequest,
): Promise<NeighborhoodInsight> {
  const res = await api.post<NeighborhoodInsight>(
    `/api/neighborhood/properties/${propertyId}/insights/`,
    data,
  );
  return res.data;
}

export async function updateInsight(
  propertyId: number,
  insightId: number,
  data: Partial<NeighborhoodInsightCreateRequest>,
): Promise<NeighborhoodInsight> {
  const res = await api.patch<NeighborhoodInsight>(
    `/api/neighborhood/properties/${propertyId}/insights/${insightId}/`,
    data,
  );
  return res.data;
}

export async function deleteInsight(
  propertyId: number,
  insightId: number,
): Promise<void> {
  await api.delete(
    `/api/neighborhood/properties/${propertyId}/insights/${insightId}/`,
  );
}
