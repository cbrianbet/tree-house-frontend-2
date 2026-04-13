"use client";
import React, { FormEvent, useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/api/auth";

type Step = 1 | 2;

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

function LockIcon() {
  return (
    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
      <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: "none", stroke: "#0F6E56", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
  );
}

function MailIcon() {
  return (
    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
      <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: "none", stroke: "#0F6E56", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.includes("@")) {
      setEmailErr(true);
      return;
    }
    setEmailErr(false);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
    } catch {
      // show step 2 regardless (don't leak whether email exists)
    } finally {
      setSubmitting(false);
      setStep(2);
    }
  }

  async function handleResend() {
    try {
      await requestPasswordReset(email);
    } catch {
      // silent
    }
    setResent(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 14 }}>
      <div style={CARD}>
        <Link
          href="/signin"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b6b6b", textDecoration: "none", marginBottom: "1.5rem" }}
        >
          <svg viewBox="0 0 14 14" style={{ width: 14, height: 14, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" }}>
            <polyline points="9,2 4,7 9,12" />
          </svg>
          Back to sign in
        </Link>

        <StepDots active={step} />

        {step === 1 && (
          <div>
            <LockIcon />
            <div style={{ fontSize: 18, fontWeight: 500, color: "#1a1a1a", marginBottom: 6 }}>Forgot your password?</div>
            <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Enter your email address and we&apos;ll send you a reset link.
            </div>
            <form onSubmit={handleSend}>
              <div style={{ marginBottom: 12 }}>
                <label style={LABEL}>Email address</label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailErr(false); }}
                  style={{ ...INPUT, borderColor: emailErr ? "#E24B4A" : "rgba(0,0,0,0.12)" }}
                  autoComplete="email"
                />
                {emailErr && <div style={{ fontSize: 11, color: "#A32D2D", marginTop: 4 }}>Enter a valid email address</div>}
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{ ...BTN, background: submitting ? "#1D9E75" : "#0F6E56", cursor: submitting ? "default" : "pointer" }}
              >
                {submitting ? (
                  <div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "th-spin 0.7s linear infinite" }} />
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div>
            <MailIcon />
            <div style={{ fontSize: 18, fontWeight: 500, color: "#1a1a1a", marginBottom: 6 }}>Check your inbox</div>
            <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: "1rem", lineHeight: 1.6 }}>
              We sent a reset link to <strong>{email}</strong>. It expires in 15 minutes.
            </div>
            <div style={{ background: resent ? "#E1F5EE" : "#E1F5EE", border: "0.5px solid #5DCAA5", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#085041", marginBottom: "1rem" }}>
              {resent ? "Reset link resent successfully!" : "Didn't receive it? Check your spam folder or resend below."}
            </div>
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 13, color: "#6b6b6b", marginBottom: 8 }}>
                Have a reset token? Go to the{" "}
                <Link href="/reset-password/confirm" style={{ color: "#0F6E56", fontWeight: 500, textDecoration: "none" }}>
                  confirm page
                </Link>
                {" "}to set your new password.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResend}
              style={{ ...BTN, background: "transparent", color: "#1D9E75", border: "0.5px solid #1D9E75" }}
            >
              Resend email
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes th-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
