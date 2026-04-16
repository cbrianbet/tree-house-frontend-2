"use client";

import { useAuth } from "@/context/AuthContext";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import MobileSidebarTrigger from "@/layout/MobileSidebarTrigger";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import PageLoader from "@/components/ui/PageLoader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center dark:bg-gray-900">
        <PageLoader className="flex items-center justify-center" size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-full">
      <AppSidebar />
      <Backdrop />
      <div className="lg:ml-[220px]">
        <div className="p-4 mx-auto max-w-screen-2xl md:p-6">
          <MobileSidebarTrigger />
          {children}
        </div>
      </div>
    </div>
  );
}
