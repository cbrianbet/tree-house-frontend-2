"use client";

import Link from "next/link";
import React from "react";
import { useSidebar } from "@/context/SidebarContext";

/** Visible below lg — opens the drawer sidebar (matches AppSidebar lg breakpoint). */
export default function MobileSidebarTrigger() {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();

  return (
    <div className="sticky top-0 z-30 -mx-4 -mt-4 mb-4 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 md:-mx-6 md:-mt-6 md:px-6 lg:hidden">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          aria-expanded={isMobileOpen}
          aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {isMobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.22 7.28a1 1 0 011.41 0L12 10.65l4.36-4.37a1 1 0 111.42 1.42L13.41 12l4.37 4.36a1 1 0 01-1.42 1.42L12 13.41l-4.36 4.37a1 1 0 01-1.42-1.42L10.59 12 6.22 7.64a1 1 0 010-1.36z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg width="18" height="14" viewBox="0 0 16 12" fill="none" aria-hidden>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.58 1a.75.75 0 01.75-.75h12.33a.75.75 0 010 1.5H1.33A.75.75 0 01.58 1zm0 10a.75.75 0 01.75-.75h12.33a.75.75 0 010 1.5H1.33a.75.75 0 01-.75-.75zm.75-4.75a.75.75 0 000 1.5h6.67a.75.75 0 000-1.5H1.33z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-[#1A1A1A] dark:text-white"
        >
          Tree House
        </Link>
      </div>
    </div>
  );
}
