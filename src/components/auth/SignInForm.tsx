"use client";
import React, { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AxiosError } from "axios";
import type { ApiErrorDetail } from "@/types/api";

export default function SignInForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      await login({ username, password });
      router.push("/");
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorDetail>;
      const data = axErr.response?.data;
      const nonField = data?.non_field_errors;
      setError(
        data?.detail ??
          (Array.isArray(nonField) ? nonField[0] : undefined) ??
          "Invalid credentials. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex lg:w-[44%] flex-col justify-between"
        style={{ background: "#0F6E56", padding: "3rem 2.5rem" }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              style={{ width: 20, height: 20, fill: "#fff" }}
            >
              <path d="M12 2L2 9h3v11h6v-6h2v6h6V9h3L12 2z" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: "#fff",
                letterSpacing: "-0.3px",
              }}
            >
              Tree House
            </div>
            <div
              style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}
            >
              Property management platform
            </div>
          </div>
        </div>

        {/* Hero copy */}
        <div>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "#fff",
              lineHeight: 1.3,
              marginBottom: "1rem",
            }}
          >
            One platform,{" "}
            <span style={{ color: "#9FE1CB" }}>every role</span>
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.6,
            }}
          >
            Manage properties, leases, payments, and maintenance — all in one
            place.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {[
              "Landlords & Agents",
              "Tenants",
              "Artisans",
              "Moving Companies",
            ].map((role) => (
              <div
                key={role}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#5DCAA5",
                    flexShrink: 0,
                  }}
                />
                {role}
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
          © 2026 Tree House
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="flex-1 flex items-center justify-center"
        style={{ padding: "2.5rem", background: "#F7F6F2" }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ marginBottom: "1.75rem" }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: "#1a1a1a",
                marginBottom: 6,
              }}
            >
              Welcome back
            </div>
            <div style={{ fontSize: 13, color: "#6b6b6b" }}>
              Sign in to your Tree House account
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "#FCEBEB",
                border: "0.5px solid #F09595",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                color: "#A32D2D",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#6b6b6b",
                  marginBottom: 6,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Username
              </label>
              <input
                name="username"
                type="text"
                placeholder="Enter your username"
                autoComplete="username"
                required
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 12px",
                  background: "#fff",
                  border: "0.5px solid rgba(0,0,0,0.2)",
                  borderRadius: 8,
                  fontSize: 14,
                  color: "#1a1a1a",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#1D9E75";
                  e.target.style.boxShadow = "0 0 0 3px rgba(29,158,117,0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(0,0,0,0.2)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "0.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#6b6b6b",
                  marginBottom: 6,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{
                    width: "100%",
                    height: 40,
                    padding: "0 40px 0 12px",
                    background: "#fff",
                    border: "0.5px solid rgba(0,0,0,0.2)",
                    borderRadius: 8,
                    fontSize: 14,
                    color: "#1a1a1a",
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#1D9E75";
                    e.target.style.boxShadow = "0 0 0 3px rgba(29,158,117,0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(0,0,0,0.2)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: "#888780",
                  }}
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      style={{
                        width: 16,
                        height: 16,
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 1.8,
                        strokeLinecap: "round",
                      }}
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      style={{
                        width: 16,
                        height: 16,
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 1.8,
                        strokeLinecap: "round",
                      }}
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot */}
            <div style={{ textAlign: "right", marginBottom: "1.25rem" }}>
              <Link
                href="/reset-password"
                style={{
                  fontSize: 12,
                  color: "#1D9E75",
                  textDecoration: "none",
                }}
              >
                Forgot password?
              </Link>
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
                transition: "background 0.15s",
              }}
            >
              {submitting ? (
                <>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.35)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "th-spin 0.7s linear infinite",
                      display: "inline-block",
                    }}
                  />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "1.25rem 0",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "0.5px",
                background: "rgba(0,0,0,0.12)",
              }}
            />
            <span style={{ fontSize: 12, color: "#aaa" }}>or</span>
            <div
              style={{
                flex: 1,
                height: "0.5px",
                background: "rgba(0,0,0,0.12)",
              }}
            />
          </div>

          {/* Register link */}
          <div style={{ textAlign: "center", fontSize: 13, color: "#6b6b6b" }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              style={{ color: "#1D9E75", textDecoration: "none", fontWeight: 500 }}
            >
              Create one
            </Link>
          </div>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes th-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
