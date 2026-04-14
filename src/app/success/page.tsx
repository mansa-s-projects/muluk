import { Suspense } from "react";
import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createUnlock } from "@/lib/unlocks";
import { formatPrice } from "@/lib/utils/formatPrice";
import { sendPurchaseEmailSequence } from "@/lib/notifications/resend";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import SuccessClient from "./SuccessClient";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

type Offer = {
  id: string;
  title: string;
  price_label: string | null;
  thumbnail_url: string | null;
  creator_id: string;
};

type NextOffer = {
  id: string;
  title: string;
  price_label: string | null;
};

type PageProps = {
  searchParams: Promise<{
    offer_id?: string;
    fan_email?: string;
  }>;
};

// ─── Data fetchers ────────────────────────────────────────────────────────────

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

async function fetchNextOffer(creatorId: string, excludeId: string): Promise<NextOffer | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offers")
    .select("id, title, price_label")
    .eq("creator_id", creatorId)
    .eq("status", "published")
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function fetchCreatorHandle(creatorId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("creator_applications")
    .select("handle")
    .eq("user_id", creatorId)
    .eq("status", "approved")
    .maybeSingle();
  return data?.handle ?? null;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Purchase Confirmed — MULUK",
  description: "Your purchase was successful.",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" };
const GOLD = "#c8a96e";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SuccessPage({ searchParams }: PageProps) {
  const { offer_id, fan_email } = await searchParams;

  const offer      = offer_id ? await fetchOffer(offer_id) : null;
  const nextOffer  = offer    ? await fetchNextOffer(offer.creator_id, offer.id) : null;
  const creatorHandle = offer ? await fetchCreatorHandle(offer.creator_id) : null;

  // Grant unlock server-side (idempotent)
  let isNewUnlock = false;
  if (offer && offer_id) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await createUnlock({ offerId: offer.id, userId: user.id });

      // Send email sequence if fan has an email
      const emailTo = user.email || fan_email;
      if (emailTo && creatorHandle) {
        const baseUrl = getBaseUrl();
        sendPurchaseEmailSequence({
          fanEmail: emailTo,
          fanName: user.user_metadata?.full_name ?? undefined,
          offerTitle: offer.title,
          amount: offer.price_label ?? "",
          accessUrl: `${baseUrl}/offer/${offer.id}`,
          creatorHandle,
          nextOfferTitle: nextOffer?.title ?? undefined,
          nextOfferUrl: nextOffer ? `${baseUrl}/offer/${nextOffer.id}` : undefined,
        }).catch((err: unknown) =>
          console.error("[success] email sequence failed:", err)
        );
        isNewUnlock = true;
      }
    }
  }
  void isNewUnlock; // used for future idempotency guard

  const nextOfferUrl = nextOffer ? `${getBaseUrl()}/offer/${nextOffer.id}` : null;
  const tipUrl       = creatorHandle ? `/tips/${creatorHandle}` : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020203",
        backgroundImage: "radial-gradient(ellipse 60% 35% at 50% 0%, rgba(200,169,110,0.09), transparent)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        fontFamily: "var(--font-body, 'Outfit', sans-serif)",
      }}
    >
      <Link
        href="/"
        style={{ ...mono, fontSize: "11px", letterSpacing: "0.35em", color: "rgba(200,169,110,0.45)", textDecoration: "none", marginBottom: "44px", display: "block" }}
      >
        MULUK
      </Link>

      {/* ── Confirmation card ─────────────────────────────────────────── */}
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
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.6), transparent)" }} />

        <div style={{ padding: "44px 36px 40px" }}>
          {/* Check icon */}
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(200,169,110,0.1)", border: "1px solid rgba(200,169,110,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "28px" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="rgba(200,169,110,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.25em", color: "rgba(200,169,110,0.5)", marginBottom: "12px" }}>
            PURCHASE CONFIRMED
          </div>

          <h1 style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', serif)", fontSize: "clamp(28px,5vw,38px)", fontWeight: 300, color: "rgba(255,255,255,0.92)", lineHeight: 1.15, letterSpacing: "-0.01em", margin: "0 0 14px" }}>
            {offer ? offer.title : "Thank you"}
          </h1>

          <p style={{ fontSize: "14px", fontWeight: 300, color: "rgba(255,255,255,0.42)", lineHeight: 1.75, margin: "0 0 32px" }}>
            Your payment was processed. Access your content below.
          </p>

          {offer?.price_label && (
            <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", marginBottom: "28px" }} />
          )}

          {offer?.price_label && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", ...mono, fontSize: "11px", letterSpacing: "0.12em" }}>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>AMOUNT PAID</span>
              <span style={{ color: "rgba(200,169,110,0.85)" }}>{formatPrice(offer.price_label)}</span>
            </div>
          )}

          {/* Primary CTA */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {offer_id && (
              <Link
                href={`/offer/${offer_id}`}
                style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", padding: "14px 24px", background: GOLD, borderRadius: "8px", color: "#0a0800", ...mono, fontSize: "11px", letterSpacing: "0.2em", fontWeight: 600, textDecoration: "none", boxSizing: "border-box" as const }}
              >
                ACCESS YOUR PURCHASE →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Upsell section ────────────────────────────────────────────── */}
      {(nextOffer || tipUrl) && (
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            marginTop: "16px",
            background: "#0f0f1e",
            border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: "16px",
            padding: "28px 36px",
          }}
        >
          <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", color: "rgba(255,255,255,0.2)", marginBottom: "20px" }}>
            YOU MIGHT ALSO LIKE
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {nextOffer && nextOfferUrl && (
              <Link
                href={nextOfferUrl}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  background: "rgba(200,169,110,0.05)",
                  border: "1px solid rgba(200,169,110,0.15)",
                  borderRadius: "10px",
                  textDecoration: "none",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.82)", marginBottom: "3px" }}>{nextOffer.title}</div>
                  {nextOffer.price_label && (
                    <div style={{ ...mono, fontSize: "10px", color: GOLD }}>{formatPrice(nextOffer.price_label)}</div>
                  )}
                </div>
                <span style={{ ...mono, fontSize: "14px", color: "rgba(200,169,110,0.5)", flexShrink: 0 }}>→</span>
              </Link>
            )}

            {creatorHandle && (
              <Link
                href={`/@${creatorHandle}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  textDecoration: "none",
                  gap: "12px",
                }}
              >
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
                  See everything from @{creatorHandle}
                </div>
                <span style={{ ...mono, fontSize: "14px", color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>→</span>
              </Link>
            )}

            {tipUrl && (
              <Link
                href={tipUrl}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px 20px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  textDecoration: "none",
                  ...mono,
                  fontSize: "10px",
                  letterSpacing: "0.15em",
                  color: "rgba(255,255,255,0.25)",
                  textTransform: "uppercase" as const,
                }}
              >
                Leave a tip
              </Link>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: "24px", ...mono, fontSize: "10px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.12)" }}>
        Secured by MULUK · Powered by Whop
      </div>

      <Suspense fallback={null}>
        <SuccessClient offerId={offer_id ?? null} />
      </Suspense>
    </div>
  );
}
