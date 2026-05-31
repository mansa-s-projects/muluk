import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit, DM_Mono } from "next/font/google";
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
  title: "Mansas Moguls — Creator Empire Platform",
  description:
    "88% payouts. Anonymous supporter codes. Crypto rails to 190 countries. The platform built for creators who operate like empires.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://mansasmoguls.com"),
  openGraph: {
    title: "Mansas Moguls",
    description: "88% payouts. Anonymous supporter codes. Crypto rails to 190 countries.",
    siteName: "Mansas Moguls",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mansas Moguls",
    description: "88% payouts. Anonymous supporter codes. Crypto rails to 190 countries.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${outfit.variable} ${dmMono.variable}`}
      style={{
        backgroundColor: "#020203",
        color: "rgba(255,255,255,0.92)",
        colorScheme: "dark",
      }}
    >
      <body
        suppressHydrationWarning
        style={{
          backgroundColor: "#020203",
          color: "rgba(255,255,255,0.92)",
          margin: 0,
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
