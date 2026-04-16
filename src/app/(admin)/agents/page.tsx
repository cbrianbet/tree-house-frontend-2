"use client";

import React, { useCallback, useEffect, useState, FormEvent, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DM_Mono, DM_Sans } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import {
  listProperties,
  listPropertyAgents,
  listUnits,
  appointAgent,
  removeAgent,
} from "@/lib/api/properties";
import { getAdminUserDetail } from "@/lib/api/dashboards";
import type { Property, PropertyAgent, AdminUser } from "@/types/api";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";
import {
  FD,
  FINANCE_FIELD_CLASS,
  financeFieldInputStyle,
  financeFieldLabelStyle,
  financeFieldSelectStyle,
  financePbtn,
} from "@/constants/financeDesign";
import { ROLE_ADMIN, ROLE_LANDLORD } from "@/constants/roles";
import PageLoader from "@/components/ui/PageLoader";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

const AVATAR_BG = ["#185FA5", "#0F6E56", "#7C3AED", "#B45309", "#0C447C", "#BE185D"];

type AgentGroup = {
  agentUserId: number;
  rows: Array<{ appointment: PropertyAgent; property: Property }>;
};

export default function AgentsManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const font = dmSans.style.fontFamily;
  const mono = dmMono.style.fontFamily;
  const appointRef = useRef<HTMLDivElement>(null);

  const [groups, setGroups] = useState<AgentGroup[]>([]);
  const [unitCounts, setUnitCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [unassignedProps, setUnassignedProps] = useState<Property[]>([]);
  const [userInfo, setUserInfo] = useState<Map<number, AdminUser>>(new Map());

  const allowed = user?.role === ROLE_LANDLORD || user?.role === ROLE_ADMIN;

  const load = useCallback(async () => {
    if (!allowed) { setLoading(false); return; }
    setError(null);
    try {
      const props = await listProperties();
      setProperties(props);

      const pairs = await Promise.all(
        props.map(async (p) => {
          const agents = await listPropertyAgents(p.id).catch(() => [] as PropertyAgent[]);
          return { p, agents };
        }),
      );

      const byAgent = new Map<number, Array<{ appointment: PropertyAgent; property: Property }>>();
      const propsWithAgent = new Set<number>();
      for (const { p, agents } of pairs) {
        for (const pa of agents) {
          propsWithAgent.add(p.id);
          if (!byAgent.has(pa.agent)) byAgent.set(pa.agent, []);
          byAgent.get(pa.agent)!.push({ appointment: pa, property: p });
        }
      }

      const sortedGroups: AgentGroup[] = [...byAgent.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([agentUserId, rows]) => ({ agentUserId, rows }));

      setUnassignedProps(props.filter((p) => !propsWithAgent.has(p.id)));

      const unitEntries = await Promise.all(
        props.map(async (p) => {
          const units = await listUnits(p.id).catch(() => []);
          return [p.id, units.length] as const;
        }),
      );
      setUnitCounts(Object.fromEntries(unitEntries));
      setGroups(sortedGroups);

      const allAgentIds = [...byAgent.keys()];
      const infoResults = await Promise.all(
        allAgentIds.map((uid) =>
          getAdminUserDetail(uid)
            .then((detail) => [uid, detail.user] as [number, AdminUser])
            .catch(() => null),
        ),
      );
      const map = new Map<number, AdminUser>();
      infoResults.forEach((r) => { if (r) map.set(r[0], r[1]); });
      setUserInfo(map);
    } catch {
      setError("Failed to load agents.");
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => { load(); }, [load]);

  async function handleAppoint(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!allowed) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    const propertyId = Number(fd.get("property_id"));
    const agentUserId = Number(fd.get("agent_user_id"));
    try {
      await appointAgent(propertyId, agentUserId);
      setSuccess("Agent appointed successfully.");
      await load();
    } catch {
      setError("Failed to appoint agent. Check the user ID and your permissions.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(propertyId: number, appointmentId: number) {
    if (!confirm("Remove this agent from this property?")) return;
    setError(null);
    setSuccess(null);
    try {
      await removeAgent(propertyId, appointmentId);
      setSuccess("Agent removed from property.");
      await load();
    } catch {
      setError("Failed to remove agent.");
    }
  }

  async function handleRemoveAll(g: AgentGroup) {
    if (!confirm(`Remove this agent from all ${g.rows.length} properties?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await Promise.all(g.rows.map((r) => removeAgent(r.property.id, r.appointment.id)));
      setSuccess("Agent removed from all properties.");
      await load();
    } catch {
      setError("Failed to remove agent from all properties.");
    }
  }

  function agentName(uid: number): string {
    const u = userInfo.get(uid);
    if (!u) return `Agent #${uid}`;
    const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
    return full || u.username;
  }

  function agentInitials(uid: number): string {
    const u = userInfo.get(uid);
    if (!u) return `${uid}`;
    const fn = u.first_name?.charAt(0) ?? "";
    const ln = u.last_name?.charAt(0) ?? "";
    return (fn + ln).toUpperCase() || u.username.slice(0, 2).toUpperCase();
  }

  function agentEmail(uid: number): string {
    return userInfo.get(uid)?.email ?? "";
  }

  if (!user || loading) {
    return <PageLoader />;
  }

  if (!allowed) {
    return (
      <div className={dmSans.className} style={{ fontFamily: font, padding: 48, textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: FD.k7, marginBottom: 4 }}>Access denied</div>
        <div style={{ fontSize: 13, color: FD.k5 }}>Only landlords and administrators can manage property agents.</div>
      </div>
    );
  }

  const SECTION_TITLE: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    color: FD.k5,
    marginBottom: 12,
  };

  const GBTN: React.CSSProperties = {
    height: 32,
    padding: "0 14px",
    borderRadius: FD.rmd,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: font,
    border: `0.5px solid ${FD.bdm}`,
    background: FD.wh,
    color: FD.k7,
    transition: "all .15s",
  };

  return (
    <div
      className={`${dmSans.className} -m-4 md:-m-6`}
      style={{ fontFamily: font, fontSize: 14, color: FD.k9, background: FD.surf, minHeight: "calc(100vh - 80px)" }}
    >
      <FinancePageTopBar
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Agent management" },
        ]}
        right={
          allowed ? (
            <button
              type="button"
              className="transition-colors hover:bg-[#085041]"
              style={financePbtn(font)}
              onClick={() => appointRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Appoint agent
            </button>
          ) : undefined
        }
      />

      <div style={{ padding: "22px 24px" }}>
        {/* Banners */}
        {error && (
          <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: FD.rmd, background: FD.r0, color: FD.r6, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={FD.r6} strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: FD.rmd, background: FD.g1, color: FD.activeBadgeText, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={FD.g7} strokeWidth={2} strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {success}
          </div>
        )}

        {/* ── Active agents ── */}
        <div style={SECTION_TITLE}>Active agents ({groups.length})</div>

        {groups.length === 0 ? (
          <div
            style={{
              background: FD.wh,
              border: `0.5px solid ${FD.bd}`,
              borderRadius: FD.rlg,
              padding: "32px 24px",
              textAlign: "center",
              color: FD.k5,
              fontSize: 14,
              marginBottom: 14,
            }}
          >
            No agents appointed yet. Use the form below to assign an agent to a property.
          </div>
        ) : (
          groups.map((g) => {
            const propCount = g.rows.length;
            const unitsManaged = g.rows.reduce((sum, r) => sum + (unitCounts[r.property.id] ?? 0), 0);
            const earliest = g.rows.reduce((min, r) => {
              const t = new Date(r.appointment.appointed_at).getTime();
              return min === null || t < min ? t : min;
            }, null as number | null);

            return (
              <div
                key={g.agentUserId}
                className="transition-all hover:border-[#5DCAA5]"
                style={{
                  background: FD.wh,
                  border: `0.5px solid ${FD.bd}`,
                  borderRadius: FD.rxl,
                  padding: "20px 22px",
                  marginBottom: 14,
                }}
              >
                {/* Agent header */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: `0.5px solid ${FD.bd}` }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: AVATAR_BG[Math.abs(g.agentUserId) % AVATAR_BG.length],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 500,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {agentInitials(g.agentUserId)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: FD.k9, marginBottom: 2 }}>
                      {agentName(g.agentUserId)}
                    </div>
                    <div style={{ fontSize: 12, color: FD.k5 }}>
                      Appointed to {propCount} propert{propCount === 1 ? "y" : "ies"}
                    </div>
                    {agentEmail(g.agentUserId) && (
                      <div style={{ fontSize: 12, color: FD.k5, marginTop: 3 }}>
                        {agentEmail(g.agentUserId)}
                      </div>
                    )}
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right", flexShrink: 0 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: FD.g1, color: FD.activeBadgeText }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: FD.g5 }} />
                      Active
                    </div>
                    {earliest != null && (
                      <div style={{ fontSize: 12, color: FD.k5, marginTop: 6 }}>
                        Since {new Date(earliest).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Properties", value: String(propCount) },
                    { label: "Units managed", value: String(unitsManaged) },
                    { label: "Commission rate", value: "—", isMono: true, size: 14 },
                    { label: "Commission owed", value: "—", warn: true, size: 14 },
                  ].map((s) => (
                    <div key={s.label} style={{ background: FD.k0, borderRadius: FD.rmd, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: FD.k5, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: s.size ?? 16, fontWeight: 500, color: s.warn ? FD.a7 : FD.k9, fontFamily: s.isMono ? mono : font }}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Properties managed */}
                <div style={{ marginBottom: 12 }}>
                  <div style={SECTION_TITLE}>Properties managed</div>
                  {g.rows.map(({ appointment, property }, idx) => (
                    <div
                      key={appointment.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: idx < g.rows.length - 1 ? `0.5px solid ${FD.bd}` : "none",
                      }}
                    >
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: idx % 2 === 0 ? "#D4E8D0" : "#D0DFED", flexShrink: 0 }} />
                      <Link
                        href={`/properties/${property.id}`}
                        style={{ fontSize: 13, fontWeight: 500, color: FD.k9, flex: 1, textDecoration: "none" }}
                      >
                        {property.name}
                      </Link>
                      <span style={{ fontSize: 11, color: FD.k5 }}>
                        {unitCounts[property.id] ?? 0} units
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(property.id, appointment.id)}
                        className="transition-colors hover:bg-[#F7C1C1]"
                        style={{
                          height: 24,
                          padding: "0 10px",
                          borderRadius: FD.rsm,
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: font,
                          border: `0.5px solid ${FD.r3}`,
                          background: FD.r0,
                          color: FD.r6,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={GBTN} onClick={() => router.push("/messages")}>
                    Message
                  </button>
                  <button type="button" style={GBTN}>
                    View profile
                  </button>
                  <button type="button" style={GBTN}>
                    Assign property
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAll(g)}
                    style={{
                      ...GBTN,
                      border: `0.5px solid ${FD.r3}`,
                      background: FD.r0,
                      color: FD.r6,
                    }}
                  >
                    Remove all
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* ── Properties without agent ── */}
        {unassignedProps.length > 0 && (
          <>
            <div style={{ ...SECTION_TITLE, marginTop: 4 }}>Properties without agent</div>
            {unassignedProps.map((p) => (
              <div
                key={p.id}
                style={{
                  background: FD.wh,
                  border: `0.5px solid ${FD.bd}`,
                  borderLeft: `3px solid ${FD.a5}`,
                  borderRadius: FD.rxl,
                  padding: "20px 22px",
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: FD.k0,
                      border: `0.5px dashed ${FD.bdm}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={FD.k2} strokeWidth={1.5} strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: FD.k9 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: FD.k5 }}>
                      {unitCounts[p.id] ?? 0} units · No agent assigned
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <button
                      type="button"
                      className="transition-colors hover:bg-[#085041]"
                      style={financePbtn(font)}
                      onClick={() => appointRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Appoint agent
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Appoint a new agent ── */}
        <div ref={appointRef} style={{ marginTop: 4 }}>
          <div style={SECTION_TITLE}>Appoint a new agent</div>
          <div style={{ background: FD.wh, border: `0.5px solid ${FD.bd}`, borderRadius: FD.rlg, padding: "16px 18px" }}>
            <div style={{ ...SECTION_TITLE, marginBottom: 12 }}>Search &amp; appoint</div>
            <form onSubmit={handleAppoint} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label htmlFor="appoint_agent_user_id" style={financeFieldLabelStyle}>
                    Agent email or name
                  </label>
                  <input
                    id="appoint_agent_user_id"
                    name="agent_user_id"
                    type="number"
                    required
                    min={1}
                    placeholder="Search by name or email…"
                    className={FINANCE_FIELD_CLASS}
                    style={financeFieldInputStyle({ fontFamily: font })}
                  />
                </div>
                <div>
                  <label htmlFor="appoint_property_id" style={financeFieldLabelStyle}>
                    Assign to property
                  </label>
                  <select
                    id="appoint_property_id"
                    name="property_id"
                    required
                    className={FINANCE_FIELD_CLASS}
                    style={financeFieldSelectStyle(font)}
                  >
                    <option value="">Select property</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label htmlFor="appoint_commission" style={financeFieldLabelStyle}>
                    Commission rate (%)
                  </label>
                  <input
                    id="appoint_commission"
                    type="number"
                    min={0}
                    max={30}
                    defaultValue={5}
                    placeholder="e.g. 5"
                    className={FINANCE_FIELD_CLASS}
                    style={financeFieldInputStyle({ fontFamily: font })}
                  />
                </div>
                <div>
                  <label htmlFor="appoint_start" style={financeFieldLabelStyle}>
                    Start date
                  </label>
                  <input
                    id="appoint_start"
                    type="date"
                    className={FINANCE_FIELD_CLASS}
                    style={financeFieldInputStyle({ fontFamily: font })}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting || properties.length === 0}
                className="transition-colors hover:bg-[#085041]"
                style={{
                  width: "100%",
                  height: 38,
                  background: FD.g7,
                  color: "#fff",
                  border: "none",
                  borderRadius: FD.rmd,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: submitting || properties.length === 0 ? "not-allowed" : "pointer",
                  fontFamily: font,
                  marginTop: 4,
                  opacity: submitting || properties.length === 0 ? 0.65 : 1,
                }}
              >
                {submitting ? "Sending…" : "Send appointment invitation"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
