import api from "./client";
import type {
  TenantProfile,
  LandlordProfile,
  AgentProfile,
  ArtisanProfile,
  MovingCompanyProfile,
} from "@/types/api";

export async function createTenantProfile(
  data: Omit<TenantProfile, "id">,
): Promise<TenantProfile> {
  const res = await api.post<TenantProfile>(
    "/api/auth/profiles/tenant/",
    data,
  );
  return res.data;
}

export async function createLandlordProfile(
  data: Omit<LandlordProfile, "id" | "verified">,
): Promise<LandlordProfile> {
  const res = await api.post<LandlordProfile>(
    "/api/auth/profiles/landlord/",
    data,
  );
  return res.data;
}

export async function createAgentProfile(
  data: Omit<AgentProfile, "id">,
): Promise<AgentProfile> {
  const res = await api.post<AgentProfile>("/api/auth/profiles/agent/", data);
  return res.data;
}

export async function createArtisanProfile(
  data: Omit<ArtisanProfile, "id" | "rating" | "verified">,
): Promise<ArtisanProfile> {
  const res = await api.post<ArtisanProfile>(
    "/api/auth/profiles/artisan/",
    data,
  );
  return res.data;
}

export async function createMovingCompanyProfile(
  data: Omit<MovingCompanyProfile, "id" | "is_verified" | "is_active">,
): Promise<MovingCompanyProfile> {
  const res = await api.post<MovingCompanyProfile>(
    "/api/auth/profiles/moving-company/",
    data,
  );
  return res.data;
}
