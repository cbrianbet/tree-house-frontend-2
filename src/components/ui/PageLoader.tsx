"use client";

import React from "react";

interface PageLoaderProps {
  /** Optional size variant */
  size?: "sm" | "md" | "lg";
  /** Show inline (no vertical padding) vs full-section (default) */
  inline?: boolean;
  /** Optional className override for the container */
  className?: string;
}

/**
 * Unified page-level loading spinner used across all admin pages.
 * Brand-colored ring with a smooth fade-in animation.
 */
export default function PageLoader({ size = "md", inline = false, className }: PageLoaderProps) {
  const dim = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-7 w-7";
  const border = size === "sm" ? "border-[2.5px]" : size === "lg" ? "border-4" : "border-[3px]";

  return (
    <div
      className={
        className ??
        `flex items-center justify-center ${inline ? "py-4" : "py-20"}`
      }
    >
      <div
        className={`${dim} ${border} animate-spin rounded-full border-brand-500 border-t-transparent`}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
