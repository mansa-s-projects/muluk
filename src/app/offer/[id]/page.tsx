import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils/formatPrice";
import BuyButton from "./BuyButton";

// ─── Types ────────────────────────────────────────────────────────────────────

type Offer = {
  id: string;
  title: string;
  description: string | null;
  price_label: string | null;
  thumbnail_url: string | null;
  preview_content: string | null;
  unlock_content: string | null;
  whop_link: string | null;
  status: string;
};

type PageProps = { params: Promise<{ id: string }> };

// ─── Data fetch (cached so generateMetadata + page share one DB call) ─────────

const fetchOffer = cache(async (id: string): Promise<Offer | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("offers")
    .select("id, title, description, price_label, thumbnail_url, preview_content, unlock_content, whop_link, status")
    .eq("id", id)
    .eq("status", "published")   // RLS: public_read_published_offers enforces this server-side too
    .single();

  if (error || !data) return null;
  return data as Offer;
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const offer = await fetchOffer(id);
  if (!offer) return { title: "Offer Not Found — MULUK" };
  return {
    title: `${offer.title} — MULUK`,
    description: offer.description ?? "Exclusive offer — available now.",
    openGraph: offer.thumbnail_url
      ? { images: [{ url: offer.thumbnail_url }] }
      : undefined,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OfferPage({ params }: PageProps) {
  const { id } = await params;
  const offer = await fetchOffer(id);
  if (!offer) notFound();

  // Check if the current user has an unlock record for this offer
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ── Debug: log to server terminal ─────────────────────────────────────────
  console.log("[offer-page] offer.id  =", offer.id);
  console.log("[offer-page] user.id   =", user?.id ?? "null (not logged in)");

  let hasUnlock = false;
  if (user) {
    // Run the unlock check and log the raw result
    const unlockClient = await createClient();
    const { data: unlockRow, error: unlockErr } = await unlockClient
      .from("unlocks")
      .select("id")
      .eq("offer_id", offer.id)
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("[offer-page] unlock row =", unlockRow);
    console.log("[offer-page] unlock err =", unlockErr?.message ?? "none");

    hasUnlock = unlockRow !== null && !unlockErr;
  }

  console.log("[offer-page] hasUnlock =", hasUnlock);
  console.log("[offer-page] unlock_content present =", !!offer.unlock_content);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020203",
      backgroundImage: "radial-gradient(ellipse 70% 40% at 60% 0%, rgba(200,169,110,0.08), transparent)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 20px",
      fontFamily: "var(--font-body, 'Outfit', sans-serif)",
    }}>

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
      <div style={{
        width: "100%",
        maxWidth: "520px",
        background: "#0f0f1e",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "16px",
        overflow: "hidden",
        position: "relative",
      }}>

        {/* Gold top line */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.5), transparent)",
        }} />

        {/* Thumbnail */}
        {offer.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={offer.thumbnail_url}
            alt={offer.title}
            style={{
              width: "100%",
              height: "220px",
              objectFit: "cover",
              display: "block",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          />
        ) : (
          // Placeholder banner when no thumbnail
          <div style={{
            width: "100%",
            height: "140px",
            background: "linear-gradient(135deg, rgba(200,169,110,0.07), rgba(200,169,110,0.02))",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="rgba(200,169,110,0.25)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9l4-4 4 4 5-5 5 5" />
              <circle cx="8.5" cy="6.5" r="1.5" />
            </svg>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: "32px" }}>

          {/* Eyebrow */}
          <div style={{
            fontFamily: "var(--font-mono, 'DM Mono', monospace)",
            fontSize: "10px",
            letterSpacing: "0.25em",
            color: "rgba(200,169,110,0.5)",
            marginBottom: "10px",
          }}>
            EXCLUSIVE OFFER
          </div>

          {/* Title + Price row */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            marginBottom: "16px",
          }}>
            <h1 style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', serif)",
              fontSize: "clamp(26px, 5vw, 34px)",
              fontWeight: 300,
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              margin: 0,
            }}>
              {offer.title}
            </h1>

            {offer.price_label && (
              <div style={{
                fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                fontSize: "20px",
                fontWeight: 400,
                color: "var(--gold, #c8a96e)",
                flexShrink: 0,
                lineHeight: 1,
                paddingTop: "4px",
              }}>
                {formatPrice(offer.price_label)}
              </div>
            )}
          </div>

          {/* Description */}
          {offer.description && (
            <p style={{
              fontSize: "14px",
              fontWeight: 300,
              color: "rgba(255,255,255,0.48)",
              lineHeight: 1.75,
              margin: "0 0 24px",
            }}>
              {offer.description}
            </p>
          )}

          {/* Preview content */}
          {offer.preview_content && (
            <div style={{
              padding: "16px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 300,
              color: "rgba(255,255,255,0.40)",
              lineHeight: 1.7,
              marginBottom: "24px",
              whiteSpace: "pre-wrap",
            }}>
              {offer.preview_content}
            </div>
          )}

          {/* Divider */}
          <div style={{
            height: "1px",
            background: "rgba(255,255,255,0.05)",
            margin: "8px 0 24px",
          }} />

          {hasUnlock && offer.unlock_content ? (
            /* ── Unlocked content ── */
            <>
              <div style={{
                fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                fontSize: "10px",
                letterSpacing: "0.2em",
                color: "rgba(200,169,110,0.6)",
                marginBottom: "12px",
              }}>
                UNLOCKED
              </div>
              <div style={{
                padding: "20px",
                background: "rgba(200,169,110,0.04)",
                border: "1px solid rgba(200,169,110,0.15)",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 300,
                color: "rgba(255,255,255,0.75)",
                lineHeight: 1.75,
                whiteSpace: "pre-wrap",
              }}>
                {offer.unlock_content}
              </div>
            </>
          ) : (
            /* ── Locked: show buy button ── */
            <>
              <BuyButton whopLink={offer.whop_link} offerId={offer.id} />
              <div style={{
                marginTop: "16px",
                textAlign: "center",
                fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                fontSize: "10px",
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.15)",
              }}>
                Secured by MULUK · Powered by Whop
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
