"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Creator = {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  category: string | null;
  tier: string;
};

type ContentItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  whop_checkout_url: string | null;
  preview_url: string | null;
};

type Props = {
  creator: Creator;
  contentItems: ContentItem[];
};

const TIER_LABELS: Record<string, string> = {
  apex: "EMPEROR",
  legend: "KING",
  cipher: "PRINCE",
};

const TIER_COLORS: Record<string, string> = {
  apex: "#e8cc90",
  legend: "#c8a96e",
  cipher: "#a88848",
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function FanPageInner({ creator, contentItems }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fanCodeParam = searchParams.get("fanCode");

  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [fanCodeBanner, setFanCodeBanner] = useState<string | null>(fanCodeParam);
  const inputRef = useRef<HTMLInputElement>(null);

  const primaryCheckoutUrl =
    contentItems.find((i) => i.whop_checkout_url)?.whop_checkout_url ?? null;

  useEffect(() => {
    if (showCodeModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCodeModal]);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = codeInput.trim().toUpperCase();
    if (!raw) return;

    if (!/^FAN-[A-Z2-9]{10}$/.test(raw)) {
      setCodeError("Invalid code format — must be FAN-XXXXXXXXXX");
      return;
    }

    setCodeChecking(true);
    setCodeError(null);

    try {
      const res = await fetch(
        `/api/fan/verify?code=${encodeURIComponent(raw)}&handle=${encodeURIComponent(creator.handle)}`
      );
      const json = await res.json();

      if (!res.ok || !json.valid) {
        setCodeError(json.error ?? "Code not found or not valid for this creator.");
        setCodeChecking(false);
        return;
      }

      router.push(`/unlock/${raw}`);
    } catch {
      setCodeError("Failed to verify code — please try again.");
      setCodeChecking(false);
    }
  };

  const tierColor = TIER_COLORS[creator.tier] ?? TIER_COLORS.cipher;
  const tierLabel = TIER_LABELS[creator.tier] ?? "PRINCE";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--void, #020203)",
        color: "var(--white, rgba(255,255,255,0.92))",
        fontFamily: "var(--font-body, 'Outfit'), sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* Fan code success banner */}
      {fanCodeBanner && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "linear-gradient(135deg, rgba(200,169,110,0.15), rgba(200,169,110,0.05))",
            borderBottom: "1px solid rgba(200,169,110,0.2)",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "var(--gold, #c8a96e)", fontSize: 14 }}>✓</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "'DM Mono', monospace" }}>
              Payment confirmed — your access code:{" "}
              <span style={{ color: "var(--gold, #c8a96e)", letterSpacing: "0.12em" }}>
                {fanCodeBanner}
              </span>
            </span>
          </div>
          <button
            onClick={() => {
              setFanCodeBanner(null);
              router.push(`/unlock/${fanCodeBanner}`);
            }}
            style={{
              background: "var(--gold, #c8a96e)",
              color: "#0a0800",
              border: "none",
              borderRadius: 3,
              padding: "6px 16px",
              fontSize: 10,
              fontFamily: "'DM Mono', monospace",
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Unlock Now
          </button>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: fanCodeBanner ? 80 : 48,
          paddingBottom: 48,
          paddingLeft: 24,
          paddingRight: 24,
          maxWidth: 680,
          margin: "0 auto",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 24,
              height: 1,
              background: "var(--gold-dim, #8a7048)",
            }}
          />
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--gold-dim, #8a7048)",
            }}
          >
            cipher.co
          </span>
        </div>

        {/* Creator name */}
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(42px, 8vw, 72px)",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            lineHeight: 1.0,
            marginBottom: 12,
            color: "rgba(255,255,255,0.92)",
          }}
        >
          {creator.name}
        </h1>

        {/* Handle + tier badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.05em",
            }}
          >
            @{creator.handle}
          </span>
          {creator.category && (
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "3px 9px",
                borderRadius: 100,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              {creator.category}
            </span>
          )}
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "3px 9px",
              borderRadius: 100,
              background: `rgba(${tierColor === "#e8cc90" ? "232,204,144" : tierColor === "#c8a96e" ? "200,169,110" : "168,136,72"},0.08)`,
              border: `1px solid ${tierColor}33`,
              color: tierColor,
            }}
          >
            {tierLabel}
          </span>
        </div>

        {/* Bio */}
        {creator.bio && (
          <p
            style={{
              fontSize: 15,
              fontWeight: 300,
              color: "rgba(255,255,255,0.48)",
              lineHeight: 1.65,
              maxWidth: 520,
              marginBottom: 32,
            }}
          >
            {creator.bio}
          </p>
        )}

        {/* ── CTA ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
          {primaryCheckoutUrl ? (
            <a
              href={primaryCheckoutUrl}
              style={{
                display: "block",
                textAlign: "center",
                background: "var(--gold, #c8a96e)",
                color: "#0a0800",
                fontFamily: "'DM Mono', monospace",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "16px 32px",
                borderRadius: 3,
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.82")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Get Access
            </a>
          ) : (
            <div
              style={{
                padding: "16px 32px",
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.06)",
                textAlign: "center",
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: "rgba(255,255,255,0.22)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Coming soon
            </div>
          )}

          <button
            onClick={() => setShowCodeModal(true)}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 3,
              padding: "13px 32px",
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
              cursor: "pointer",
              transition: "color 0.2s, border-color 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.35)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            Already have a code?
          </button>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.055), transparent)",
          maxWidth: 680,
          margin: "0 auto 40px",
        }}
      />

      {/* ── CONTENT GRID ── */}
      {contentItems.length > 0 && (
        <section
          style={{
            maxWidth: 680,
            margin: "0 auto",
            padding: "0 24px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div style={{ width: 24, height: 1, background: "var(--gold-dim, #8a7048)" }} />
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--gold-dim, #8a7048)",
              }}
            >
              Exclusive Content
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {contentItems.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "var(--card, #111120)",
                  border: "1px solid rgba(255,255,255,0.055)",
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* Preview image (blurred) */}
                <div
                  style={{
                    height: 120,
                    background: item.preview_url
                      ? `url(${item.preview_url}) center/cover`
                      : "linear-gradient(135deg, #0d0d18 0%, #111120 100%)",
                    filter: "blur(6px)",
                    transform: "scale(1.05)",
                  }}
                />

                {/* Lock overlay */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 120,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(2,2,3,0.35)",
                  }}
                >
                  <span style={{ fontSize: 18, opacity: 0.7 }}>🔒</span>
                </div>

                {/* Info */}
                <div style={{ padding: "14px 14px 16px" }}>
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 16,
                      fontWeight: 400,
                      color: "rgba(255,255,255,0.8)",
                      marginBottom: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 12,
                      color: "var(--gold, #c8a96e)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {formatPrice(item.price, item.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CODE INPUT MODAL ── */}
      {showCodeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(2,2,3,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCodeModal(false);
              setCodeError(null);
              setCodeInput("");
            }
          }}
        >
          <div
            style={{
              background: "var(--card, #111120)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: 32,
              maxWidth: 400,
              width: "100%",
            }}
          >
            {/* Gold top line */}
            <div
              style={{
                height: 1,
                background: "linear-gradient(90deg, transparent, var(--gold, #c8a96e), transparent)",
                marginBottom: 28,
                opacity: 0.5,
              }}
            />

            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 26,
                fontWeight: 300,
                color: "rgba(255,255,255,0.92)",
                marginBottom: 8,
              }}
            >
              Enter your code
            </h2>
            <p
              style={{
                fontSize: 13,
                fontWeight: 300,
                color: "rgba(255,255,255,0.4)",
                marginBottom: 24,
              }}
            >
              Your FAN code grants you access to {creator.name}&apos;s exclusive content.
            </p>

            <form onSubmit={handleCodeSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                ref={inputRef}
                type="text"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  setCodeError(null);
                }}
                placeholder="FAN-XXXXXXXXXX"
                maxLength={14}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${codeError ? "rgba(224,85,85,0.5)" : "rgba(255,255,255,0.09)"}`,
                  borderRadius: 3,
                  color: "rgba(255,255,255,0.92)",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 16,
                  letterSpacing: "0.12em",
                  padding: "14px 18px",
                  outline: "none",
                  width: "100%",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  if (!codeError) {
                    e.currentTarget.style.borderColor = "rgba(200,169,110,0.45)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(200,169,110,0.07)";
                  }
                }}
                onBlur={(e) => {
                  if (!codeError) {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              />

              {codeError && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#e05555",
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: "0.05em",
                  }}
                >
                  {codeError}
                </p>
              )}

              <button
                type="submit"
                disabled={codeChecking || !codeInput.trim()}
                style={{
                  background: codeChecking || !codeInput.trim() ? "rgba(200,169,110,0.3)" : "var(--gold, #c8a96e)",
                  color: "#0a0800",
                  border: "none",
                  borderRadius: 3,
                  padding: "14px 28px",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: codeChecking || !codeInput.trim() ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                }}
              >
                {codeChecking ? "Verifying..." : "Unlock Content"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCodeModal(false);
                  setCodeError(null);
                  setCodeInput("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.25)",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  padding: "8px",
                }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "24px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.15)",
          }}
        >
          MULUK
        </span>
        <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 10 }}>·</span>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: "rgba(255,255,255,0.10)",
          }}
        >
          dark luxury creator platform
        </span>
      </footer>
    </div>
  );
}

export default function FanPageContent(props: Props) {
  return (
    <Suspense>
      <FanPageInner {...props} />
    </Suspense>
  );
}
