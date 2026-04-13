"use client";
import Link from "next/link";
import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AxiosError } from "axios";
import type { ApiErrorDetail } from "@/types/api";
import { ROLE_LANDLORD, ROLE_AGENT, ROLE_TENANT, ROLE_ARTISAN, ROLE_MOVING } from "@/constants/roles";

// Role IDs are stable per CLAUDE.md — no API fetch needed on this public page
const ROLE_OPTIONS = [
  { id: ROLE_LANDLORD, icon: "🏘", label: "Landlord" },
  { id: ROLE_AGENT,    icon: "🤝", label: "Agent" },
  { id: ROLE_TENANT,   icon: "🏠", label: "Tenant" },
  { id: ROLE_ARTISAN,  icon: "🔧", label: "Artisan" },
  { id: ROLE_MOVING,   icon: "🚛", label: "Moving Co." },
];

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

export default function SignUpForm() {
  const router = useRouter();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Step indicator states
  const step1Done = firstName.trim() && lastName.trim() && email.includes("@");
  const step2Done = selectedRoleId !== null;
  const step3Done = password.length >= 8;

  const strength = pwStrength(password);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const pw1 = fd.get("password1") as string;
    const pw2 = fd.get("password2") as string;

    const fe: Record<string, string> = {};
    if (!fd.get("first_name")) fe.first_name = "Required";
    if (!fd.get("last_name")) fe.last_name = "Required";
    if (!fd.get("username")) fe.username = "Required";
    if (!fd.get("email")) fe.email = "Required";
    if (!fd.get("phone")) fe.phone = "Required";
    if (!selectedRoleId) fe.role = "Please select a role";
    if (pw1.length < 8) fe.password1 = "Min 8 characters";
    if (pw1 !== pw2) fe.password2 = "Passwords don't match";

    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        username: fd.get("username") as string,
        email: fd.get("email") as string,
        password1: pw1,
        password2: pw2,
        first_name: fd.get("first_name") as string,
        last_name: fd.get("last_name") as string,
        phone: fd.get("phone") as string,
        role: selectedRoleId!,
      });
      router.push("/profile-setup");
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorDetail>;
      const data = axErr.response?.data;
      if (data) {
        const fe2: Record<string, string> = {};
        for (const [key, val] of Object.entries(data)) {
          if (key === "detail") setError(val as string);
          else if (Array.isArray(val)) fe2[key] = val[0];
          else if (typeof val === "string") fe2[key] = val;
        }
        if (Object.keys(fe2).length) setFieldErrors(fe2);
        else if (!error) setError("Registration failed. Please check your inputs.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = (hasErr?: boolean): React.CSSProperties => ({
    width: "100%",
    height: 38,
    padding: "0 10px",
    background: "#fff",
    border: `0.5px solid ${hasErr ? "#E24B4A" : "rgba(0,0,0,0.12)"}`,
    borderRadius: 8,
    fontSize: 13,
    color: "#1a1a1a",
    outline: "none",
    fontFamily: "inherit",
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 500,
    color: "#6b6b6b",
    marginBottom: 5,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
  };

  const errStyle: React.CSSProperties = {
    fontSize: 11,
    color: "#A32D2D",
    marginTop: 4,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 14 }}>
      {/* Left green panel */}
      <div
        style={{
          width: "40%",
          background: "#0F6E56",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "2.5rem 2rem",
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "#fff" }}>
              <path d="M12 2L2 9h3v11h6v-6h2v6h6V9h3L12 2z" />
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 500, color: "#fff", letterSpacing: "-0.3px" }}>Tree House</span>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { n: 1, done: !!step1Done, label: "Your details", sub: "Name, email & phone" },
            { n: 2, done: step2Done, label: "Choose your role", sub: "How you'll use Tree House" },
            { n: 3, done: step3Done, label: "Set password", sub: "Secure your account" },
          ].map(({ n, done, label, sub }) => {
            const isActive = n === 1 ? !step1Done : n === 2 ? !!step1Done && !step2Done : !!step2Done && !step3Done;
            return (
              <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderBottom: n < 3 ? "0.5px solid rgba(255,255,255,0.1)" : "none" }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: done ? "#1D9E75" : isActive ? "#fff" : "rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 500,
                    color: done ? "#fff" : isActive ? "#0F6E56" : "#fff",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {done ? "✓" : n}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 500, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>© 2026 Tree House</div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "#F5F4F0", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ fontSize: 20, fontWeight: 500, color: "#1a1a1a", marginBottom: 4 }}>Create your account</div>
          <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: "1.5rem" }}>Join the Tree House platform</div>

          {error && (
            <div style={{ background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#A32D2D", marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* First / Last name */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>First name</label>
                <input style={inputStyle(!!fieldErrors.first_name)} type="text" name="first_name" placeholder="Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                {fieldErrors.first_name && <div style={errStyle}>{fieldErrors.first_name}</div>}
              </div>
              <div>
                <label style={labelStyle}>Last name</label>
                <input style={inputStyle(!!fieldErrors.last_name)} type="text" name="last_name" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                {fieldErrors.last_name && <div style={errStyle}>{fieldErrors.last_name}</div>}
              </div>
            </div>

            {/* Username */}
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Username</label>
              <input style={inputStyle(!!fieldErrors.username)} type="text" name="username" placeholder="jane_doe" />
              {fieldErrors.username && <div style={errStyle}>{fieldErrors.username}</div>}
            </div>

            {/* Email */}
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle(!!fieldErrors.email)} type="email" name="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              {fieldErrors.email && <div style={errStyle}>{fieldErrors.email}</div>}
            </div>

            {/* Phone */}
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle(!!fieldErrors.phone)} type="tel" name="phone" placeholder="+254712345678" />
              {fieldErrors.phone && <div style={errStyle}>{fieldErrors.phone}</div>}
            </div>

            {/* Role */}
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#6b6b6b", marginBottom: 8, marginTop: 4 }}>
              Your role
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
              {ROLE_OPTIONS.map((r) => {
                const selected = selectedRoleId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoleId(r.id)}
                    style={{
                      padding: "10px 6px",
                      border: `0.5px solid ${selected ? "#1D9E75" : "rgba(0,0,0,0.12)"}`,
                      borderRadius: 8,
                      background: selected ? "#E1F5EE" : "#fff",
                      cursor: "pointer",
                      textAlign: "center",
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{r.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: selected ? "#085041" : "#1a1a1a" }}>{r.label}</div>
                  </button>
                );
              })}
            </div>
            {fieldErrors.role && <div style={{ ...errStyle, marginBottom: 8 }}>{fieldErrors.role}</div>}

            {/* Password row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  style={inputStyle(!!fieldErrors.password1)}
                  type="password"
                  name="password1"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div style={{ height: 3, borderRadius: 2, marginTop: 6, background: "#D3D1C7", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: strength?.width ?? "0%", background: strength?.color ?? "transparent", borderRadius: 2, transition: "width 0.3s, background 0.3s" }} />
                </div>
                <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 4 }}>{strength?.label ?? "Enter a password"}</div>
                {fieldErrors.password1 && <div style={errStyle}>{fieldErrors.password1}</div>}
              </div>
              <div>
                <label style={labelStyle}>Confirm</label>
                <input style={inputStyle(!!fieldErrors.password2)} type="password" name="password2" placeholder="••••••••" />
                {fieldErrors.password2 && <div style={errStyle}>{fieldErrors.password2}</div>}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                height: 40,
                background: submitting ? "#1D9E75" : "#0F6E56",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: submitting ? "default" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 4,
              }}
            >
              {submitting ? (
                <div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "th-spin 0.7s linear infinite" }} />
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div style={{ textAlign: "center", fontSize: 13, color: "#6b6b6b", marginTop: 12 }}>
            Already have an account?{" "}
            <Link href="/signin" style={{ color: "#1D9E75", textDecoration: "none", fontWeight: 500 }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <style>{`@keyframes th-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
