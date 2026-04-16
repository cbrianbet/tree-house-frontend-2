import { ThemeProvider } from "@/context/ThemeContext";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-white dark:bg-gray-900">
      <ThemeProvider>{children}</ThemeProvider>
    </div>
  );
}
