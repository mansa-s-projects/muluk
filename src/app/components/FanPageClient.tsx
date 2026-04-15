"use client";

import { useEffect, useMemo, useState } from "react";

type Creator = {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  category: string | null;
  tier: string;
  phantom_mode: boolean;
  created_at: string;
  avatar_url: string | null;
  banner_url: string | null;
  website: string | null;
  location: string | null;
};

type ContentItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  whop_checkout_url: string | null;
  whop_product_id: string | null;
  preview_url: string | null;
  file_url: string | null;
  created_at: string;
};

type SocialConnection = {
  platform: string | null;
  username: string | null;
  url: string | null;
};

type SubscriptionOffer = {
  id: string;
  title: string;
  price_label: string | null;
  description: string | null;
  whop_link: string | null;
};

type Props = {
  creator: Creator;
  contentItems: ContentItem[];
  fanCount: number;
  socialConnections: SocialConnection[];
  initialPaymentSuccess: boolean;
  initialCode?: string;
  subscriptionOffers?: SubscriptionOffer[];
};

const FAN_CODE_RE = /^FAN-[A-Z2-9]{10}$/;

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function monthYear(dateRaw: string) {
  const dt = new Date(dateRaw);
  if (Number.isNaN(dt.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(dt);
}

function tierStyle(tierRaw: string) {
  const tier = tierRaw.toLowerCase();
  if (tier === "apex") {
    return {
      label: "EMPEROR — INVITATION ONLY",
      color: "#e05555",
      border: "rgba(224,85,85,0.4)",
      bg: "rgba(224,85,85,0.08)",
    };
  }

  if (tier === "legend") {
    return {
      label: "KING",
      color: "#c8a96e",
      border: "rgba(200,169,110,0.35)",
      bg: "rgba(200,169,110,0.08)",
    };
  }

  return {
    label: "PRINCE",
    color: "rgba(255,255,255,0.82)",
    border: "rgba(255,255,255,0.18)",
    bg: "rgba(255,255,255,0.04)",
  };
}

function platformGlyph(platformRaw: string | null) {
  const platform = (platformRaw ?? "").toLowerCase();
  if (platform.includes("twitter") || platform === "x") return "X";
  if (platform.includes("instagram")) return "IG";
  if (platform.includes("tiktok")) return "TT";
  if (platform.includes("youtube")) return "YT";
  if (platform.includes("telegram")) return "TG";
  return "SOC";
}

export default function FanPageClient({
  creator,
  contentItems,
  fanCount,
  socialConnections,
  initialPaymentSuccess,
  initialCode,
  subscriptionOffers = [],
}: Props) {
  const tier = tierStyle(creator.tier);

  const lowestItem = useMemo(() => {
    if (!contentItems.length) return null;
    return [...contentItems].sort((a, b) => a.price - b.price)[0];
  }, [contentItems]);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(lowestItem?.id ?? null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(lowestItem?.whop_checkout_url ?? null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [mainCodeInput, setMainCodeInput] = useState("");
  const [phantomCodeInput, setPhantomCodeInput] = useState("");
  const [inlineCodeVisible, setInlineCodeVisible] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [phantomShake, setPhantomShake] = useState(false);

  const [showPhantomGate, setShowPhantomGate] = useState(Boolean(creator.phantom_mode));

  useEffect(() => {
    if (initialPaymentSuccess && initialCode && FAN_CODE_RE.test(initialCode.toUpperCase())) {
      const normalized = initialCode.toUpperCase();
      setVerifiedCode(normalized);
      setIsUnlocked(true);
      setShowSuccessOverlay(true);
      setShowPhantomGate(false);
    }
  }, [initialPaymentSuccess, initialCode]);

  // Presence ping — keeps the fan "online" in the admin view while they're on the page
  useEffect(() => {
    if (!verifiedCode) return;
    const ping = () => {
      fetch("/api/fan/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifiedCode }),
      }).catch(() => {});
    };
    ping(); // immediate ping on unlock
    const id = setInterval(ping, 2 * 60 * 1000); // every 2 minutes
    return () => clearInterval(id);
  }, [verifiedCode]);

  useEffect(() => {
    if (!contentItems.length) {
      setSelectedContentId(null);
      setPaymentUrl(null);
      return;
    }

    setSelectedContentId((prev) => {
      if (prev && contentItems.some((item) => item.id === prev)) {
        return prev;
      }
      return lowestItem?.id ?? contentItems[0]?.id ?? null;
    });
  }, [contentItems, lowestItem]);

  const selectedItem = useMemo(() => {
    if (!selectedContentId) return lowestItem;
    return contentItems.find((item) => item.id === selectedContentId) ?? lowestItem;
  }, [contentItems, lowestItem, selectedContentId]);

  useEffect(() => {
    setPaymentUrl(selectedItem?.whop_checkout_url ?? null);
  }, [selectedItem]);

  const verifyCode = async (rawCode: string, source: "phantom" | "hero") => {
    const code = rawCode.trim().toUpperCase();

    if (!FAN_CODE_RE.test(code)) {
      setVerifyError("Invalid code format.");
      if (source === "phantom") {
        setPhantomShake(true);
        window.setTimeout(() => setPhantomShake(false), 420);
      }
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);

    try {
      const res = await fetch(`/api/v2/unlock/${encodeURIComponent(code)}`);
      const json = await res.json();

      const unlockContentId = json?.data?.content?.id as string | undefined;
      const isPaid = Boolean(json?.data?.fanCode?.is_paid);
      const belongsToCreator = Boolean(
        unlockContentId && contentItems.some((item) => item.id === unlockContentId)
      );

      if (!res.ok || !isPaid || !belongsToCreator) {
        setVerifyError(json?.error || "Invalid code for this creator.");
        if (source === "phantom") {
          setPhantomShake(true);
          window.setTimeout(() => setPhantomShake(false), 420);
        }
        return;
      }

      setVerifiedCode(code);
      setIsUnlocked(true);
      setShowPhantomGate(false);
      setShowSuccessOverlay(true);
      setPhantomCodeInput("");
      setMainCodeInput("");
    } catch {
      setVerifyError("Failed to verify code.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const loadPaymentInit = async (contentId: string | null) => {
    if (!contentId) {
      setPaymentUrl(null);
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await fetch("/api/whop-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId }),
      });

      if (!res.ok) {
        setPaymentUrl(selectedItem?.whop_checkout_url ?? null);
        return;
      }

      const json = await res.json();
      const remoteUrl =
        json?.checkout_url ||
        json?.data?.checkout_url ||
        json?.whop_checkout_url ||
        null;

      if (remoteUrl && typeof remoteUrl === "string") {
        setPaymentUrl(remoteUrl);
      }
    } catch {
      setPaymentUrl(selectedItem?.whop_checkout_url ?? null);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!verifiedCode) return;
    try {
      await navigator.clipboard.writeText(verifiedCode);
    } catch {
      // No-op
    }
  };

  const tweetUrl = verifiedCode
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just unlocked @${creator.handle} on MULUK with ${verifiedCode}`)}`
    : "https://twitter.com/intent/tweet";

  return (
    <>
      <style jsx global>{`
        @keyframes phantomShake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-7px); }
          40% { transform: translateX(7px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
          100% { transform: translateX(0); }
        }

        @keyframes codeShimmer {
          0% { background-position: -300px 0; }
          100% { background-position: 300px 0; }
        }

        .fan-page-layout {
          display: grid;
          grid-template-columns: 1.1fr minmax(280px, 380px);
          gap: 28px;
          align-items: start;
        }

        .subscribe-sticky {
          position: sticky;
          top: 24px;
        }

        .content-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        @media (max-width: 1020px) {
          .fan-page-layout {
            grid-template-columns: 1fr;
          }

          .subscribe-sticky {
            position: static;
          }

          .content-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {showPhantomGate && (
        <div
          style={{
            minHeight: "100vh",
            background: "#020203",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 20px",
          }}
        >
          <div
            className={phantomShake ? "phantom-shake" : undefined}
            style={{
              width: "100%",
              maxWidth: 560,
              border: "1px solid rgba(200,169,110,0.18)",
              borderRadius: 12,
              background: "linear-gradient(180deg, #09090f 0%, #07070d 100%)",
              padding: "42px 32px 28px",
              textAlign: "center",
              animation: phantomShake ? "phantomShake 0.42s ease" : undefined,
            }}
          >
            <div style={{ fontSize: 36, color: "rgba(200,169,110,0.35)" }}>👻</div>
            <div
              style={{
                fontFamily: "var(--font-display), serif",
                fontSize: 72,
                color: "rgba(200,169,110,0.9)",
                lineHeight: 1,
                marginTop: 8,
              }}
            >
              🔒
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display), serif",
                fontWeight: 300,
                fontStyle: "italic",
                fontSize: "clamp(36px,7vw,56px)",
                color: "#c8a96e",
                marginTop: 10,
              }}
            >
              In the Shadows
            </h1>
            <p
              style={{
                fontFamily: "var(--font-body), sans-serif",
                color: "rgba(255,255,255,0.58)",
                fontWeight: 300,
                lineHeight: 1.8,
                marginTop: 12,
              }}
            >
              This creator is in Phantom Mode.
              <br />
              Their page is private by invitation only.
            </p>
            <p
              style={{
                marginTop: 18,
                fontFamily: "var(--font-mono), monospace",
                fontSize: 10,
                letterSpacing: "0.22em",
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
              }}
            >
              MULUK - PHANTOM MODE ACTIVE
            </p>

            <div style={{ marginTop: 28 }}>
              <p
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.32)",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Have an access code? Enter it:
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void verifyCode(phantomCodeInput, "phantom");
                }}
                style={{ display: "flex", gap: 8, justifyContent: "center" }}
              >
                <input
                  value={phantomCodeInput}
                  onChange={(e) => {
                    setPhantomCodeInput(e.target.value.toUpperCase());
                    setVerifyError(null);
                  }}
                  placeholder="FAN-XXXXXXXXXX"
                  maxLength={14}
                  style={{
                    width: 240,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 4,
                    padding: "10px 12px",
                    color: "rgba(255,255,255,0.9)",
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 13,
                    letterSpacing: "0.08em",
                  }}
                />
                <button
                  disabled={verifyLoading}
                  style={{
                    background: "#c8a96e",
                    color: "#0b0802",
                    border: "none",
                    borderRadius: 4,
                    padding: "0 14px",
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 10,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {verifyLoading ? "Checking" : "Unlock ->"}
                </button>
              </form>
              {verifyError && (
                <p
                  style={{
                    marginTop: 10,
                    color: "#e05555",
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                  }}
                >
                  {verifyError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!showPhantomGate && (
        <div style={{ minHeight: "100vh", background: "#020203", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(1000px 380px at 15% 8%, rgba(200,169,110,0.16) 0%, rgba(200,169,110,0.02) 35%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          <main style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 20px 80px", position: "relative", zIndex: 2 }}>
            <section className="fan-page-layout">
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 10,
                    letterSpacing: "0.26em",
                    textTransform: "uppercase",
                    color: "#8a7048",
                    marginBottom: 18,
                  }}
                >
                  MULUK CREATOR
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 18,
                    color: "#c8a96e",
                    letterSpacing: "0.08em",
                  }}
                >
                  @{creator.handle}
                </div>
                <h1
                  style={{
                    marginTop: 8,
                    fontFamily: "var(--font-display), serif",
                    fontWeight: 300,
                    fontSize: "clamp(40px,6vw,54px)",
                    lineHeight: 1.02,
                    color: "rgba(255,255,255,0.95)",
                  }}
                >
                  {creator.name}
                </h1>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: 9,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      border: `1px solid ${tier.border}`,
                      color: tier.color,
                      background: tier.bg,
                      borderRadius: 999,
                      padding: "5px 10px",
                    }}
                  >
                    {tier.label}
                  </span>

                  {creator.category && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: 9,
                        letterSpacing: "0.17em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.36)",
                      }}
                    >
                      {creator.category.toUpperCase()}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    marginTop: 20,
                    maxWidth: 700,
                    fontFamily: "var(--font-body), sans-serif",
                    fontWeight: 300,
                    fontSize: 16,
                    lineHeight: 1.8,
                    color: "rgba(255,255,255,0.52)",
                  }}
                >
                  {creator.bio || "Exclusive content for my fans."}
                </p>

                <div
                  style={{
                    marginTop: 20,
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 10,
                    color: "rgba(255,255,255,0.34)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <span>◈ {fanCount} fans</span>
                  <span>·</span>
                  <span>◇ Member since {monthYear(creator.created_at)}</span>
                </div>

                {socialConnections.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
                    {socialConnections.map((s, idx) => (
                      <a
                        key={`${s.platform ?? "social"}-${idx}`}
                        href={s.url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          minWidth: 36,
                          height: 28,
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "rgba(255,255,255,0.7)",
                          textDecoration: "none",
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: 10,
                          letterSpacing: "0.08em",
                          padding: "0 8px",
                        }}
                      >
                        {platformGlyph(s.platform)}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <aside className="subscribe-sticky">
                <div
                  style={{
                    background: "#0f0f1e",
                    border: "1px solid rgba(200,169,110,0.34)",
                    borderRadius: 10,
                    padding: 24,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      color: "rgba(255,255,255,0.35)",
                      textTransform: "uppercase",
                    }}
                  >
                    Exclusive Access
                  </p>

                  <div style={{ marginTop: 14 }}>
                    <p
                      style={{
                        fontFamily: "var(--font-display), serif",
                        fontSize: 56,
                        fontWeight: 300,
                        lineHeight: 1,
                        color: "#c8a96e",
                      }}
                    >
                      {lowestItem ? formatPrice(lowestItem.price, lowestItem.currency) : "$0"}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: 10,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.28)",
                      }}
                    >
                      One-time unlock - anonymous
                    </p>
                  </div>

                  <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
                    {[
                      "🔒 No account needed",
                      "⚡ Instant access",
                      "👤 100% anonymous",
                    ].map((pill) => (
                      <div
                        key={pill}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 999,
                          padding: "7px 10px",
                          fontFamily: "var(--font-body), sans-serif",
                          fontWeight: 300,
                          fontSize: 13,
                          color: "rgba(255,255,255,0.7)",
                        }}
                      >
                        {pill}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setShowPaymentModal(true);
                      setSelectedContentId(lowestItem?.id ?? null);
                      void loadPaymentInit(lowestItem?.id ?? null);
                    }}
                    style={{
                      marginTop: 16,
                      width: "100%",
                      border: "none",
                      borderRadius: 4,
                      background: "#c8a96e",
                      color: "#0a0800",
                      height: 46,
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    Get Access {"->"}
                  </button>

                  <div style={{ marginTop: 14 }}>
                    <button
                      onClick={() => setInlineCodeVisible((v) => !v)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "rgba(255,255,255,0.45)",
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Enter fan code
                    </button>

                    {inlineCodeVisible && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void verifyCode(mainCodeInput, "hero");
                        }}
                        style={{ display: "flex", gap: 8, marginTop: 8 }}
                      >
                        <input
                          value={mainCodeInput}
                          onChange={(e) => {
                            setMainCodeInput(e.target.value.toUpperCase());
                            setVerifyError(null);
                          }}
                          placeholder="FAN-XXXXXXXXXX"
                          maxLength={14}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 4,
                            color: "rgba(255,255,255,0.9)",
                            padding: "10px 10px",
                            fontFamily: "var(--font-mono), monospace",
                            fontSize: 12,
                            letterSpacing: "0.08em",
                          }}
                        />
                        <button
                          disabled={verifyLoading}
                          style={{
                            border: "1px solid rgba(200,169,110,0.35)",
                            background: "transparent",
                            color: "#c8a96e",
                            borderRadius: 4,
                            padding: "0 10px",
                            fontFamily: "var(--font-mono), monospace",
                            fontSize: 10,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          Unlock
                        </button>
                      </form>
                    )}

                    {verifyError && (
                      <p
                        style={{
                          marginTop: 8,
                          color: "#e05555",
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: 10,
                          letterSpacing: "0.06em",
                        }}
                      >
                        {verifyError}
                      </p>
                    )}
                  </div>
                </div>
              </aside>
            </section>

            <section style={{ marginTop: 54 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.26em",
                  textTransform: "uppercase",
                  color: "#8a7048",
                  marginBottom: 16,
                }}
              >
                Exclusive Content
              </div>

              {contentItems.length === 0 ? (
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    background: "#0f0f1e",
                    padding: "36px 20px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    No content yet.
                  </p>
                  <p style={{ marginTop: 6, color: "rgba(255,255,255,0.28)" }}>
                    This creator is setting up. Check back soon.
                  </p>
                </div>
              ) : (
                <div className="content-grid">
                  {contentItems.map((item) => {
                    const statusLabel = isUnlocked ? "UNLOCKED" : "LOCKED";
                    return (
                      <article
                        key={item.id}
                        style={{
                          border: `1px solid ${isUnlocked ? "rgba(80,212,138,0.28)" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 10,
                          overflow: "hidden",
                          background: "#0f0f1e",
                        }}
                      >
                        <div
                          style={{
                            height: 180,
                            position: "relative",
                            background: item.preview_url
                              ? `url(${item.preview_url}) center/cover`
                              : "linear-gradient(140deg, #111122 0%, #0a0a13 100%)",
                          }}
                        >
                          {!isUnlocked && (
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                backdropFilter: "blur(8px)",
                                background: "rgba(2,2,3,0.35)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#c8a96e",
                                fontSize: 24,
                              }}
                            >
                              🔒
                            </div>
                          )}
                          <span
                            style={{
                              position: "absolute",
                              right: 10,
                              top: 10,
                              borderRadius: 999,
                              background: "rgba(200,169,110,0.12)",
                              border: "1px solid rgba(200,169,110,0.35)",
                              color: "#c8a96e",
                              fontFamily: "var(--font-mono), monospace",
                              fontSize: 10,
                              letterSpacing: "0.1em",
                              padding: "4px 8px",
                            }}
                          >
                            {formatPrice(item.price, item.currency)}
                          </span>
                        </div>

                        <div style={{ padding: 16 }}>
                          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontFamily: "var(--font-mono), monospace",
                                fontSize: 8,
                                letterSpacing: "0.16em",
                                textTransform: "uppercase",
                                borderRadius: 999,
                                border: "1px solid rgba(200,169,110,0.35)",
                                color: "#c8a96e",
                                background: "rgba(200,169,110,0.09)",
                                padding: "4px 8px",
                              }}
                            >
                              unlock
                            </span>

                            <span
                              style={{
                                fontFamily: "var(--font-mono), monospace",
                                fontSize: 8,
                                letterSpacing: "0.16em",
                                textTransform: "uppercase",
                                borderRadius: 999,
                                border: `1px solid ${isUnlocked ? "rgba(80,212,138,0.35)" : "rgba(255,255,255,0.2)"}`,
                                color: isUnlocked ? "#50d48a" : "rgba(255,255,255,0.5)",
                                background: isUnlocked ? "rgba(80,212,138,0.10)" : "rgba(255,255,255,0.05)",
                                padding: "4px 8px",
                              }}
                            >
                              {isUnlocked ? "✓ unlocked" : statusLabel.toLowerCase()}
                            </span>
                          </div>

                          <h3
                            style={{
                              fontFamily: "var(--font-body), sans-serif",
                              fontSize: 14,
                              fontWeight: 500,
                              lineHeight: 1.45,
                              color: "rgba(255,255,255,0.92)",
                              minHeight: 42,
                            }}
                          >
                            {item.title}
                          </h3>

                          <button
                            onClick={() => {
                              if (isUnlocked && verifiedCode) {
                                window.location.href = `/unlock/${verifiedCode}`;
                                return;
                              }
                              setShowPaymentModal(true);
                              setSelectedContentId(item.id);
                              void loadPaymentInit(item.id);
                            }}
                            style={{
                              marginTop: 12,
                              width: "100%",
                              height: 38,
                              borderRadius: 4,
                              border: `1px solid ${isUnlocked ? "rgba(200,169,110,0.55)" : "rgba(200,169,110,0.35)"}`,
                              background: isUnlocked ? "rgba(200,169,110,0.16)" : "transparent",
                              color: "#c8a96e",
                              fontFamily: "var(--font-mono), monospace",
                              fontSize: 10,
                              letterSpacing: "0.15em",
                              textTransform: "uppercase",
                              cursor: "pointer",
                            }}
                          >
                            {isUnlocked ? "View Content ->" : `Unlock for ${formatPrice(item.price, item.currency)}`}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </main>

          <footer
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              padding: "18px 20px 22px",
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 8,
              color: "rgba(255,255,255,0.26)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            <span>MULUK</span>
            <span style={{ color: "#c8a96e" }}>·</span>
            <span>cipher.co</span>
            <span style={{ color: "#c8a96e" }}>·</span>
            <span>Privacy</span>
            <span style={{ color: "#c8a96e" }}>·</span>
            <span>Terms</span>
          </footer>
        </div>
      )}

      {showPaymentModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={(e) => {
            if (e.currentTarget === e.target) {
              setShowPaymentModal(false);
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              borderRadius: 12,
              background: "#0f0f1e",
              border: "1px solid rgba(200,169,110,0.32)",
              padding: 24,
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowPaymentModal(false)}
              style={{
                position: "absolute",
                right: 12,
                top: 12,
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.6)",
                fontSize: 16,
                cursor: "pointer",
              }}
              aria-label="Close"
            >
              ×
            </button>

            <div
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 10,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "#c8a96e",
              }}
            >
              MULUK
            </div>
            <h2
              style={{
                marginTop: 8,
                fontFamily: "var(--font-display), serif",
                fontSize: 42,
                fontWeight: 300,
                fontStyle: "italic",
                color: "#c8a96e",
                lineHeight: 1.05,
              }}
            >
              Get Access
            </h2>
            <p style={{ color: "rgba(255,255,255,0.56)", marginTop: 4 }}>Anonymous. Instant. Permanent.</p>

            <div style={{ marginTop: 18, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 14 }}>
              <p style={{ color: "rgba(255,255,255,0.84)", fontWeight: 500 }}>{creator.name}</p>
              <p style={{ color: "rgba(255,255,255,0.44)", fontFamily: "var(--font-mono), monospace", fontSize: 12 }}>
                @{creator.handle}
              </p>
              <p
                style={{
                  marginTop: 8,
                  fontFamily: "var(--font-display), serif",
                  fontWeight: 300,
                  fontSize: 54,
                  color: "#c8a96e",
                  lineHeight: 1,
                }}
              >
                {selectedItem ? formatPrice(selectedItem.price, selectedItem.currency) : "$0"}
              </p>
            </div>

            {paymentUrl ? (
              <a
                href={paymentUrl}
                style={{
                  marginTop: 16,
                  display: "block",
                  textAlign: "center",
                  height: 44,
                  lineHeight: "44px",
                  borderRadius: 4,
                  border: "none",
                  textDecoration: "none",
                  background: "#c8a96e",
                  color: "#0a0800",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Pay {selectedItem ? formatPrice(selectedItem.price, selectedItem.currency) : "Now"} {"->"}
              </a>
            ) : (
              <div
                style={{
                  marginTop: 16,
                  height: 44,
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {paymentLoading ? "Preparing checkout" : "Checkout unavailable"}
              </div>
            )}

            <p
              style={{
                marginTop: 16,
                textAlign: "center",
                color: "rgba(255,255,255,0.35)",
                fontFamily: "var(--font-mono), monospace",
                fontSize: 9,
                letterSpacing: "0.08em",
                lineHeight: 1.8,
              }}
            >
              No email. No name. No identity.
              <br />
              Your Fan Code is generated instantly on payment.
            </p>

            <p
              style={{
                marginTop: 10,
                textAlign: "center",
                color: "rgba(255,255,255,0.24)",
                fontFamily: "var(--font-mono), monospace",
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Secured by Whop - cipher.co
            </p>
          </div>
        </div>
      )}

      {showSuccessOverlay && verifiedCode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 180,
            background:
              "radial-gradient(700px 250px at 50% 25%, rgba(200,169,110,0.2), rgba(2,2,3,0.98) 70%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 920 }}>
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.42)",
              }}
            >
              Your Permanent Key
            </p>

            <h2
              style={{
                marginTop: 12,
                fontFamily: "var(--font-display), serif",
                fontStyle: "italic",
                fontWeight: 300,
                letterSpacing: "0.1em",
                fontSize: "clamp(72px, 15vw, 120px)",
                background:
                  "linear-gradient(90deg, #8a7048 0%, #e8cc90 35%, #c8a96e 50%, #e8cc90 65%, #8a7048 100%)",
                backgroundSize: "600px 100%",
                WebkitBackgroundClip: "text",
                color: "transparent",
                animation: "codeShimmer 2.8s linear infinite",
              }}
            >
              {verifiedCode}
            </h2>

            <div style={{ marginTop: 14, color: "rgba(255,255,255,0.62)", lineHeight: 1.9 }}>
              <p>Screenshot this. It&apos;s your only copy.</p>
              <p>No email sent. No account created.</p>
              <p>This code unlocks everything from @{creator.handle}.</p>
            </div>

            <button
              onClick={() => setShowSuccessOverlay(false)}
              style={{
                marginTop: 20,
                border: "none",
                borderRadius: 4,
                background: "#c8a96e",
                color: "#0a0800",
                width: 180,
                height: 44,
                fontFamily: "var(--font-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Enter {"->"}
            </button>

            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  alignSelf: "center",
                }}
              >
                Flex your code:
              </span>
              <button
                onClick={handleCopyCode}
                style={{
                  border: "1px solid rgba(200,169,110,0.35)",
                  background: "transparent",
                  color: "#c8a96e",
                  borderRadius: 4,
                  padding: "8px 10px",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Copy {verifiedCode}
              </button>
              <a
                href={tweetUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  border: "1px solid rgba(255,255,255,0.22)",
                  color: "rgba(255,255,255,0.68)",
                  textDecoration: "none",
                  borderRadius: 4,
                  padding: "8px 10px",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Tweet it
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription tiers ─────────────────────────────────────── */}
      {subscriptionOffers.length > 0 && (
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "0 20px 80px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9,
              letterSpacing: "0.28em",
              textTransform: "uppercase" as const,
              color: "rgba(255,255,255,0.2)",
              marginBottom: 16,
            }}
          >
            Subscribe
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {subscriptionOffers.map((offer) => (
              <div
                key={offer.id}
                style={{
                  background: "rgba(200,169,110,0.04)",
                  border: "1px solid rgba(200,169,110,0.14)",
                  borderRadius: 10,
                  padding: "20px 22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,0.85)",
                      marginBottom: offer.description ? 4 : 0,
                    }}
                  >
                    {offer.title}
                  </div>
                  {offer.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.35)",
                        lineHeight: 1.5,
                      }}
                    >
                      {offer.description}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                  {offer.price_label && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: 12,
                        color: "#c8a96e",
                        whiteSpace: "nowrap" as const,
                      }}
                    >
                      {offer.price_label}
                    </span>
                  )}
                  {offer.whop_link ? (
                    <a
                      href={offer.whop_link}
                      style={{
                        display: "inline-block",
                        padding: "10px 18px",
                        background: "#c8a96e",
                        color: "#0a0800",
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: 10,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase" as const,
                        fontWeight: 600,
                        textDecoration: "none",
                        borderRadius: 6,
                        whiteSpace: "nowrap" as const,
                      }}
                    >
                      Subscribe
                    </a>
                  ) : (
                    <span
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: 10,
                        color: "rgba(255,255,255,0.2)",
                      }}
                    >
                      Coming soon
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
