import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@supabase/ssr";

type Params = { params: Promise<{ slug: string }> };

interface RateCard {
  id:                 string;
  slug:               string;
  title:              string | null;
  brand_deal_price:   number;
  story_post_price:   number;
  session_price:      number;
  subscription_price: number;
  is_public:          boolean;
  view_count:         number;
  stats_snapshot:     {
    followers:        number;
    engagementRate:   number;
    nicheLabel:       string;
    contentTypeLabel: string;
  };
  created_at: string;
  profiles: {
    display_name: string | null;
    handle:       string | null;
    avatar_url:   string | null;
    bio:          string | null;
  } | null;
}

function getServiceDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function fetchCard(slug: string): Promise<RateCard | null> {
  if (!/^[a-f0-9]{12}$/.test(slug)) return null;

  const db = getServiceDb();
  const { data, error } = await db
    .from("rate_cards")
    .select(`
      id, slug, title,
      brand_deal_price, story_post_price, session_price, subscription_price,
      is_public, view_count, stats_snapshot, created_at,
      profiles ( display_name, handle, avatar_url, bio )
    `)
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as typeof data & { profiles: RateCard["profiles"] };
  return row as unknown as RateCard;
}

async function incrementRateCardViews(slug: string): Promise<void> {
  const db = getServiceDb();
  const { error } = await db.rpc("increment_rate_card_views", { p_slug: slug });
  if (error) {
    console.error("[rate-card/public] failed to increment views", { slug, error });
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const card = await fetchCard(slug);
  if (!card) return { title: "Rate Card — MULUK" };

  const creatorName = card.profiles?.display_name ?? card.profiles?.handle ?? "Creator";
  return {
    title:       `${creatorName} — Rate Card | MULUK`,
    description: `Official pricing for brand deals, sponsored posts, and sessions with ${creatorName}.`,
    robots:      { index: false, follow: false },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtUSD(cents: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    style:                 "currency",
    currency:              "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(cents / 100);
}

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function PublicRateCardPage({ params }: Params) {
  const { slug } = await params;
  const card = await fetchCard(slug);
  if (!card) notFound();
  await incrementRateCardViews(slug);

  const creatorName   = card.profiles?.display_name ?? card.profiles?.handle ?? "Creator";
  const handle        = card.profiles?.handle;
  const bio           = card.profiles?.bio;
  const snapshot      = card.stats_snapshot ?? {};
  const followers     = snapshot.followers   ?? 0;
  const engRate       = snapshot.engagementRate ?? 0;
  const nicheLabel    = snapshot.nicheLabel       ?? "—";
  const formatLabel   = snapshot.contentTypeLabel ?? "—";

  const services = [
    {
      key:         "brand_deal",
      icon:        "◈",
      label:       "Brand Deal",
      description: "Sponsored feed post or integration",
      price:       card.brand_deal_price,
      suffix:      null,
      cta:         "Inquire",
      ctaQuery:    "brand_deal",
    },
    {
      key:         "story_post",
      icon:        "◉",
      label:       "Story / Reel Post",
      description: "24-hour story or short reel mention",
      price:       card.story_post_price,
      suffix:      null,
      cta:         "Inquire",
      ctaQuery:    "story_post",
    },
    {
      key:         "session",
      icon:        "◎",
      label:       "1:1 Session",
      description: "One-hour coaching or strategy call",
      price:       card.session_price,
      suffix:      "/ session",
      cta:         "Book Now",
      ctaQuery:    "session",
    },
    {
      key:         "subscription",
      icon:        "◌",
      label:       "Monthly Membership",
      description: "Recurring fan membership access",
      price:       card.subscription_price,
      suffix:      "/ month",
      cta:         "Subscribe",
      ctaQuery:    "subscribe",
    },
  ];

  const profileBase = handle ? `/${handle}` : "#";

  return (
    <div
      style={{
        minHeight:   "100vh",
        background:  "#020203",
        fontFamily:  "var(--font-body, 'Outfit', sans-serif)",
        color:       "rgba(255,255,255,0.92)",
        position:    "relative",
        overflowX:   "hidden",
      }}
    >
      {/* Noise */}
      <div
        style={{
          position:  "fixed",
          inset:     0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.038'/%3E%3C/svg%3E\")",
          pointerEvents: "none",
          zIndex:    0,
        }}
      />

      {/* Ambient gold orb */}
      <div
        style={{
          position:     "fixed",
          top:          "-20vh",
          left:         "50%",
          transform:    "translateX(-50%)",
          width:        "60vw",
          height:       "60vw",
          maxWidth:     700,
          maxHeight:    700,
          borderRadius: "50%",
          background:   "radial-gradient(circle, rgba(200,169,110,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex:       0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "60px 24px 80px" }}>

        {/* ── MULUK wordmark ── */}
        <div
          style={{
            textAlign:     "center",
            marginBottom:  56,
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily:    "var(--font-display, 'Cormorant Garamond', serif)",
              fontSize:      14,
              fontWeight:    400,
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color:         "rgba(200,169,110,0.5)",
              textDecoration: "none",
            }}
          >
            MULUK
          </Link>
        </div>

        {/* ── Creator identity ── */}
        <div
          style={{
            textAlign:    "center",
            marginBottom: 52,
          }}
        >
          {card.profiles?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.profiles.avatar_url}
              alt={creatorName}
              style={{
                width:        80,
                height:       80,
                borderRadius: "50%",
                border:       "2px solid rgba(200,169,110,0.2)",
                margin:       "0 auto 20px",
                display:      "block",
                objectFit:    "cover",
              }}
            />
          )}

          {!card.profiles?.avatar_url && (
            <div
              style={{
                width:          72,
                height:         72,
                borderRadius:   "50%",
                background:     "rgba(200,169,110,0.06)",
                border:         "1px solid rgba(200,169,110,0.15)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                margin:         "0 auto 20px",
                fontFamily:     "var(--font-display, 'Cormorant Garamond', serif)",
                fontSize:       28,
                fontWeight:     300,
                color:          "rgba(200,169,110,0.5)",
              }}
            >
              {creatorName.charAt(0).toUpperCase()}
            </div>
          )}

          <div
            style={{
              fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
              fontSize:      9,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color:         "#7a6030",
              marginBottom:  10,
            }}
          >
            Official Rate Card
          </div>

          <h1
            style={{
              fontFamily:    "var(--font-display, 'Cormorant Garamond', serif)",
              fontSize:      "clamp(32px, 6vw, 52px)",
              fontWeight:    300,
              letterSpacing: "-0.02em",
              margin:        "0 0 12px",
              lineHeight:    1.1,
            }}
          >
            {creatorName}
          </h1>

          {bio && (
            <p
              style={{
                fontSize:   14,
                color:      "rgba(255,255,255,0.42)",
                maxWidth:   480,
                margin:     "0 auto 20px",
                lineHeight: 1.6,
                fontWeight: 300,
              }}
            >
              {bio}
            </p>
          )}

          {/* Stats pills */}
          <div
            style={{
              display:        "flex",
              justifyContent: "center",
              gap:            10,
              flexWrap:       "wrap",
            }}
          >
            {followers > 0 && (
              <StatPill label="Followers" value={fmtFollowers(followers)} />
            )}
            {engRate > 0 && (
              <StatPill label="Eng. Rate" value={`${Number(engRate).toFixed(1)}%`} />
            )}
            {nicheLabel !== "—" && (
              <StatPill label="Niche" value={nicheLabel} />
            )}
            {formatLabel !== "—" && (
              <StatPill label="Format" value={formatLabel} />
            )}
          </div>
        </div>

        {/* ── Divider ── */}
        <div
          style={{
            height:       1,
            background:   "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
            marginBottom: 40,
          }}
        />

        {/* ── Services grid ── */}
        <div
          style={{
            display:             "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap:                 16,
            marginBottom:        48,
          }}
        >
          {services.map((svc, i) => (
            <div
              key={svc.key}
              style={{
                background:    "#0f0f1e",
                border:        "1px solid rgba(255,255,255,0.055)",
                borderRadius:  12,
                padding:       "28px 26px",
                position:      "relative",
                overflow:      "hidden",
                animation:     `fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.07}s both`,
                display:       "flex",
                flexDirection: "column",
              }}
            >
              {/* Top shimmer */}
              <div
                style={{
                  position:   "absolute",
                  top:        0,
                  left:       "15%",
                  right:      "15%",
                  height:     1,
                  background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.35), transparent)",
                }}
              />

              {/* Icon + label */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span
                  style={{
                    fontSize:       20,
                    color:          "rgba(200,169,110,0.45)",
                    lineHeight:     1,
                  }}
                >
                  {svc.icon}
                </span>
                <div>
                  <div
                    style={{
                      fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                      fontSize:      9,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color:         "rgba(255,255,255,0.4)",
                    }}
                  >
                    {svc.label}
                  </div>
                </div>
              </div>

              <p
                style={{
                  fontSize:    12,
                  color:       "rgba(255,255,255,0.32)",
                  margin:      "0 0 20px",
                  lineHeight:  1.5,
                  fontWeight:  300,
                  flex:        1,
                }}
              >
                {svc.description}
              </p>

              {/* Price */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
                <span
                  style={{
                    fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                    fontSize:      34,
                    fontWeight:    400,
                    letterSpacing: "-0.03em",
                    color:         "rgba(255,255,255,0.92)",
                    lineHeight:    1,
                  }}
                >
                  {fmtUSD(svc.price, svc.key === "subscription" ? 2 : 0)}
                </span>
                {svc.suffix && (
                  <span
                    style={{
                      fontSize:   12,
                      color:      "rgba(255,255,255,0.3)",
                      fontWeight: 300,
                    }}
                  >
                    {svc.suffix}
                  </span>
                )}
              </div>

              {/* CTA */}
              {handle ? (
                <a
                  href={`${profileBase}?inquiry=${svc.ctaQuery}`}
                  style={{
                    display:         "block",
                    textAlign:       "center",
                    padding:         "12px",
                    background:      svc.key === "subscription"
                      ? "#c8a96e"
                      : "rgba(200,169,110,0.07)",
                    color:           svc.key === "subscription"
                      ? "#0a0800"
                      : "#c8a96e",
                    border:          svc.key === "subscription"
                      ? "none"
                      : "1px solid rgba(200,169,110,0.2)",
                    borderRadius:    3,
                    fontFamily:      "var(--font-mono, 'DM Mono', monospace)",
                    fontSize:        10,
                    letterSpacing:   "0.18em",
                    textTransform:   "uppercase",
                    textDecoration:  "none",
                    transition:      "opacity 0.2s",
                    cursor:          "pointer",
                  }}
                >
                  {svc.cta}
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "12px",
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.35)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 3,
                    fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    cursor: "not-allowed",
                  }}
                >
                  {svc.cta}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            textAlign:  "center",
            borderTop:  "1px solid rgba(255,255,255,0.045)",
            paddingTop: 32,
          }}
        >
          <p
            style={{
              fontSize:   12,
              color:      "rgba(255,255,255,0.2)",
              margin:     "0 0 14px",
              fontWeight: 300,
            }}
          >
            Prices shown are starting rates. Final pricing may vary based on deliverables and timeline.
          </p>
          <a
            href="https://muluk.vip"
            style={{
              fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
              fontSize:      9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color:         "rgba(200,169,110,0.3)",
              textDecoration: "none",
            }}
          >
            Powered by MULUK
          </a>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background:   "rgba(255,255,255,0.03)",
        border:       "1px solid rgba(255,255,255,0.07)",
        borderRadius: 100,
        padding:      "6px 14px",
        display:      "flex",
        alignItems:   "center",
        gap:          8,
      }}
    >
      <span
        style={{
          fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
          fontSize:      9,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color:         "rgba(255,255,255,0.28)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
          fontSize:      10,
          letterSpacing: "0.08em",
          color:         "rgba(255,255,255,0.65)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
