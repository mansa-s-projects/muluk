"use client";

import Link from "next/link";
import { useState, useRef } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ContentItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  burnMode: boolean;
  expiresAt: string | null;
  createdAt: string;
};

type SocialPlatform = {
  platform: string;
  username: string | null;
  followers: number;
};

type CreatorData = {
  creator: {
    displayName: string | null;
    handle: string;
    bio: string | null;
    category: string | null;
    joinedAt: string;
  };
  content: ContentItem[];
  socialReach: {
    totalFollowers: number;
    byPlatform: SocialPlatform[];
  };
};

type Props = {
  handle: string;
  error: "not_found" | null;
  data: CreatorData | null;
};

// ─── Style constants ───────────────────────────────────────────────────────────
const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display)" };

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "#1DA1F2",
  tiktok: "#ff0050",
  instagram: "#E1306C",
  youtube: "#FF0000",
  telegram: "#2AABEE",
};

// ─── Error Page ────────────────────────────────────────────────────────────────
function ErrorPage({ handle }: { handle: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080810",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        color: "#fff",
      }}
    >
      <Link href="/" style={{ textDecoration: "none", marginBottom: "48px" }}>
        <span style={{ ...disp, fontSize: "28px", letterSpacing: "0.25em", color: "#c8a96e" }}>
          CIPHER
        </span>
      </Link>
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          textAlign: "center",
          padding: "40px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "12px",
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>◈</div>
        <div style={{ ...disp, fontSize: "24px", color: "rgba(255,255,255,0.8)", marginBottom: "10px" }}>
          Creator Not Found
        </div>
        <div style={{ ...mono, fontSize: "11px", color: "rgba(255,255,255,0.3)", lineHeight: 1.7, marginBottom: "8px" }}>
          This creator doesn&apos;t exist, is in stealth mode, or the link may be incorrect.
        </div>
        <div
          style={{
            ...mono,
            fontSize: "10px",
            color: "rgba(255,255,255,0.15)",
            marginBottom: "32px",
            letterSpacing: "0.1em",
          }}
        >
          @{handle}
        </div>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "rgba(200,169,110,0.08)",
            border: "1px solid rgba(200,169,110,0.25)",
            borderRadius: "6px",
            color: "#c8a96e",
            textDecoration: "none",
            ...mono,
            fontSize: "10px",
            letterSpacing: "0.18em",
          }}
        >
          ← CIPHER HOME
        </Link>
      </div>
    </div>
  );
}

// ─── Fan Access CTA ────────────────────────────────────────────────────────────
function FanAccessForm({ handle }: { handle: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setErrMsg("Enter a valid email address.");
      inputRef.current?.focus();
      return;
    }
    setErrMsg("");
    setStatus("loading");
    try {
      const res = await fetch(`/api/creator/${encodeURIComponent(handle)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, message: message.trim() }),
      });
      if (res.ok) {
        setStatus("done");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrMsg((data as { error?: string }).error ?? "Something went wrong.");
        setStatus("error");
      }
    } catch {
      setErrMsg("Network error — please try again.");
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div style={{ textAlign: "center", padding: "28px 0" }}>
        <div style={{ fontSize: "32px", marginBottom: "14px" }}>✦</div>
        <div style={{ ...disp, fontSize: "26px", color: "#c8a96e", marginBottom: "8px" }}>
          Request sent.
        </div>
        <div style={{ ...mono, fontSize: "11px", color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
          @{handle} will be in touch with your fan code.
          <br />
          Keep an eye on your inbox.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="fan-email"
          style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", display: "block", marginBottom: "8px" }}
        >
          YOUR EMAIL
        </label>
        <input
          id="fan-email"
          ref={inputRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="you@email.com"
          disabled={status === "loading"}
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${errMsg ? "rgba(200,76,76,0.5)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "6px",
            color: "#fff",
            ...mono,
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
        />
      </div>
      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="fan-message"
          style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", display: "block", marginBottom: "8px" }}
        >
          MESSAGE <span style={{ color: "rgba(255,255,255,0.15)" }}>(OPTIONAL)</span>
        </label>
        <textarea
          id="fan-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell them a little about yourself..."
          maxLength={500}
          rows={3}
          disabled={status === "loading"}
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: "#fff",
            ...mono,
            fontSize: "12px",
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
            minHeight: "72px",
          }}
        />
      </div>
      {errMsg && (
        <div style={{ ...mono, fontSize: "10px", color: "#e88888", marginBottom: "12px" }}>
          {errMsg}
        </div>
      )}
      <button
        onClick={submit}
        disabled={status === "loading"}
        style={{
          width: "100%",
          padding: "14px",
          background: "linear-gradient(135deg, rgba(200,169,110,0.2), rgba(200,169,110,0.08))",
          border: "1px solid rgba(200,169,110,0.4)",
          borderRadius: "8px",
          color: "#c8a96e",
          cursor: status === "loading" ? "wait" : "pointer",
          ...mono,
          fontSize: "11px",
          letterSpacing: "0.2em",
          transition: "all 0.2s",
        }}
      >
        {status === "loading" ? "SENDING REQUEST..." : "REQUEST FAN ACCESS →"}
      </button>
    </div>
  );
}

// ─── Content Card ──────────────────────────────────────────────────────────────
function ContentCard({ item }: { item: ContentItem }) {
  const isFree = item.price === 0;
  return (
    <div
      style={{
        padding: "18px",
        background: isFree ? "rgba(76,200,140,0.03)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isFree ? "rgba(76,200,140,0.12)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span style={{ fontSize: "15px" }}>{isFree ? "✦" : "🔒"}</span>
            <div
              style={{
                ...disp,
                fontSize: "17px",
                color: isFree ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.6)",
                filter: isFree ? "none" : "blur(2px)",
                userSelect: isFree ? "auto" : "none",
              }}
            >
              {item.title}
            </div>
            {item.burnMode && (
              <span
                style={{
                  ...mono,
                  fontSize: "8px",
                  padding: "2px 7px",
                  background: "rgba(232,136,136,0.1)",
                  border: "1px solid rgba(232,136,136,0.2)",
                  borderRadius: "4px",
                  color: "#e88888",
                  letterSpacing: "0.15em",
                }}
              >
                BURN
              </span>
            )}
          </div>
          {item.description && (
            <div
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.3)",
                lineHeight: 1.6,
                filter: isFree ? "none" : "blur(2px)",
                userSelect: isFree ? "auto" : "none",
              }}
            >
              {item.description}
            </div>
          )}
          {item.expiresAt && (
            <div style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.18)", marginTop: "4px", letterSpacing: "0.1em" }}>
              EXPIRES {fmt(item.expiresAt).toUpperCase()}
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          {isFree ? (
            <span style={{ ...mono, fontSize: "10px", color: "#4cc88c", padding: "3px 10px", background: "rgba(76,200,140,0.08)", border: "1px solid rgba(76,200,140,0.18)", borderRadius: "4px" }}>
              FREE
            </span>
          ) : (
            <div style={{ ...mono, fontSize: "14px", color: "#c8a96e" }}>
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.price)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Profile ──────────────────────────────────────────────────────────────
export default function CreatorProfileClient({ handle, error, data }: Props) {
  if (error || !data) return <ErrorPage handle={handle} />;

  const { creator, content, socialReach } = data;
  const freeCount = content.filter((c) => c.price === 0).length;
  const paidCount = content.length - freeCount;
  const initial = (creator.displayName ?? creator.handle)[0].toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "#fff", paddingBottom: "80px" }}>

      {/* ── Header ── */}
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.055)",
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: "rgba(8,8,16,0.92)",
          backdropFilter: "blur(12px)",
          zIndex: 100,
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ ...disp, fontSize: "20px", letterSpacing: "0.2em", color: "#c8a96e" }}>
            CIPHER
          </span>
        </Link>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "999px",
            ...mono,
            fontSize: "9px",
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.15em",
          }}
        >
          <span style={{ fontSize: "11px" }}>◎</span>
          DISCOVER
        </div>
      </header>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 20px" }}>

        {/* ── Creator Hero ── */}
        <div style={{ margin: "36px 0 28px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(200,169,110,0.35), rgba(200,169,110,0.06))",
                border: "1px solid rgba(200,169,110,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                ...disp,
                fontSize: "32px",
                color: "#c8a96e",
              }}
            >
              {initial}
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                <h1 style={{ ...disp, fontSize: "clamp(22px, 5vw, 34px)", color: "rgba(255,255,255,0.92)", margin: 0 }}>
                  {creator.displayName ?? `@${creator.handle}`}
                </h1>
                {creator.displayName && (
                  <span style={{ ...mono, fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
                    @{creator.handle}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                {creator.category && (
                  <span
                    style={{
                      padding: "3px 10px",
                      background: "rgba(152,152,204,0.1)",
                      border: "1px solid rgba(152,152,204,0.2)",
                      borderRadius: "4px",
                      ...mono,
                      fontSize: "9px",
                      color: "rgba(152,152,204,0.8)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {creator.category.toUpperCase()}
                  </span>
                )}
                <span style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>
                  ON CIPHER SINCE {fmt(creator.joinedAt).toUpperCase()}
                </span>
              </div>
              {creator.bio && (
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: 0 }}>
                  {creator.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Social Reach Bar ── */}
        {socialReach.totalFollowers > 0 && (
          <div
            style={{
              marginBottom: "28px",
              padding: "16px 20px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginBottom: "3px" }}>
                TOTAL REACH
              </div>
              <div style={{ ...disp, fontSize: "26px", color: "#c8a96e" }}>
                {fmtFollowers(socialReach.totalFollowers)}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {socialReach.byPlatform.map((p) => (
                <div
                  key={p.platform}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${PLATFORM_COLORS[p.platform] ?? "#555"}33`,
                    borderRadius: "6px",
                  }}
                >
                  <div style={{ ...mono, fontSize: "8px", color: PLATFORM_COLORS[p.platform] ?? "#aaa", letterSpacing: "0.12em", marginBottom: "2px" }}>
                    {p.platform.toUpperCase()}
                  </div>
                  <div style={{ ...mono, fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                    {fmtFollowers(p.followers)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Content Showcase ── */}
        <section style={{ marginBottom: "36px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)" }}>
              CONTENT
            </div>
            {content.length > 0 && (
              <div style={{ display: "flex", gap: "8px" }}>
                {freeCount > 0 && (
                  <span style={{ ...mono, fontSize: "9px", color: "#4cc88c", padding: "2px 8px", background: "rgba(76,200,140,0.08)", border: "1px solid rgba(76,200,140,0.15)", borderRadius: "4px" }}>
                    {freeCount} FREE
                  </span>
                )}
                {paidCount > 0 && (
                  <span style={{ ...mono, fontSize: "9px", color: "#c8a96e", padding: "2px 8px", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "4px" }}>
                    {paidCount} LOCKED
                  </span>
                )}
              </div>
            )}
          </div>

          {content.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 24px",
                background: "rgba(255,255,255,0.02)",
                border: "1px dashed rgba(255,255,255,0.07)",
                borderRadius: "10px",
                ...mono,
                fontSize: "11px",
                color: "rgba(255,255,255,0.2)",
                letterSpacing: "0.1em",
              }}
            >
              NO CONTENT PUBLISHED YET
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {content.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* ── Get Fan Access CTA ── */}
        <section style={{ marginBottom: "36px" }}>
          <div
            style={{
              padding: "28px",
              background: "linear-gradient(135deg, rgba(200,169,110,0.07), rgba(200,169,110,0.02))",
              border: "1px solid rgba(200,169,110,0.2)",
              borderRadius: "12px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background glyph */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                right: "16px",
                bottom: "8px",
                fontSize: "80px",
                color: "rgba(200,169,110,0.04)",
                ...disp,
                pointerEvents: "none",
                userSelect: "none",
                lineHeight: 1,
              }}
            >
              ✦
            </div>

            <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color: "rgba(200,169,110,0.5)", marginBottom: "8px" }}>
              GET FAN ACCESS
            </div>
            <div style={{ ...disp, fontSize: "22px", color: "rgba(255,255,255,0.85)", marginBottom: "6px" }}>
              Want exclusive access to @{creator.handle}?
            </div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", lineHeight: 1.65, marginBottom: "24px" }}>
              Request a fan code and get anonymous access to their exclusive content on CIPHER.
              Your identity stays private — just your code.
            </div>
            <FanAccessForm handle={creator.handle} />
          </div>
        </section>

        {/* ── Footer ── */}
        <footer
          style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: "28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
            textAlign: "center",
          }}
        >
          <div style={{ ...disp, fontSize: "18px", letterSpacing: "0.2em", color: "rgba(200,169,110,0.5)" }}>
            CIPHER
          </div>
          <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.15)", letterSpacing: "0.1em", lineHeight: 1.8 }}>
            ANONYMOUS FANS · 88% CREATOR PAYOUT
            <br />
            CRYPTO PAYMENTS · 190 COUNTRIES
          </div>
          <Link
            href="/apply"
            style={{
              ...mono,
              fontSize: "10px",
              letterSpacing: "0.15em",
              color: "rgba(200,169,110,0.5)",
              textDecoration: "none",
              padding: "8px 16px",
              border: "1px solid rgba(200,169,110,0.15)",
              borderRadius: "6px",
            }}
          >
            ARE YOU A CREATOR? APPLY →
          </Link>
          <div style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.1)", letterSpacing: "0.1em" }}>
            © {new Date().getFullYear()} CIPHER
          </div>
        </footer>

      </div>
    </div>
  );
}
