import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit, DM_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { PostHogProvider } from "./providers/PostHogProvider";
import ReferralCaptureClient from "./components/ReferralCaptureClient";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MULUK — The Creator Platform They Were Afraid To Build",
  description:
    "Anonymous fans. Auto-split payments. Lifetime referral income. 8–12% platform fee.",
  metadataBase: new URL("https://muluk.vip"),
  openGraph: {
    title: "MULUK — The Creator Platform They Were Afraid To Build",
    description: "Anonymous fans. Auto-split payments. Lifetime referral income.",
    url: "https://muluk.vip",
    siteName: "MULUK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MULUK — The Creator Platform They Were Afraid To Build",
    description: "Anonymous fans. Auto-split payments. Lifetime referral income.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${outfit.variable} ${dmMono.variable}`}
      style={{ background: "#020203" }}
    >
      <body style={{ background: "#020203", color: "rgba(255,255,255,0.92)" }}>
        <PostHogProvider>
          <Suspense fallback={null}>
            <ReferralCaptureClient />
          </Suspense>
          {children}
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
