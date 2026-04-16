import { listProperties, listUnits, getUnitLease } from "@/lib/api/properties";
import type { Lease, Property, Unit } from "@/types/api";

export type LeaseLocation = { lease: Lease; unit: Unit; property: Property };

/** Map lease id → unit + property + lease (landlord/agent scoped). */
export async function buildLeaseIndex(): Promise<Map<number, LeaseLocation>> {
  const map = new Map<number, LeaseLocation>();
  const properties = await listProperties();
  for (const p of properties) {
    let units: Unit[] = [];
    try {
      units = await listUnits(p.id);
    } catch {
      continue;
    }
    for (const u of units) {
      if (!u.is_occupied) continue;
      try {
        const lease = await getUnitLease(u.id);
        map.set(lease.id, { lease, unit: u, property: p });
      } catch {
        /* no lease on unit */
      }
    }
  }
  return map;
}
