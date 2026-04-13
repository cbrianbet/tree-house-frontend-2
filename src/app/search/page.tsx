"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchPublicUnits, createSavedSearch } from "@/lib/api/saved-searches";
import { useAuth } from "@/context/AuthContext";
import type { PublicUnit, PublicUnitSearchParams } from "@/types/api";

// ── Design tokens (matches HTML mockup exactly) ────────────────────────────────
const PALETTE = ["#D4E8D0","#D0DFED","#EDE0D0","#DDD0ED","#D0EDED","#EDD0D0"];
const PAGE_SIZE = 9;

const PROPERTY_TYPES = [
  { label: "All types", value: "" },
  { label: "Apartment",  value: "apartment" },
  { label: "Studio",     value: "studio" },
  { label: "Townhouse",  value: "townhouse" },
  { label: "Villa",      value: "villa" },
  { label: "House",      value: "house" },
];

function fmtPrice(v: string | number) {
  return `KES ${Number(v).toLocaleString("en-KE")}`;
}

function cardColor(unit: PublicUnit) {
  return PALETTE[unit.property.id % PALETTE.length];
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const t = useRef<number | undefined>(undefined);

  function show(m: string) {
    setMsg(m);
    setVisible(true);
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setVisible(false), 3000);
  }

  return { msg, visible, show };
}

// ── Save modal ─────────────────────────────────────────────────────────────────
function SaveModal({
  params,
  onClose,
  onSaved,
}: {
  params: PublicUnitSearchParams;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("My search");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const bd = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createSavedSearch({ name, filters: params as never, notify_on_match: notify });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={bd} onClick={e => e.target === bd.current && onClose()} style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "28px",
        width: 400, maxWidth: "calc(100vw - 32px)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        animation: "fadeUp 0.2s ease both",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 18, color: "#1A1A1A" }}>Save this search</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", border: "0.5px solid rgba(0,0,0,0.12)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B6B6B" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#6B6B6B", marginBottom: 5 }}>Search name</label>
            <input value={name} onChange={e => setName(e.target.value)} required style={{ width: "100%", height: 40, padding: "0 12px", background: "#F2F1EB", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#3D3D3D" }}>
            <div onClick={() => setNotify(n => !n)} style={{ width: 38, height: 22, borderRadius: 11, background: notify ? "#0F6E56" : "#E4E3DC", transition: "background 0.2s", position: "relative", flexShrink: 0, cursor: "pointer" }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: notify ? 19 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </div>
            Notify me when new units match
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, height: 38, borderRadius: 10, border: "0.5px solid rgba(0,0,0,0.12)", background: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", color: "#3D3D3D" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, height: 38, borderRadius: 10, border: "none", background: saving ? "#1D9E75" : "#0F6E56", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              {saving ? "Saving…" : "Save search"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Unit card ─────────────────────────────────────────────────────────────────
function UnitCard({
  unit, delay, onApply, onSave,
}: {
  unit: PublicUnit; delay: number;
  onApply: () => void; onSave: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const color = cardColor(unit);
  const amenities = unit.amenities
    ? unit.amenities.split(",").map(a => a.trim()).filter(Boolean).slice(0, 4)
    : [];

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    setSaved(s => !s);
    onSave();
  }

  return (
    <div
      className="unit-card"
      style={{ animationDelay: `${delay}s` }}
      onClick={onApply}
    >
      {/* Image */}
      <div style={{ position: "relative", height: 190, overflow: "hidden" }}>
        {false ? (
          <img
            src=""
            alt={unit.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.45 }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#6B6B6B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 22 9 12 15 12 15 22" stroke="#6B6B6B" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        <div className="card-overlay">
          {unit.tour_url && (
            <a
              href={unit.tour_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ height: 28, padding: "0 12px", background: "rgba(255,255,255,0.92)", border: "none", borderRadius: 100, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", color: "#085041", textDecoration: "none", display: "flex", alignItems: "center" }}
            >
              Virtual tour
            </a>
          )}
        </div>

        {/* Badges */}
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 5 }}>
          {unit.parking_space && (
            <span style={{ padding: "3px 9px", borderRadius: 100, fontSize: 10, fontWeight: 500, background: "rgba(255,255,255,0.92)", color: "#3D3D3D" }}>Parking</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 400, color: "#0F6E56", lineHeight: 1, marginBottom: 2 }}>
          {fmtPrice(unit.price)}
        </div>
        <div style={{ fontSize: 11, color: "#6B6B6B", marginBottom: 10 }}>per month</div>

        <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", marginBottom: 2 }}>
          Unit {unit.name}
        </div>
        <div style={{ fontSize: 12, color: "#6B6B6B", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
          </svg>
          {unit.floor ? `Floor ${unit.floor}` : "Available now"}
        </div>

        {/* Specs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          {[
            { icon: "bed",  label: `${unit.bedrooms} bed${unit.bedrooms !== 1 ? "s" : ""}` },
            { icon: "bath", label: `${unit.bathrooms} bath${unit.bathrooms !== 1 ? "s" : ""}` },
          ].map(({ icon, label }) => (
            <div key={icon} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6B6B6B" }}>
              {icon === "bed" ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 22V8a2 2 0 012-2h14a2 2 0 012 2v14M2 22h20M7 22v-4a2 2 0 012-2h6a2 2 0 012 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 6C9 4 10.5 3 12 3s3 1 3 3v5H9V6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><rect x="4" y="11" width="16" height="2" rx="1" stroke="currentColor" strokeWidth="1.8"/><path d="M5 13v5q0 2 2 2h10q2 0 2-2v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              )}
              {label}
            </div>
          ))}
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
            {amenities.map(a => (
              <span key={a} style={{ padding: "2px 8px", borderRadius: 100, background: "#F2F1EB", border: "0.5px solid rgba(0,0,0,0.12)", fontSize: 10, color: "#3D3D3D" }}>
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, marginTop: amenities.length ? 0 : 14 }}>
          <button
            onClick={e => { e.stopPropagation(); onApply(); }}
            style={{ flex: 1, height: 36, background: "#0F6E56", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
            className="apply-btn"
          >
            Apply now
          </button>
          <button
            onClick={handleSave}
            className={`save-btn${saved ? " saved" : ""}`}
            style={{ width: 36, height: 36, background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "#1D9E75" : "none"} style={{ stroke: saved ? "#1D9E75" : "#6B6B6B", strokeWidth: "1.8", strokeLinecap: "round" }}>
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Search state
  const [location, setLocation]   = useState("");
  const [priceMin, setPriceMin]   = useState("");
  const [priceMax, setPriceMax]   = useState("");
  const [bedrooms, setBedrooms]   = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [parking, setParking]     = useState(false);

  // Results state
  const [units, setUnits]         = useState<PublicUnit[]>([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [sort, setSort]           = useState("price_asc");

  // UI state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [searchParams, setSearchParams]   = useState<PublicUnitSearchParams>({});

  const load = useCallback(async (params: PublicUnitSearchParams) => {
    setLoading(true);
    try {
      const data = await fetchPublicUnits(params);
      // Client-side sort
      const sorted = [...data].sort((a, b) => {
        const pa = Number(a.price), pb = Number(b.price);
        if (sort === "price_asc")  return pa - pb;
        if (sort === "price_desc") return pb - pa;
        if (sort === "beds")       return b.bedrooms - a.bedrooms;
        return b.id - a.id; // newest
      });
      setTotal(sorted.length);
      setUnits(sorted);
    } catch {
      toast.show("Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => { load(searchParams); }, [searchParams, sort]);

  function doSearch() {
    const params: PublicUnitSearchParams = {};
    if (priceMin)    params.price_min     = Number(priceMin);
    if (priceMax)    params.price_max     = Number(priceMax);
    if (bedrooms)    params.bedrooms      = Number(bedrooms);
    if (typeFilter)  params.property_type = typeFilter;
    if (parking)     params.parking_space  = true;
    setSearchParams(params);
    setPage(1);
  }

  function handleApply(unit: PublicUnit) {
    if (!user) {
      toast.show("Sign in to apply for this unit.");
      setTimeout(() => router.push("/signin"), 1200);
      return;
    }
    router.push(`/units/${unit.id}/apply`);
  }

  function handleSaveFav() {
    if (!user) { toast.show("Sign in to save favourites."); return; }
    toast.show("Unit saved to favourites.");
  }

  function handleSaveSearch() {
    if (!user) { toast.show("Sign in to save your search."); return; }
    setShowSaveModal(true);
  }

  // Pagination
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageUnits  = units.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx   = (page - 1) * PAGE_SIZE + 1;
  const endIdx     = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=DM+Sans:wght@400;500&display=swap');

        :root {
          --serif: 'Fraunces', Georgia, serif;
          --font:  'DM Sans', -apple-system, sans-serif;
        }

        body { font-family: var(--font); background: #FAF9F6; color: #1A1A1A; font-size: 14px; margin: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

        .unit-card {
          background: #fff;
          border: 0.5px solid rgba(0,0,0,0.07);
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
          animation: fadeUp 0.3s ease both;
        }
        .unit-card:hover {
          border-color: #5DCAA5;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15,110,86,0.10);
        }
        .unit-card:hover .card-overlay { opacity: 1; }

        .card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15,110,86,0.12);
          opacity: 0;
          transition: opacity 0.2s;
          display: flex;
          align-items: flex-end;
          padding: 12px;
        }

        .apply-btn:hover  { background: #085041 !important; }
        .save-btn:hover   { border-color: #5DCAA5 !important; background: #E1F5EE !important; }

        .filter-pill {
          height: 30px;
          padding: 0 14px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          font-family: var(--font);
          border: 0.5px solid rgba(0,0,0,0.12);
          background: #fff;
          color: #3D3D3D;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .filter-pill:hover { border-color: #5DCAA5; background: #E1F5EE; color: #085041; }
        .filter-pill.active { background: #0F6E56; color: #fff; border-color: #0F6E56; }

        .search-input:focus {
          border-color: #1D9E75 !important;
          box-shadow: 0 0 0 3px rgba(29,158,117,0.10) !important;
          background: #fff !important;
        }

        .nav-link { padding: 7px 14px; border-radius: 100px; font-size: 13px; color: #6B6B6B; text-decoration: none; cursor: pointer; transition: all 0.15s; }
        .nav-link:hover { background: #F2F1EB; color: #1A1A1A; }

        .page-btn {
          height: 32px; padding: 0 14px;
          background: #fff; border: 0.5px solid rgba(0,0,0,0.12);
          border-radius: 10px; font-size: 12px; font-weight: 500;
          color: #3D3D3D; cursor: pointer; font-family: var(--font);
          transition: all 0.15s;
        }
        .page-btn:hover:not(:disabled) { border-color: #5DCAA5; background: #E1F5EE; color: #085041; }
        .page-btn:disabled { opacity: 0.4; cursor: default; }
        .page-btn.current { background: #0F6E56; color: #fff; border-color: #0F6E56; }

        .shimmer { background: #E4E3DC; border-radius: 4px; animation: shimmer 1.4s ease infinite; }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        background: "#fff",
        borderBottom: "0.5px solid rgba(0,0,0,0.07)",
        padding: "0 32px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
        fontFamily: "var(--font)",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "#0F6E56", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M12 2L2 9h3v11h6v-6h2v6h6V9h3L12 2z"/></svg>
          </div>
          <span style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 400, color: "#1A1A1A" }}>Tree House</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <a className="nav-link" style={{ fontFamily: "var(--font)" }}>Browse units</a>
          <Link className="nav-link" href="/moving" style={{ fontFamily: "var(--font)" }}>Moving companies</Link>
          {user ? (
            <Link href="/" style={{ padding: "7px 16px", borderRadius: 100, background: "#0F6E56", color: "#fff", fontSize: 13, fontWeight: 500, textDecoration: "none", fontFamily: "var(--font)" }}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/signin" className="nav-link" style={{ fontFamily: "var(--font)" }}>Sign in</Link>
              <Link href="/signup" style={{ padding: "7px 16px", borderRadius: 100, background: "#0F6E56", color: "#fff", fontSize: 13, fontWeight: 500, textDecoration: "none", fontFamily: "var(--font)" }}>
                List your property
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background: "#0F6E56", padding: "52px 32px 0", textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.6px", textTransform: "uppercase", color: "#9FE1CB", marginBottom: 14 }}>
          Nairobi · Kenya
        </div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 44, fontWeight: 400, color: "#fff", lineHeight: 1.15, marginBottom: 10, letterSpacing: "-0.5px" }}>
          Find your <em style={{ fontStyle: "italic", color: "#9FE1CB" }}>next home</em>
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 36 }}>
          Browse verified rentals across Nairobi. No agents, no fees.
        </p>

        {/* Search bar embedded in hero */}
        <div style={{
          background: "#fff",
          borderRadius: "20px 20px 0 0",
          padding: "20px 24px 0",
          maxWidth: 920, margin: "0 auto",
          border: "0.5px solid rgba(0,0,0,0.07)",
          borderBottom: "none",
          fontFamily: "var(--font)",
        }}>
          {/* Main search row */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-end" }}>
            {/* Location */}
            <div style={{ flex: 2 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#6B6B6B", marginBottom: 5 }}>Location or property name</label>
              <input
                type="text"
                className="search-input"
                placeholder="Westlands, Kilimani, Parklands…"
                value={location}
                onChange={e => setLocation(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()}
                style={{ width: "100%", height: 40, padding: "0 12px", background: "#F2F1EB", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10, fontSize: 13, color: "#1A1A1A", fontFamily: "var(--font)", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Min price */}
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#6B6B6B", marginBottom: 5 }}>Min price (KES)</label>
              <input
                type="number"
                className="search-input"
                placeholder="e.g. 20,000"
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                style={{ width: "100%", height: 40, padding: "0 12px", background: "#F2F1EB", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10, fontSize: 13, color: "#1A1A1A", fontFamily: "var(--font)", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Max price */}
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#6B6B6B", marginBottom: 5 }}>Max price (KES)</label>
              <input
                type="number"
                className="search-input"
                placeholder="e.g. 80,000"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                style={{ width: "100%", height: 40, padding: "0 12px", background: "#F2F1EB", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10, fontSize: 13, color: "#1A1A1A", fontFamily: "var(--font)", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Bedrooms */}
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#6B6B6B", marginBottom: 5 }}>Bedrooms</label>
              <select
                value={bedrooms}
                onChange={e => setBedrooms(e.target.value)}
                style={{ width: "100%", height: 40, padding: "0 10px", background: "#F2F1EB", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10, fontSize: 13, color: "#1A1A1A", fontFamily: "var(--font)", outline: "none", cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 28, boxSizing: "border-box" }}
              >
                <option value="">Any</option>
                <option value="1">1 bed</option>
                <option value="2">2 beds</option>
                <option value="3">3 beds</option>
                <option value="4">4+ beds</option>
              </select>
            </div>

            {/* Search button */}
            <button
              onClick={doSearch}
              style={{ height: 40, padding: "0 22px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s", flexShrink: 0 }}
              className="apply-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Search
            </button>
          </div>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 16, alignItems: "center" }}>
            {PROPERTY_TYPES.map(pt => (
              <button
                key={pt.value}
                className={`filter-pill${typeFilter === pt.value ? " active" : ""}`}
                onClick={() => { setTypeFilter(pt.value); }}
              >
                {pt.label}
              </button>
            ))}
            <div style={{ width: "0.5px", background: "rgba(0,0,0,0.1)", alignSelf: "stretch", margin: "0 2px" }} />
            <button
              className={`filter-pill${parking ? " active" : ""}`}
              onClick={() => setParking(p => !p)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Parking
            </button>
            {user && (
              <button
                className="filter-pill"
                onClick={handleSaveSearch}
                style={{ marginLeft: "auto" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                Save search
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div style={{ background: "#FAF9F6", minHeight: "60vh" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px", fontFamily: "var(--font)" }}>

          {/* Results header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: "#6B6B6B" }}>
              {loading ? "Loading…" : (
                total === 0
                  ? "No results found"
                  : <>Showing <strong style={{ color: "#1A1A1A", fontWeight: 500 }}>{startIdx}–{endIdx} of {total}</strong> {total === 1 ? "result" : "results"}</>
              )}
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              style={{ height: 32, padding: "0 28px 0 10px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10, fontSize: 12, color: "#3D3D3D", fontFamily: "var(--font)", outline: "none", cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
            >
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="newest">Newest first</option>
              <option value="beds">Bedrooms</option>
            </select>
          </div>

          {/* Cards grid */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 18 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, overflow: "hidden" }}>
                  <div className="shimmer" style={{ height: 190 }} />
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="shimmer" style={{ height: 24, width: "55%" }} />
                    <div className="shimmer" style={{ height: 13, width: "70%" }} />
                    <div className="shimmer" style={{ height: 13, width: "45%" }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <div className="shimmer" style={{ height: 36, flex: 1 }} />
                      <div className="shimmer" style={{ height: 36, width: 36 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : pageUnits.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#F2F1EB", border: "0.5px solid rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#B0B0A8" strokeWidth="1.6" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <h3 style={{ fontFamily: "var(--serif)", fontSize: 20, color: "#3D3D3D", marginBottom: 6, fontWeight: 400 }}>No units found</h3>
              <p style={{ fontSize: 13, color: "#6B6B6B", maxWidth: 300, margin: "0 auto 20px", lineHeight: 1.6 }}>
                Try adjusting your filters or broadening your search area.
              </p>
              <button
                onClick={() => { setPriceMin(""); setPriceMax(""); setBedrooms(""); setTypeFilter(""); setParking(false); setSearchParams({}); }}
                style={{ height: 36, padding: "0 18px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font)" }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 18, marginBottom: 32 }}>
              {pageUnits.map((unit, i) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  delay={(i % PAGE_SIZE) * 0.04}
                  onApply={() => handleApply(unit)}
                  onSave={handleSaveFav}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "0.5px solid rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize: 13, color: "#6B6B6B" }}>
                Page {page} of {totalPages}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button key={n} className={`page-btn${n === page ? " current" : ""}`} onClick={() => setPage(n)}>{n}</button>
                  );
                })}
                <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save search modal */}
      {showSaveModal && (
        <SaveModal
          params={searchParams}
          onClose={() => setShowSaveModal(false)}
          onSaved={() => { setShowSaveModal(false); toast.show("Search saved! We'll notify you of new matches."); }}
        />
      )}

      {/* Toast */}
      <div style={{
        position: "fixed", bottom: 20, left: "50%",
        transform: `translateX(-50%) translateY(${toast.visible ? 0 : 60}px)`,
        background: "#1A1A1A", color: "#fff",
        padding: "10px 18px", borderRadius: 10,
        fontSize: 13, fontWeight: 500,
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        zIndex: 200, whiteSpace: "nowrap",
        pointerEvents: "none",
      }}>
        {toast.msg}
      </div>
    </>
  );
}
