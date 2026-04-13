"use client";
import React, { useEffect, useState, FormEvent } from "react";
import {
  getBillingConfig,
  saveBillingConfig,
  listChargeTypes,
  createChargeType,
  deleteChargeType,
} from "@/lib/api/billing";
import { listProperties } from "@/lib/api/properties";
import type { Property, BillingConfig, ChargeType } from "@/types/api";

const GREEN = "#1D9E75";
const GRAY900 = "#111827";
const GRAY700 = "#374151";
const GRAY500 = "#6B7280";
const GRAY400 = "#9CA3AF";
const GRAY200 = "#E5E7EB";
const GRAY100 = "#F9FAFB";
const WHITE = "#FFFFFF";
const RED = "#EF4444";
const REDBG = "#FEF2F2";

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

export default function BillingConfigPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newChargeName, setNewChargeName] = useState("");
  const [addingCharge, setAddingCharge] = useState(false);

  // local editable fields
  const [rentDueDay, setRentDueDay] = useState("1");
  const [gracePeriod, setGracePeriod] = useState("5");
  const [lateFee, setLateFee] = useState("5.00");
  const [lateFeMax, setLateFeeMax] = useState("20.00");

  useEffect(() => {
    listProperties().then(setProperties).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProperty) return;
    const pid = Number(selectedProperty);
    setLoading(true);
    setError(null);
    setConfig(null);
    setChargeTypes([]);
    Promise.all([
      getBillingConfig(pid).catch(() => ({
        rent_due_day: 1, grace_period_days: 5,
        late_fee_percentage: "5.00", late_fee_max_percentage: "20.00",
      })),
      listChargeTypes(pid).catch(() => []),
    ])
      .then(([cfg, ct]) => {
        setConfig(cfg as BillingConfig);
        setChargeTypes(ct as ChargeType[]);
        setRentDueDay(String((cfg as BillingConfig).rent_due_day));
        setGracePeriod(String((cfg as BillingConfig).grace_period_days));
        setLateFee((cfg as BillingConfig).late_fee_percentage);
        setLateFeeMax((cfg as BillingConfig).late_fee_max_percentage);
      })
      .finally(() => setLoading(false));
  }, [selectedProperty]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedProperty) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const saved = await saveBillingConfig(Number(selectedProperty), {
        rent_due_day: Number(rentDueDay),
        grace_period_days: Number(gracePeriod),
        late_fee_percentage: lateFee,
        late_fee_max_percentage: lateFeMax,
      });
      setConfig(saved);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save billing configuration.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddChargeType() {
    if (!newChargeName.trim() || !selectedProperty) return;
    setAddingCharge(true);
    try {
      await createChargeType(Number(selectedProperty), newChargeName.trim());
      setNewChargeName("");
      const ct = await listChargeTypes(Number(selectedProperty));
      setChargeTypes(ct);
    } catch {
      setError("Failed to add charge type.");
    } finally {
      setAddingCharge(false);
    }
  }

  async function handleDeleteChargeType(id: number) {
    if (!confirm("Delete this charge type?")) return;
    try {
      await deleteChargeType(Number(selectedProperty), id);
      setChargeTypes((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("Failed to delete charge type.");
    }
  }

  const selectedProp = properties.find((p) => String(p.id) === selectedProperty);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: GRAY900, margin: 0 }}>Billing Configuration</h1>
          <p style={{ fontSize: 13, color: GRAY500, marginTop: 2 }}>Configure invoicing rules and charge types per property</p>
        </div>
        <button
          onClick={handleSubmit as unknown as React.MouseEventHandler}
          disabled={!selectedProperty || submitting}
          style={{
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: !selectedProperty ? GRAY200 : GREEN,
            color: !selectedProperty ? GRAY500 : WHITE,
            fontSize: 13, fontWeight: 600, cursor: !selectedProperty ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {error && (
        <div style={{ background: REDBG, border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: RED, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", color: "#15803D", fontSize: 13, marginBottom: 16 }}>
          Configuration saved successfully.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        {/* LEFT — main config */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Invoice timing */}
          <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "20px 24px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: GRAY900, marginBottom: 16 }}>Invoice Timing</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: GRAY700, marginBottom: 6 }}>
                  Rent Due Day (1–28)
                </label>
                <select
                  value={rentDueDay}
                  onChange={(e) => setRentDueDay(e.target.value)}
                  disabled={!config}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${GRAY200}`, fontSize: 13, color: GRAY900, background: WHITE }}
                >
                  {DAY_OPTIONS.map((d) => (
                    <option key={d} value={String(d)}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: GRAY700, marginBottom: 6 }}>
                  Grace Period (days)
                </label>
                <input
                  type="number"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(e.target.value)}
                  disabled={!config}
                  min={0}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${GRAY200}`, fontSize: 13, color: GRAY900, background: WHITE, boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>

          {/* Late fees */}
          <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "20px 24px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: GRAY900, marginBottom: 4 }}>Late Fees</h2>
            <p style={{ fontSize: 12, color: GRAY500, marginBottom: 16 }}>Applied to overdue invoices after the grace period</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: GRAY700, marginBottom: 6 }}>
                  Late Fee Percentage (%)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    step="0.01"
                    value={lateFee}
                    onChange={(e) => setLateFee(e.target.value)}
                    disabled={!config}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${GRAY200}`, fontSize: 13, color: GRAY900, background: WHITE, boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: GRAY700, marginBottom: 6 }}>
                  Max Late Fee Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={lateFeMax}
                  onChange={(e) => setLateFeeMax(e.target.value)}
                  disabled={!config}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${GRAY200}`, fontSize: 13, color: GRAY900, background: WHITE, boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>

          {/* Charge types */}
          <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "20px 24px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: GRAY900, marginBottom: 4 }}>Charge Types</h2>
            <p style={{ fontSize: 12, color: GRAY500, marginBottom: 14 }}>Custom charge categories for additional income entries</p>

            {loading ? (
              <p style={{ fontSize: 13, color: GRAY400 }}>Loading…</p>
            ) : !selectedProperty ? (
              <p style={{ fontSize: 13, color: GRAY400 }}>Select a property to manage charge types.</p>
            ) : (
              <>
                {chargeTypes.length > 0 && (
                  <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    {chargeTypes.map((ct) => (
                      <div key={ct.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, border: `1px solid ${GRAY200}`, background: GRAY100 }}>
                        <span style={{ fontSize: 13, color: GRAY700 }}>{ct.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteChargeType(ct.id)}
                          style={{ fontSize: 12, color: RED, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {chargeTypes.length === 0 && (
                  <p style={{ fontSize: 13, color: GRAY400, marginBottom: 12 }}>No charge types yet.</p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g. Water, Parking…"
                    value={newChargeName}
                    onChange={(e) => setNewChargeName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddChargeType())}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${GRAY200}`, fontSize: 13, color: GRAY900 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddChargeType}
                    disabled={addingCharge || !newChargeName.trim()}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: GREEN, color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    {addingCharge ? "Adding…" : "Add"}
                  </button>
                </div>
              </>
            )}
          </div>
        </form>

        {/* RIGHT — property selector + summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Property selector */}
          <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: GRAY500, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Property</h3>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${GRAY200}`, fontSize: 13, color: GRAY900, background: WHITE }}
            >
              <option value="">Select a property…</option>
              {properties.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
            {selectedProp && (
              <p style={{ fontSize: 12, color: GRAY500, marginTop: 6 }}>{selectedProp.property_type}</p>
            )}
          </div>

          {/* Summary card */}
          {config && (
            <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: WHITE, padding: "16px 20px" }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: GRAY500, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Config</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Rent Due Day", value: `Day ${config.rent_due_day}` },
                  { label: "Grace Period", value: `${config.grace_period_days} days` },
                  { label: "Late Fee", value: `${config.late_fee_percentage}%` },
                  { label: "Max Late Fee", value: `${config.late_fee_max_percentage}%` },
                  { label: "Charge Types", value: `${chargeTypes.length}` },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: GRAY500 }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: GRAY900 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedProperty && (
            <div style={{ border: `0.5px solid ${GRAY200}`, borderRadius: 16, backgroundColor: GRAY100, padding: "20px", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: GRAY400 }}>Select a property to view and edit billing configuration.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
