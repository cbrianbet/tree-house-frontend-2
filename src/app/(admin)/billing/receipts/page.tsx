"use client";

import React, { useEffect, useState, useMemo } from "react";
import { DM_Sans, DM_Mono } from "next/font/google";
import { listReceipts, getReceipt } from "@/lib/api/billing";
import type { Receipt } from "@/types/api";
import { FinancePageTopBar } from "@/components/finance/FinancePageTopBar";
import { FD, financeFsel, financeGbtn } from "@/constants/financeDesign";
import PageLoader from "@/components/ui/PageLoader";

const dmSans = DM_Sans({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap" });

function recDisplayId(id: number | string) {
  if (typeof id === "string") return id;
  return `REC-${String(id).padStart(4, "0")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const font = dmSans.style.fontFamily;
  const mono = dmMono.style.fontFamily;

  useEffect(() => {
    listReceipts()
      .then(setReceipts)
      .catch(() => setError("Failed to load receipts."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!searchQ) return receipts;
    const q = searchQ.toLowerCase();
    return receipts.filter(
      (r) =>
        r.receipt_number.toLowerCase().includes(q) ||
        String(r.payment).includes(q) ||
        String(r.id).includes(q),
    );
  }, [receipts, searchQ]);

  function openDrawer(r: Receipt) {
    setSelectedReceipt(r);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  const totalReceipts = receipts.length;

  return (
    <div
      className={`${dmSans.className} -mx-4 md:-mx-6`}
      style={{ fontFamily: font, fontSize: 14, color: FD.k9, background: FD.surf, minHeight: "100%" }}
    >
      <FinancePageTopBar
        className="-mt-4 md:-mt-6"
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Billing", href: "/billing" },
          { label: "Receipts" },
        ]}
        right={
          <button style={financeGbtn(font)} onClick={() => { /* export */ }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        }
      />

      <div style={{ padding: "22px 24px" }}>
        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 16, padding: "12px 14px", borderRadius: FD.rlg,
              border: `0.5px solid ${FD.r3}`, background: FD.r0, color: FD.r6, fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {loading && <PageLoader />}

        {!loading && !error && (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
              <div style={{ background: FD.wh, border: `0.5px solid ${FD.bd}`, borderRadius: FD.rlg, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: FD.k5, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 6 }}>Total receipts</div>
                <div className={dmMono.className} style={{ fontSize: 20, fontWeight: 500, color: FD.k9, fontFamily: mono }}>{totalReceipts}</div>
                <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>All time</div>
              </div>
              <div style={{ background: FD.wh, border: `0.5px solid ${FD.bd}`, borderRadius: FD.rlg, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: FD.k5, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 6 }}>This month</div>
                <div className={dmMono.className} style={{ fontSize: 20, fontWeight: 500, color: FD.g7, fontFamily: mono }}>
                  {receipts.filter((r) => {
                    const d = new Date(r.issued_at);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length}
                </div>
                <div style={{ fontSize: 11, color: FD.k5, marginTop: 4 }}>Receipts issued</div>
              </div>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 280 }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={FD.k5} strokeWidth={2} strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search receipt # or payment ID…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  style={{
                    width: "100%", height: 34, padding: "0 10px 0 32px", background: FD.wh,
                    border: `0.5px solid ${FD.bdm}`, borderRadius: FD.rmd, fontSize: 13,
                    color: FD.k9, fontFamily: font, outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Table */}
            {receipts.length === 0 ? (
              <div
                style={{
                  border: `0.5px solid ${FD.bd}`, borderRadius: FD.rlg, background: FD.wh,
                  padding: 48, textAlign: "center", color: FD.k5,
                }}
              >
                No receipts found.
              </div>
            ) : (
              <div style={{ overflow: "hidden", border: `0.5px solid ${FD.bd}`, borderRadius: FD.rlg, background: FD.wh }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Receipt #", "Payment ID", "Issued at", ""].map((h) => (
                        <th
                          key={h || "actions"}
                          style={{
                            textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 500,
                            letterSpacing: "0.3px", textTransform: "uppercase", color: FD.k5,
                            background: FD.k0, borderBottom: `0.5px solid ${FD.bd}`,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => openDrawer(r)}
                        style={{ cursor: "pointer", borderBottom: `0.5px solid ${FD.bd}` }}
                        onMouseEnter={(e) => {
                          (e.currentTarget.querySelectorAll("td") as NodeListOf<HTMLElement>).forEach((td) => { td.style.background = FD.surf; });
                          const actions = e.currentTarget.querySelector("[data-actions]") as HTMLElement | null;
                          if (actions) actions.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget.querySelectorAll("td") as NodeListOf<HTMLElement>).forEach((td) => { td.style.background = ""; });
                          const actions = e.currentTarget.querySelector("[data-actions]") as HTMLElement | null;
                          if (actions) actions.style.opacity = "0";
                        }}
                      >
                        <td
                          className={dmMono.className}
                          style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: FD.k9, fontFamily: mono }}
                        >
                          {r.receipt_number || recDisplayId(r.id)}
                        </td>
                        <td
                          className={dmMono.className}
                          style={{ padding: "12px 16px", fontSize: 12, color: FD.k7, fontFamily: mono }}
                        >
                          {r.payment}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: FD.k5 }}>
                          {fmtDateTime(r.issued_at)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div data-actions style={{ opacity: 0, transition: "opacity 0.15s", display: "flex", gap: 5 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); openDrawer(r); }}
                              style={{
                                height: 24, padding: "0 9px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: font,
                                border: `0.5px solid ${FD.g7}`, background: FD.g7, color: "#fff", transition: "all 0.15s",
                              }}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination info */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: `0.5px solid ${FD.bd}` }}>
                  <div style={{ fontSize: 12, color: FD.k5 }}>
                    Showing 1–{filtered.length} of {totalReceipts} receipts
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Drawer overlay ── */}
      <div
        onClick={closeDrawer}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: drawerOpen ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0)",
          pointerEvents: drawerOpen ? "auto" : "none",
          transition: "background 0.3s",
        }}
      />

      {/* ── Receipt drawer ── */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, width: 480, height: "100vh",
          background: FD.wh, boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column", zIndex: 51, overflow: "hidden",
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* Drawer header */}
        <div style={{ background: FD.g7, padding: "18px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>Payment receipt</div>
            <div className={dmMono.className} style={{ fontSize: 14, fontWeight: 500, color: "#fff", fontFamily: mono, marginBottom: 2 }}>
              {selectedReceipt ? (selectedReceipt.receipt_number || recDisplayId(selectedReceipt.id)) : ""}
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: "rgba(255,255,255,0.15)", borderRadius: 20, fontSize: 11, fontWeight: 500, color: "#fff", marginTop: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: FD.g3 }} />
              Issued
            </div>
          </div>
          <button
            onClick={closeDrawer}
            style={{ width: 30, height: 30, borderRadius: FD.rmd, background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
          {selectedReceipt && (
            <>
              {/* Amount */}
              <div style={{ textAlign: "center", padding: "6px 0 16px", borderBottom: `0.5px solid ${FD.bd}`, marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: FD.k5, marginBottom: 10 }}>Receipt details</div>
              </div>

              {/* Details */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: FD.k5, marginBottom: 10 }}>Receipt information</div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `0.5px solid ${FD.bd}`, fontSize: 13 }}>
                  <div style={{ color: FD.k5 }}>Receipt number</div>
                  <div className={dmMono.className} style={{ fontWeight: 500, color: FD.k9, fontFamily: mono, fontSize: 12 }}>
                    {selectedReceipt.receipt_number || recDisplayId(selectedReceipt.id)}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `0.5px solid ${FD.bd}`, fontSize: 13 }}>
                  <div style={{ color: FD.k5 }}>Payment ID</div>
                  <div className={dmMono.className} style={{ fontWeight: 500, color: FD.k9, fontFamily: mono, fontSize: 12 }}>
                    {selectedReceipt.payment}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 13 }}>
                  <div style={{ color: FD.k5 }}>Issued at</div>
                  <div style={{ fontWeight: 500, color: FD.k9 }}>
                    {fmtDateTime(selectedReceipt.issued_at)}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: FD.k5, marginBottom: 10 }}>Timeline</div>
                <div style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `0.5px solid ${FD.bd}` }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3, flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: FD.g5 }} />
                    <div style={{ width: 1, background: FD.bd, flex: 1, marginTop: 3, minHeight: 14 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: FD.k9 }}>Receipt issued</div>
                    <div className={dmMono.className} style={{ fontSize: 10, color: FD.k5, marginTop: 2, fontFamily: mono }}>
                      {fmtDateTime(selectedReceipt.issued_at).toUpperCase()}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, padding: "8px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3, flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: FD.g5 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: FD.k9 }}>Payment confirmed (ID: {selectedReceipt.payment})</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Drawer footer */}
        <div style={{ padding: "14px 22px", borderTop: `0.5px solid ${FD.bd}`, display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={closeDrawer}
            style={{
              flex: 1, height: 38, borderRadius: FD.rmd, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: font,
              border: `0.5px solid ${FD.bdm}`, background: FD.wh, color: FD.k7,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
