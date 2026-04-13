"use client";
import React, { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { confirmPasswordReset } from "@/lib/api/auth";

type Step = 3 | 4;

const CARD: React.CSSProperties = {
  width: "100%",
  maxWidth: 380,
  background: "#fff",
  border: "0.5px solid rgba(0,0,0,0.12)",
  borderRadius: 12,
  padding: "2rem",
};

const INPUT: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 10px",
  background: "#F5F4F0",
  border: "0.5px solid rgba(0,0,0,0.12)",
  borderRadius: 8,
  fontSize: 13,
  color: "#1a1a1a",
  outline: "none",
  fontFamily: "inherit",
};

const BTN: React.CSSProperties = {
  width: "100%",
  height: 40,
  background: "#0F6E56",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const LABEL: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: "#6b6b6b",
  marginBottom: 5,
  letterSpacing: "0.4px",
  textTransform: "uppercase",
};

function StepDots({ active }: { active: Step }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: "1.5rem" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 3,
            borderRadius: 2,
            flex: 1,
            background: i <= active ? "#1D9E75" : "#D3D1C7",
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  );
}

function pwStrength(pw: string) {
  if (!pw) return null;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const i = Math.max(0, s - 1);
  return {
    width: ["25%", "50%", "75%", "100%"][i],
    color: ["#E24B4A", "#EF9F27", "#1D9E75", "#0F6E56"][i],
    label: ["Too short", "Fair", "Good", "Strong"][i],
  };
}

export default function ConfirmForm() {
  const params = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const invalidLink = !uid || !token;

  const [step, setStep] = useState<Step>(3);
  const [pw1, setPw1] = useState("");
  const [pw1Err, setPw1Err] = useState("");
  const [pw2Err, setPw2Err] = useState("");
  const [apiErr, setApiErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const strength = pwStrength(pw1);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const p1 = fd.get("password1") as string;
    const p2 = fd.get("password2") as string;

    let valid = true;
    if (p1.length < 8) { setPw1Err("Min 8 characters"); valid = false; } else setPw1Err("");
    if (p1 !== p2) { setPw2Err("Passwords don't match"); valid = false; } else setPw2Err("");
    if (!valid) return;

    setApiErr("");
    setSubmitting(true);
    try {
      await confirmPasswordReset({ uid, token, new_password1: p1, new_password2: p2 });
      setStep(4);
    } catch {
      setApiErr("Failed to reset password. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 14 }}>
      <div style={CARD}>
        {invalidLink && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FCEBEB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: "none", stroke: "#A32D2D", strokeWidth: 2, strokeLinecap: "round" }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "#1a1a1a", marginBottom: 8 }}>Invalid reset link</div>
            <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              This link is missing required parameters. Please request a new password reset.
            </div>
            <Link href="/reset-password" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 40, background: "#0F6E56", color: "#fff", borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
              Request new link
            </Link>
          </div>
        )}
        {!invalidLink && step === 3 && (
          <>
            <Link
              href="/reset-password"
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b6b6b", textDecoration: "none", marginBottom: "1.5rem" }}
            >
              <svg viewBox="0 0 14 14" style={{ width: 14, height: 14, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" }}>
                <polyline points="9,2 4,7 9,12" />
              </svg>
              Back
            </Link>

            <StepDots active={3} />

            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: "none", stroke: "#0F6E56", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <div style={{ fontSize: 18, fontWeight: 500, color: "#1a1a1a", marginBottom: 6 }}>Set new password</div>
            <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Choose a strong password for your account.
            </div>

            {apiErr && (
              <div style={{ background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#A32D2D", marginBottom: "1rem" }}>
                {apiErr}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={LABEL}>New password</label>
                <input
                  type="password"
                  name="password1"
                  placeholder="••••••••"
                  value={pw1}
                  onChange={(e) => { setPw1(e.target.value); setPw1Err(""); }}
                  style={{ ...INPUT, borderColor: pw1Err ? "#E24B4A" : "rgba(0,0,0,0.12)" }}
                  autoComplete="new-password"
                />
                <div style={{ height: 3, borderRadius: 2, marginTop: 6, background: "#D3D1C7", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: strength?.width ?? "0%", background: strength?.color ?? "transparent", borderRadius: 2, transition: "width 0.3s, background 0.3s" }} />
                </div>
                <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 4 }}>{strength?.label ?? "Enter a password"}</div>
                {pw1Err && <div style={{ fontSize: 11, color: "#A32D2D", marginTop: 4 }}>{pw1Err}</div>}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={LABEL}>Confirm password</label>
                <input
                  type="password"
                  name="password2"
                  placeholder="••••••••"
                  onChange={() => setPw2Err("")}
                  style={{ ...INPUT, borderColor: pw2Err ? "#E24B4A" : "rgba(0,0,0,0.12)" }}
                  autoComplete="new-password"
                />
                {pw2Err && <div style={{ fontSize: 11, color: "#A32D2D", marginTop: 4 }}>{pw2Err}</div>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{ ...BTN, background: submitting ? "#1D9E75" : "#0F6E56", cursor: submitting ? "default" : "pointer" }}
              >
                {submitting ? (
                  <div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "th-spin 0.7s linear infinite" }} />
                ) : (
                  "Reset password"
                )}
              </button>
            </form>
          </>
        )}

        {!invalidLink && step === 4 && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, fill: "none", stroke: "#0F6E56", strokeWidth: 2, strokeLinecap: "round" }}>
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "#1a1a1a", marginBottom: 8 }}>Password reset!</div>
            <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Your password has been updated. You can now sign in with your new credentials.
            </div>
            <Link href="/signin" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 40, background: "#0F6E56", color: "#fff", borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
              Go to sign in
            </Link>
          </div>
        )}
      </div>
      <style>{`@keyframes th-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
