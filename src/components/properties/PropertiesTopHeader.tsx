"use client";

import React from "react";
import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
};

export default function PropertiesTopHeader({
  crumbs,
  rightActions,
}: {
  crumbs: Crumb[];
  rightActions?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-40 -mx-6 -mt-6 border-b border-black/10 bg-white px-6 py-3">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
          {crumbs.map((crumb, idx) => (
            <React.Fragment key={`${crumb.label}-${idx}`}>
              {idx > 0 ? <span>/</span> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-[#0F6E56]">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-[#1A1A1A]">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
        {rightActions ? <div className="flex items-center gap-2">{rightActions}</div> : null}
      </div>
    </div>
  );
}
