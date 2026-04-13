"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cormorant, Plus_Jakarta_Sans } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import { AxiosError } from "axios";
import type { ApiErrorDetail } from "@/types/api";
import {
  ROLE_ADMIN,
  ROLE_LANDLORD,
  ROLE_AGENT,
  ROLE_TENANT,
  ROLE_ARTISAN,
  ROLE_MOVING,
} from "@/constants/roles";

const cormorant = Cormorant({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-cormorant",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jakarta",
});

const ROLE_ROUTES: Record<number, string> = {
  [ROLE_ADMIN]: "/admin/dashboard",
  [ROLE_LANDLORD]: "/landlord/dashboard",
  [ROLE_AGENT]: "/agent/dashboard",
  [ROLE_TENANT]: "/tenant/dashboard",
  [ROLE_ARTISAN]: "/artisan/dashboard",
  [ROLE_MOVING]: "/moving/dashboard",
};

function TreeHouseIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <circle cx="18" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="18" y1="18" x2="18" y2="22"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
      <rect x="5" y="22" width="26" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="26" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOpen() {
  return (
    <svg viewBox="0 0 20 20" fill="none" style={{ width: 16, height: 16 }}>
      <path
        d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeClosed() {
  return (
    <svg viewBox="0 0 20 20" fill="none" style={{ width: 16, height: 16 }}>
      <path
        d="M3 3l14 14M8.46 8.46A3 3 0 0 0 13 13M4.06 6.35C2.74 7.54 2 9 2 9s3 6 8 6c1.4 0 2.72-.38 3.88-1.03M7.07 4.11C7.99 4 8.98 4 10 4c5 0 8 6 8 6s-.56 1.32-1.6 2.66"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      style={{ width: 15, height: 15, animation: "spin 0.75s linear infinite" }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Redirect once user state is populated after login
  useEffect(() => {
    if (justLoggedIn && user && !authLoading) {
      router.push(ROLE_ROUTES[user.role] ?? "/");
    }
  }, [justLoggedIn, user, authLoading, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const username = fd.get("username") as string;
    const password = fd.get("password") as string;

    try {
      await login({ username, password });
      setJustLoggedIn(true);
    } catch (err) {
      const data = (err as AxiosError<ApiErrorDetail>).response?.data;
      setError(
        data?.detail ??
          (data?.non_field_errors as string[] | undefined)?.[0] ??
          "Invalid credentials. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-fade { animation: fadeUp 0.45s ease-out both; }
        .lp-fade-1 { animation-delay: 0.05s; }
        .lp-fade-2 { animation-delay: 0.12s; }
        .lp-fade-3 { animation-delay: 0.20s; }
        .lp-input:focus {
          border-color: #B4842B !important;
          box-shadow: 0 0 0 3px rgba(180,132,43,0.13) !important;
        }
        .lp-btn:not(:disabled):hover { background: #243F2F !important; }
        .lp-register:hover { color: #96671A !important; }
        .lp-forgot:hover { color: #96671A !important; }
      `}</style>

      <div
        className={`${cormorant.variable} ${jakarta.variable}`}
        style={{
          minHeight: "100vh",
          display: "flex",
          fontFamily: "var(--font-jakarta), sans-serif",
        }}
      >
        {/* ── Left: Form Panel ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: "100%",
            padding: "40px 32px",
            background: "#F8F4EC",
          }}
          className="lg:max-w-[50%] sm:px-14 sm:py-14"
        >
          {/* Wordmark */}
          <div className="lp-fade" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <TreeHouseIcon style={{ width: 30, height: 30, color: "#1B3828" }} />
            <span
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: "1.55rem",
                fontWeight: 400,
                letterSpacing: "0.045em",
                color: "#1B3828",
                lineHeight: 1,
              }}
            >
              Tree House
            </span>
          </div>

          {/* Form area */}
          <div style={{ width: "100%", maxWidth: "360px", margin: "0 auto" }}>
            <div className="lp-fade lp-fade-1" style={{ marginBottom: "36px" }}>
              <h1
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: "clamp(2rem, 4vw, 2.6rem)",
                  fontWeight: 300,
                  letterSpacing: "0.01em",
                  color: "#1C1917",
                  lineHeight: 1.2,
                  marginBottom: "10px",
                }}
              >
                Welcome back.
              </h1>
              <p style={{ color: "#7C6F63", fontSize: "0.875rem", lineHeight: 1.5 }}>
                Sign in to your property management dashboard.
              </p>
            </div>

            <div className="lp-fade lp-fade-2">
              {error && (
                <div
                  role="alert"
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: "8px",
                    padding: "11px 14px",
                    marginBottom: "20px",
                    color: "#B91C1C",
                    fontSize: "0.85rem",
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Username */}
                <div>
                  <label
                    htmlFor="username"
                    style={{
                      display: "block",
                      fontSize: "0.73rem",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#5C5047",
                      marginBottom: "7px",
                    }}
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    placeholder="your.username"
                    className="lp-input"
                    style={{
                      width: "100%",
                      padding: "11px 13px",
                      background: "#FFFFFF",
                      border: "1px solid #DDD8CF",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                      color: "#1C1917",
                      outline: "none",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}>
                    <label
                      htmlFor="password"
                      style={{
                        fontSize: "0.73rem",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#5C5047",
                      }}
                    >
                      Password
                    </label>
                    <Link
                      href="/reset-password"
                      className="lp-forgot"
                      style={{ fontSize: "0.8rem", color: "#B4842B", textDecoration: "none", transition: "color 0.15s" }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      className="lp-input"
                      style={{
                        width: "100%",
                        padding: "11px 44px 11px 13px",
                        background: "#FFFFFF",
                        border: "1px solid #DDD8CF",
                        borderRadius: "8px",
                        fontSize: "0.9rem",
                        color: "#1C1917",
                        outline: "none",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute",
                        right: "13px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#8B7B6B",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        lineHeight: 0,
                      }}
                    >
                      {showPassword ? <EyeOpen /> : <EyeClosed />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="lp-btn"
                  style={{
                    width: "100%",
                    padding: "13px",
                    background: "#1B3828",
                    color: "#F8F4EC",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    cursor: submitting ? "default" : "pointer",
                    transition: "background 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "9px",
                    opacity: submitting ? 0.8 : 1,
                  }}
                >
                  {submitting && <Spinner />}
                  {submitting ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="lp-fade lp-fade-3" style={{ textAlign: "center" }}>
            <p style={{ fontSize: "0.875rem", color: "#7C6F63" }}>
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="lp-register"
                style={{ color: "#B4842B", fontWeight: 500, textDecoration: "none", transition: "color 0.15s" }}
              >
                Register
              </Link>
            </p>
          </div>
        </div>

        {/* ── Right: Brand Panel (desktop only) ── */}
        <div
          className="hidden lg:flex"
          style={{
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "52px 56px",
            background: "#1B3828",
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        >
          {/* Top spacer */}
          <div />

          {/* Headline */}
          <div>
            <div
              style={{
                width: "44px",
                height: "2.5px",
                background: "#B4842B",
                borderRadius: "2px",
                marginBottom: "28px",
              }}
            />
            <p
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: "clamp(2rem, 2.8vw, 2.75rem)",
                fontWeight: 300,
                color: "#F8F4EC",
                lineHeight: 1.25,
                maxWidth: "400px",
                letterSpacing: "0.01em",
              }}
            >
              Every property,
              <br />
              managed with
              <br />
              <em style={{ fontStyle: "italic" }}>precision.</em>
            </p>
            <p
              style={{
                marginTop: "18px",
                color: "rgba(248,244,236,0.48)",
                fontSize: "0.875rem",
                maxWidth: "320px",
                lineHeight: 1.65,
              }}
            >
              From tenant applications to maintenance requests —
              everything your portfolio needs, in one place.
            </p>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "20px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: "28px",
            }}
          >
            {[
              { value: "2,400+", label: "Properties" },
              { value: "14", label: "Cities" },
              { value: "98%", label: "Satisfaction" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div
                  style={{
                    fontFamily: "var(--font-cormorant), serif",
                    fontSize: "1.9rem",
                    fontWeight: 600,
                    color: "#F8F4EC",
                    letterSpacing: "0.02em",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "rgba(248,244,236,0.45)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginTop: "5px",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
