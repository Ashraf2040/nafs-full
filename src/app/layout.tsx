// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NAFS Preparation Portal - Master Your Assessments",
  description:
    "Comprehensive AI-powered preparation platform for NAFS assessments. Generate quizzes, track progress, and earn certificates.",
  keywords: ["NAFS", "education", "assessment", "quiz", "learning", "UAE education"],
  authors: [{ name: "NAFS Portal Team" }],
  openGraph: {
    title: "NAFS Preparation Portal",
    description: "Master the NAFS Assessment with AI-powered practice tools",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} flex flex-col min-h-screen bg-slate-50 text-slate-900`}
        suppressHydrationWarning={true}
      >
        <Providers>
          <Navbar />
          <main className="flex-grow flex flex-col">{children}</main>
          <Footer />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: "14px",
                background: "#1e293b",
                color: "#f8fafc",
                fontSize: "14px",
                fontWeight: 600,
                padding: "12px 18px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              },
              success: {
                iconTheme: { primary: "#10b981", secondary: "#f8fafc" },
                style: {
                  background: "#1e293b",
                  color: "#f8fafc",
                },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#f8fafc" },
                style: {
                  background: "#1e293b",
                  color: "#f8fafc",
                },
              },
              loading: {
                iconTheme: { primary: "#6366f1", secondary: "#f8fafc" },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
