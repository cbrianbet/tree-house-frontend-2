import api from "./client";
import type {
  SavedSearch,
  SavedSearchCreateRequest,
  PublicUnit,
  PublicUnitSearchParams,
} from "@/types/api";

export async function searchPublicUnits(
  params: PublicUnitSearchParams,
): Promise<PublicUnit[]> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      query.set(k, String(v));
    }
  }
  const qs = query.toString();
  const res = await api.get<Unit[]>(
    `/api/property/units/public/${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

/**
 * Fetch a single public unit by ID.
 * Calls the public list endpoint (no auth required) and filters client-side.
 */
export async function fetchPublicUnit(id: number): Promise<PublicUnit | null> {
  const units = await fetchPublicUnits({});
  return units.find((u) => u.id === id) ?? null;
}

/**
 * Public endpoint — no auth required.
 * Returns the richer PublicUnit shape (with nested property + images).
 */
export async function fetchPublicUnits(
  params: PublicUnitSearchParams,
): Promise<PublicUnit[]> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      query.set(k, String(v));
    }
  }
  const qs = query.toString();
  const res = await api.get<PublicUnit[]>(
    `/api/property/units/public/${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function listSavedSearches(): Promise<SavedSearch[]> {
  const res = await api.get<SavedSearch[]>("/api/property/saved-searches/");
  return res.data;
}

export async function createSavedSearch(
  data: SavedSearchCreateRequest,
): Promise<SavedSearch> {
  const res = await api.post<SavedSearch>(
    "/api/property/saved-searches/",
    data,
  );
  return res.data;
}

export async function updateSavedSearch(
  id: number,
  data: Partial<SavedSearchCreateRequest>,
): Promise<SavedSearch> {
  const res = await api.patch<SavedSearch>(
    `/api/property/saved-searches/${id}/`,
    data,
  );
  return res.data;
}

export async function deleteSavedSearch(id: number): Promise<void> {
  await api.delete(`/api/property/saved-searches/${id}/`);
}
