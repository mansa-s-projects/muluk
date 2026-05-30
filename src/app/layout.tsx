import type { Metadata } from "next";
import { Playfair_Display, Manrope } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GC Sovereign AI",
  description:
    "AI Transformation Advisory for Dubai and GCC companies.",
  metadataBase: new URL("https://gcsovereign.ai"),
  openGraph: {
    title: "GC Sovereign AI",
    description: "AI Operating System installations for measurable executive outcomes.",
    url: "https://gcsovereign.ai",
    siteName: "GC Sovereign AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GC Sovereign AI",
    description: "AI Transformation Advisory for Dubai and GCC companies.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${manrope.variable}`}>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
