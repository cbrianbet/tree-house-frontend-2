import type { CSSProperties } from "react";

/** Tokens aligned with built by claude/finance and tenants/*.html mocks */
export const FD = {
  g7: "#0F6E56",
  g5: "#1D9E75",
  g3: "#5DCAA5",
  g1: "#E1F5EE",
  a7: "#854F0B",
  a5: "#EF9F27",
  a1: "#FAC775",
  a0: "#FAEEDA",
  r6: "#A32D2D",
  r3: "#F09595",
  r0: "#FCEBEB",
  b8: "#0C447C",
  b0: "#E6F1FB",
  k9: "#1A1A1A",
  k7: "#3D3D3D",
  k5: "#6B6B6B",
  k2: "#D3D1C7",
  k1: "#E8E7E1",
  k0: "#F2F1EB",
  surf: "#F7F6F2",
  wh: "#ffffff",
  bd: "rgba(0,0,0,0.07)",
  bdm: "rgba(0,0,0,0.12)",
  rsm: 6,
  rmd: 8,
  rlg: 14,
  /** Invoice receipt outer radius */
  rxl: 18,
  primaryHover: "#085041",
  activeBadgeText: "#085041",
} as const;

export const SELECT_CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6B6B' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")";

/**
 * Add to inputs, selects, textareas that use {@link financeFieldInputStyle} / {@link financeFieldSelectStyle} /
 * {@link financeFieldTextAreaStyle} so :focus / :disabled match the HTML mocks (see `globals.css` `.th-finance-field`).
 */
export const FINANCE_FIELD_CLASS = "th-finance-field";

/** Mock `.field label` — caption above finance form controls */
export const financeFieldLabelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: FD.k5,
  marginBottom: 5,
  letterSpacing: "0.4px",
  textTransform: "uppercase",
};

/** Mock `.field input` — single-line text, number, date, etc. */
export function financeFieldInputStyle(extra?: CSSProperties): CSSProperties {
  return {
    width: "100%",
    padding: "0 12px",
    background: FD.k0,
    border: `0.5px solid ${FD.bdm}`,
    borderRadius: FD.rmd,
    fontSize: 13,
    color: FD.k9,
    height: 38,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    ...extra,
  };
}

/** Mock textarea — min height, vertical padding */
export function financeFieldTextAreaStyle(minHeight = 88): CSSProperties {
  return {
    ...financeFieldInputStyle({ height: "auto" }),
    minHeight,
    padding: "10px 12px",
    lineHeight: 1.5,
    resize: "vertical" as const,
  };
}

/** Mock `.field select` — chevron, 38px tall */
export function financeFieldSelectStyle(fontFamily: string, minWidth?: number): CSSProperties {
  return {
    width: "100%",
    height: 38,
    padding: "0 28px 0 12px",
    backgroundColor: FD.k0,
    backgroundImage: SELECT_CHEVRON,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    border: `0.5px solid ${FD.bdm}`,
    borderRadius: FD.rmd,
    fontSize: 13,
    color: FD.k9,
    outline: "none",
    boxSizing: "border-box",
    fontFamily,
    cursor: "pointer",
    appearance: "none",
    ...(minWidth ? { minWidth } : {}),
  };
}

/** Mock `.fsel` — toolbar `<select>` */
export function financeFsel(fontFamily: string, minWidth: number): CSSProperties {
  return {
    height: 34,
    minWidth,
    padding: "0 26px 0 10px",
    background: FD.wh,
    border: `0.5px solid ${FD.bdm}`,
    borderRadius: FD.rmd,
    fontSize: 13,
    color: FD.k7,
    fontFamily,
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    backgroundImage: SELECT_CHEVRON,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
  };
}

/** Mock `.gbtn` — outline toolbar button */
export function financeGbtn(fontFamily: string): CSSProperties {
  return {
    height: 34,
    padding: "0 14px",
    background: FD.wh,
    color: FD.k7,
    border: `0.5px solid ${FD.bdm}`,
    borderRadius: FD.rmd,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily,
    display: "flex",
    alignItems: "center",
    gap: 5,
  };
}

/** Primary green action (New invoice, Save, etc.) */
export function financePbtn(fontFamily: string): CSSProperties {
  return {
    height: 34,
    padding: "0 14px",
    background: FD.g7,
    color: "#fff",
    border: "none",
    borderRadius: FD.rmd,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily,
    display: "flex",
    alignItems: "center",
    gap: 5,
  };
}
