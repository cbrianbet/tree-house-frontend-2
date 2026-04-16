"use client";

import React from "react";
import Link from "next/link";
import { FD } from "@/constants/financeDesign";

export type FinanceCrumb = { label: string; href?: string; onClick?: () => void };

function Chevron() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke={FD.k5} strokeWidth={2} strokeLinecap="round">
      <polyline points="4,2 8,6 4,10" />
    </svg>
  );
}

/**
 * Shared finance shell top bar (matches landlord-*.html `.topbar` + `.bc` / `.tr`).
 * Pass `className` for layout offset e.g. `-mx-4 -mt-4 md:-mx-6 md:-mt-6`.
 */
export function FinancePageTopBar({
  crumbs,
  right,
  className,
}: {
  crumbs: FinanceCrumb[];
  right?: React.ReactNode;
  className?: string;
}) {
  const stickyClassName = `sticky top-16 z-20 lg:top-0 ${className ?? ""}`.trim();

  return (
    <div
      className={stickyClassName}
      style={{
        background: FD.wh,
        borderBottom: `0.5px solid ${FD.bd}`,
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={`${i}-${c.label}`}>
            {i > 0 && <Chevron />}
            {c.href ? (
              <Link
                href={c.href}
                className="transition-colors hover:text-[#0F6E56]"
                style={{ fontSize: 13, color: FD.k5, textDecoration: "none" }}
              >
                {c.label}
              </Link>
            ) : c.onClick ? (
              <button
                type="button"
                onClick={c.onClick}
                className="transition-colors hover:text-[#0F6E56]"
                style={{
                  fontSize: 13,
                  color: FD.k5,
                  textDecoration: "none",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {c.label}
              </button>
            ) : (
              <span style={{ fontSize: 13, color: FD.k9, fontWeight: 500 }}>{c.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
      {right != null && right !== false && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{right}</div>
      )}
    </div>
  );
}
