import { Outfit } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/autoplay";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import AppFooter from "@/layout/AppFooter";
import React from "react";

const outfit = Outfit({
  variable: "--font-outfit-sans",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} bg-white`}>
        <AuthProvider>
          <ThemeProvider>
            <SidebarProvider>
              <div className="flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
                <AppFooter />
              </div>
            </SidebarProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
