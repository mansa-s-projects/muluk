import { Suspense } from "react";
import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createUnlock } from "@/lib/unlocks";
import { formatPrice } from "@/lib/utils/formatPrice";
import SuccessClient from "./SuccessClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type Offer = {
  id: string;
  title: string;
  price_label: string | null;
  thumbnail_url: string | null;
  creator_id: string;
};

type PageProps = { searchParams: Promise<{ offer_id?: string }> };

// ─── Data fetch ───────────────────────────────────────────────────────────────

const fetchOffer = cache(async (id: string): Promise<Offer | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("id, title, price_label, thumbnail_url, creator_id")
    .eq("id", id)
    .eq("status", "published")
    .single();
  if (error || !data) return null;
  return data as Offer;
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Purchase Confirmed — MULUK",
  description: "Your purchase was successful.",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SuccessPage({ searchParams }: PageProps) {
  const { offer_id } = await searchParams;

  const offer = offer_id ? await fetchOffer(offer_id) : null;

  // If the user is logged in and we have a valid offer, grant unlock server-side.
  // createUnlock is idempotent — UNIQUE(offer_id, user_id) prevents duplicates.
  if (offer && offer_id) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await createUnlock({
        offerId: offer.id,
        userId:  user.id,
      });
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020203",
        backgroundImage:
          "radial-gradient(ellipse 60% 35% at 50% 0%, rgba(200,169,110,0.09), transparent)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        fontFamily: "var(--font-body, 'Outfit', sans-serif)",
      }}
    >
      {/* Wordmark */}
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-mono, 'DM Mono', monospace)",
          fontSize: "11px",
          letterSpacing: "0.35em",
          color: "rgba(200,169,110,0.45)",
          textDecoration: "none",
          marginBottom: "44px",
          display: "block",
        }}
      >
        MULUK
      </Link>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#0f0f1e",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Gold top line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(200,169,110,0.6), transparent)",
          }}
        />

        <div style={{ padding: "44px 36px 40px" }}>
          {/* Check icon */}
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "rgba(200,169,110,0.1)",
              border: "1px solid rgba(200,169,110,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "28px",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="rgba(200,169,110,0.85)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Eyebrow */}
          <div
            style={{
              fontFamily: "var(--font-mono, 'DM Mono', monospace)",
              fontSize: "10px",
              letterSpacing: "0.25em",
              color: "rgba(200,169,110,0.5)",
              marginBottom: "12px",
            }}
          >
            PURCHASE CONFIRMED
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', serif)",
              fontSize: "clamp(28px, 5vw, 38px)",
              fontWeight: 300,
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              margin: "0 0 14px",
            }}
          >
            {offer ? offer.title : "Thank you"}
          </h1>

          {/* Sub-copy */}
          <p
            style={{
              fontSize: "14px",
              fontWeight: 300,
              color: "rgba(255,255,255,0.42)",
              lineHeight: 1.75,
              margin: "0 0 32px",
            }}
          >
            Your payment was processed successfully. Check your email for access
            details, or visit your Whop dashboard to access your purchase.
          </p>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              background: "rgba(255,255,255,0.05)",
              marginBottom: "28px",
            }}
          />

          {/* Meta row */}
          {offer?.price_label && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "28px",
                fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                fontSize: "11px",
                letterSpacing: "0.12em",
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.2)" }}>AMOUNT PAID</span>
              <span style={{ color: "rgba(200,169,110,0.85)" }}>
                {formatPrice(offer.price_label)}
              </span>
            </div>
          )}

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {offer_id && (
              <Link
                href={`/offer/${offer_id}`}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 24px",
                  background: "var(--gold, #c8a96e)",
                  borderRadius: "8px",
                  color: "#0a0800",
                  fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                  fontSize: "11px",
                  letterSpacing: "0.2em",
                  fontWeight: 600,
                  textDecoration: "none",
                  boxSizing: "border-box" as const,
                }}
              >
                VIEW OFFER →
              </Link>
            )}
            <Link
              href="/dashboard"
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                padding: "13px 24px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "8px",
                color: "rgba(255,255,255,0.4)",
                fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                fontSize: "11px",
                letterSpacing: "0.2em",
                fontWeight: 600,
                textDecoration: "none",
                boxSizing: "border-box" as const,
              }}
            >
              GO TO DASHBOARD
            </Link>
          </div>
        </div>
      </div>

      {/* Trust line */}
      <div
        style={{
          marginTop: "24px",
          fontFamily: "var(--font-mono, 'DM Mono', monospace)",
          fontSize: "10px",
          letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.12)",
        }}
      >
        Secured by MULUK · Powered by Whop
      </div>

      {/* Client component: logs unlock event (fire-and-forget) */}
      <Suspense fallback={null}>
        <SuccessClient offerId={offer_id ?? null} />
      </Suspense>
    </div>
  );
}
