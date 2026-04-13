"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { listProperties, listUnits } from "@/lib/api/properties";
import type { Property, Unit } from "@/types/api";
import { ROLE_ADMIN, ROLE_LANDLORD } from "@/constants/roles";

// ── Types ──────────────────────────────────────────────────────────────────

type PropertyStats = {
  property: Property;
  units: Unit[];
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyPct: number;
  monthlyRevenue: number;
};

// ── Design tokens ──────────────────────────────────────────────────────────

const CARD_PALETTE = [
  { bg: "#D4E8D0", stroke: "#0F6E56" },
  { bg: "#D0DFED", stroke: "#185FA5" },
  { bg: "#EDE0D0", stroke: "#993C1D" },
  { bg: "#E8E0F0", stroke: "#6B4FA5" },
  { bg: "#F0E8D0", stroke: "#A57C1D" },
  { bg: "#D0EDE8", stroke: "#1D7C6B" },
];

function occColor(pct: number) {
  if (pct >= 80) return { bar: "#1D9E75", badge: { bg: "#E1F5EE", color: "#085041" } };
  if (pct >= 50) return { bar: "#EF9F27", badge: { bg: "#FAEEDA", color: "#854F0B" } };
  return { bar: "#A32D2D", badge: { bg: "#FCEBEB", color: "#A32D2D" } };
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    listProperties()
      .then(async (props) => {
        const stats = await Promise.all(
          props.map(async (p) => {
            let units: Unit[] = [];
            try { units = await listUnits(p.id); } catch { units = []; }
            const totalUnits = units.length;
            const occupiedUnits = units.filter((u) => u.is_occupied).length;
            const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
            const occupancyPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
            const monthlyRevenue = units
              .filter((u) => u.is_occupied)
              .reduce((sum, u) => sum + Number(u.price || 0), 0);
            return { property: p, units, totalUnits, occupiedUnits, vacantUnits, occupancyPct, monthlyRevenue } satisfies PropertyStats;
          }),
        );
        setProperties(stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return properties.filter((p) => {
      const matchesSearch =
        !q ||
        p.property.name.toLowerCase().includes(q) ||
        p.property.property_type.toLowerCase().includes(q) ||
        (p.property.description || "").toLowerCase().includes(q);
      const matchesOccupancy =
        occupancyFilter === "all" ||
        (occupancyFilter === "full" && p.vacantUnits === 0) ||
        (occupancyFilter === "partial" && p.vacantUnits > 0 && p.occupiedUnits > 0) ||
        (occupancyFilter === "vacant" && p.vacantUnits > 0);
      return matchesSearch && matchesOccupancy;
    });
  }, [occupancyFilter, properties, search]);

  const summary = useMemo(() => {
    const totalProperties = properties.length;
    const totalUnits = properties.reduce((s, p) => s + p.totalUnits, 0);
    const occupiedUnits = properties.reduce((s, p) => s + p.occupiedUnits, 0);
    const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const monthlyRevenue = properties.reduce((s, p) => s + p.monthlyRevenue, 0);
    return { totalProperties, totalUnits, occupiedUnits, vacantUnits, occupancyRate, monthlyRevenue };
  }, [properties]);

  const canManage = user && [ROLE_ADMIN, ROLE_LANDLORD].includes(user.role);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E8E7E1", borderTopColor: "#0F6E56", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .prop-card { animation: fadeUp 0.3s ease both; transition: all 0.2s; }
        .prop-card:hover { border-color: #5DCAA5 !important; transform: translateY(-1px); }
        .prop-card-btn-primary { background: #0F6E56; color: #fff; border: none; }
        .prop-card-btn-primary:hover { background: #085041; }
        .prop-card-btn-ghost { background: #fff; color: #3D3D3D; }
        .prop-card-btn-ghost:hover { background: #F2F1EB; }
        .tbl-row:hover td { background: #F7F6F2 !important; cursor: pointer; }
        .tbl-view-btn { height: 26px; padding: 0 10px; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer; font-family: inherit; border: 0.5px solid rgba(0,0,0,0.12); background: #fff; color: #3D3D3D; transition: all 0.15s; }
        .tbl-view-btn:hover { border-color: #5DCAA5; background: #E1F5EE; color: #085041; }
        .search-input:focus { border-color: #1D9E75 !important; outline: none; }
        .filter-sel { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6B6B' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; }
        .add-btn:hover { background: #085041 !important; }
        .view-toggle-btn:hover { background: #F2F1EB; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#1A1A1A" }}>

        {/* Sticky topbar */}
        <div style={{ position: "sticky", top: 0, zIndex: 40, margin: "-24px -24px 0", background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.07)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6B6B6B" }}>
            <Link href="/" style={{ color: "#6B6B6B", textDecoration: "none" }}>Dashboard</Link>
            <svg viewBox="0 0 12 12" style={{ width: 12, height: 12, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" }}>
              <polyline points="4,2 8,6 4,10" />
            </svg>
            <span style={{ color: "#1A1A1A", fontWeight: 500 }}>Properties</span>
          </div>
          {canManage && (
            <button type="button" className="add-btn" onClick={() => router.push("/properties/new")}
              style={{ height: 34, padding: "0 14px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}>
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round" }}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add property
            </button>
          )}
        </div>

        <div style={{ paddingTop: 22 }}>

          {/* Summary strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 22 }}>
            {([
              { label: "Total properties", value: String(summary.totalProperties), sub: "Portfolio size", green: false, mono: false },
              { label: "Total units", value: String(summary.totalUnits), sub: `${summary.occupiedUnits} occupied · ${summary.vacantUnits} vacant`, green: false, mono: false },
              { label: "Occupancy rate", value: `${summary.occupancyRate}%`, sub: "Target: 90%", green: true, mono: false },
              { label: "Monthly revenue", value: `KES ${summary.monthlyRevenue.toLocaleString("en-KE")}`, sub: "Occupied units only", green: true, mono: true },
            ] as const).map((s, i) => (
              <div key={s.label} style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "14px 16px", animation: `fadeUp 0.3s ease ${0.02 + i * 0.03}s both` }}>
                <div style={{ fontSize: 11, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: s.green ? "#0F6E56" : "#1A1A1A", fontFamily: s.mono ? "'DM Mono', monospace" : undefined }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#6B6B6B", marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
              <svg viewBox="0 0 24 24" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, fill: "none", stroke: "#6B6B6B", strokeWidth: 2, strokeLinecap: "round", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search properties…"
                style={{ width: "100%", height: 34, padding: "0 10px 0 32px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: 13, color: "#1A1A1A", fontFamily: "inherit", transition: "border-color 0.15s" }} />
            </div>
            <select className="filter-sel" value={occupancyFilter} onChange={(e) => setOccupancyFilter(e.target.value)}
              style={{ height: 34, padding: "0 28px 0 10px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: 13, color: "#3D3D3D", fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
              <option value="all">All occupancy</option>
              <option value="full">Fully occupied</option>
              <option value="partial">Partially occupied</option>
              <option value="vacant">Has vacancies</option>
            </select>
            {/* Grid / list toggle */}
            <div style={{ marginLeft: "auto", display: "flex", background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 8, overflow: "hidden" }}>
              {(["grid", "list"] as const).map((v, i) => (
                <button key={v} type="button" className="view-toggle-btn" onClick={() => setView(v)} title={v === "grid" ? "Grid view" : "List view"}
                  style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", background: view === v ? "#E1F5EE" : "transparent", borderLeft: i > 0 ? "0.5px solid rgba(0,0,0,0.07)" : "none", transition: "background 0.15s" }}>
                  {v === "grid" ? (
                    <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: "none", stroke: view === v ? "#0F6E56" : "#6B6B6B", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" }}>
                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: "none", stroke: view === v ? "#0F6E56" : "#6B6B6B", strokeWidth: 1.8, strokeLinecap: "round" }}>
                      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F2F1EB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg viewBox="0 0 24 24" style={{ width: 24, height: 24, fill: "none", stroke: "#D3D1C7", strokeWidth: 1.5, strokeLinecap: "round" }}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#3D3D3D", marginBottom: 6 }}>No properties found</div>
              <div style={{ fontSize: 13, color: "#6B6B6B", marginBottom: 20 }}>
                {search || occupancyFilter !== "all" ? "Try adjusting your filters" : "Add your first property to get started"}
              </div>
              {canManage && !search && occupancyFilter === "all" && (
                <button type="button" onClick={() => router.push("/properties/new")}
                  style={{ height: 36, padding: "0 18px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                  Add property
                </button>
              )}
            </div>

          ) : view === "grid" ? (
            /* ── Grid view ── */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14 }}>
              {filtered.map((p, idx) => {
                const palette = CARD_PALETTE[idx % CARD_PALETTE.length];
                const occ = occColor(p.occupancyPct);
                return (
                  <div key={p.property.id} className="prop-card"
                    style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, overflow: "hidden", cursor: "pointer", animationDelay: `${idx * 0.04 + 0.04}s` }}
                    onClick={() => router.push(`/properties/${p.property.id}`)}>

                    {/* Colour image area */}
                    <div style={{ height: 140, background: palette.bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      <svg viewBox="0 0 24 24" style={{ width: 48, height: 48, fill: "none", stroke: palette.stroke, strokeWidth: 1.2, strokeLinecap: "round" }}>
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      <span style={{ position: "absolute", top: 10, right: 10, padding: "3px 9px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: occ.badge.bg, color: occ.badge.color }}>
                        {p.occupiedUnits} / {p.totalUnits}
                      </span>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: "14px 16px 12px" }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A", marginBottom: 3 }}>{p.property.name}</div>
                      <div style={{ fontSize: 12, color: "#6B6B6B", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", flexShrink: 0 }}>
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                        {p.property.property_type}
                      </div>
                      {/* Occupancy bar */}
                      <div style={{ height: 5, background: "#E8E7E1", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                        <div style={{ height: "100%", borderRadius: 3, background: occ.bar, width: `${p.occupancyPct}%`, transition: "width 0.6s ease" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "#6B6B6B" }}>{p.occupancyPct}% occupied · {p.vacantUnits} vacant</div>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "0.5px solid rgba(0,0,0,0.07)" }}>
                      {([
                        { label: "Units", value: String(p.totalUnits), mono: true, green: false },
                        { label: "Revenue", value: `KES ${p.monthlyRevenue >= 1000 ? `${Math.round(p.monthlyRevenue / 1000)}k` : String(p.monthlyRevenue)}`, green: true, mono: true },
                        { label: "Type", value: p.property.property_type.slice(0, 9), mono: false, green: false },
                      ] as const).map((s, si) => (
                        <div key={s.label} style={{ padding: "10px 12px", borderRight: si < 2 ? "0.5px solid rgba(0,0,0,0.07)" : "none" }}>
                          <div style={{ fontSize: 10, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 3 }}>{s.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: s.green ? "#0F6E56" : "#1A1A1A", fontFamily: s.mono ? "'DM Mono', monospace" : undefined }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Footer buttons */}
                    <div style={{ padding: "10px 16px", borderTop: "0.5px solid rgba(0,0,0,0.07)", display: "flex", gap: 6 }}>
                      <button type="button" className="prop-card-btn-primary"
                        onClick={(e) => { e.stopPropagation(); router.push(`/properties/${p.property.id}`); }}
                        style={{ flex: 1, height: 28, borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                        View property
                      </button>
                      {canManage && (
                        <button type="button" className="prop-card-btn-ghost"
                          onClick={(e) => { e.stopPropagation(); router.push(`/properties/${p.property.id}`); }}
                          style={{ flex: 1, height: 28, borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", border: "0.5px solid rgba(0,0,0,0.12)" }}>
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          ) : (
            /* ── Table view ── */
            <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F7F6F2", borderBottom: "0.5px solid rgba(0,0,0,0.07)" }}>
                    {["Property", "Type", "Units", "Occupancy", "Revenue / mo", ""].map((h) => (
                      <th key={h} style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.3px", textTransform: "uppercase", color: "#6B6B6B", textAlign: "left", padding: "10px 16px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const occ = occColor(p.occupancyPct);
                    return (
                      <tr key={p.property.id} className="tbl-row" onClick={() => router.push(`/properties/${p.property.id}`)}
                        style={{ borderBottom: "0.5px solid rgba(0,0,0,0.07)" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{p.property.name}</div>
                          <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 2 }}>{p.totalUnits} unit{p.totalUnits !== 1 ? "s" : ""}</div>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#6B6B6B" }}>{p.property.property_type}</td>
                        <td style={{ padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#1A1A1A" }}>{p.totalUnits}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ width: 80, height: 4, background: "#E8E7E1", borderRadius: 2, overflow: "hidden", marginBottom: 3 }}>
                            <div style={{ width: `${p.occupancyPct}%`, height: "100%", background: occ.bar, borderRadius: 2 }} />
                          </div>
                          <div style={{ fontSize: 11, color: "#6B6B6B" }}>{p.occupancyPct}% · {p.occupiedUnits}/{p.totalUnits}</div>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 500, color: "#0F6E56", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                          KES {p.monthlyRevenue.toLocaleString("en-KE")}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <button type="button" className="tbl-view-btn"
                            onClick={(e) => { e.stopPropagation(); router.push(`/properties/${p.property.id}`); }}>
                            View →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
