"use client";

import { useEffect, useState } from "react";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" };

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

type PayLink = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  content_type: string;
  cover_image_url: string | null;
  whop_checkout_url: string | null;
  view_count: number;
  purchase_count: number;
};

type UnlockState =
  | { stage: "locked" }
  | { stage: "verifying" }
  | { stage: "unlocked"; content_value: string; content_type: string; granted_at: string }
  | { stage: "invalid" };

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" strokeLinecap="round" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 017.9-.3" strokeLinecap="round" />
    </svg>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };
  return (
    <button
      type="button"
      onClick={copy}
      style={{
        ...mono,
        padding: "8px 16px",
        border: "1px solid rgba(200,169,110,0.35)",
        borderRadius: "6px",
        background: copied ? "rgba(200,169,110,0.15)" : "transparent",
        color: copied ? "var(--gold, #c8a96e)" : "rgba(255,255,255,0.55)",
        fontSize: "11px",
        letterSpacing: "0.14em",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {copied ? "COPIED ✓" : label}
    </button>
  );
}

function ContentDisplay({ content_value, content_type }: { content_value: string; content_type: string }) {
  if (content_type === "url") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "rgba(200,169,110,0.6)" }}>UNLOCKED LINK</div>
        <a
          href={content_value}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#8dcfff", fontSize: "14px", wordBreak: "break-all", lineHeight: 1.5 }}
        >
          {content_value}
        </a>
        <CopyButton text={content_value} label="COPY URL" />
      </div>
    );
  }

  if (content_type === "file") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "rgba(200,169,110,0.6)" }}>DOWNLOAD FILE</div>
        <a
          href={content_value}
          target="_blank"
          rel="noopener noreferrer"
          download
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 20px",
            background: "rgba(200,169,110,0.12)",
            border: "1px solid rgba(200,169,110,0.35)",
            borderRadius: "8px",
            color: "var(--gold, #c8a96e)",
            textDecoration: "none",
            ...mono,
            fontSize: "12px",
            letterSpacing: "0.12em",
          }}
        >
          ↓ DOWNLOAD FILE
        </a>
      </div>
    );
  }

  // text
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "rgba(200,169,110,0.6)" }}>EXCLUSIVE CONTENT</div>
      <div
        style={{
          padding: "16px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px",
          fontSize: "14px",
          color: "rgba(255,255,255,0.85)",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {content_value}
      </div>
      <CopyButton text={content_value} label="COPY TEXT" />
    </div>
  );
}

const STORAGE_PREFIX = "cipher-pay-access-";

export default function PayLinkClient({ link }: { link: PayLink }) {
  const [unlock, setUnlock] = useState<UnlockState>({ stage: "locked" });
  const [tokenInput, setTokenInput] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);

  // On mount: check URL ?token= param, then localStorage
  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get("token");
    const stored = localStorage.getItem(STORAGE_PREFIX + link.id);
    const candidate = urlToken || stored;
    if (candidate) {
      verifyToken(candidate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link.id]);

  async function verifyToken(token: string) {
    setUnlock({ stage: "verifying" });
    try {
      const res = await fetch(`/api/pay/${link.id}/verify?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (json.access) {
        localStorage.setItem(STORAGE_PREFIX + link.id, token);
        setUnlock({
          stage: "unlocked",
          content_value: json.content_value ?? "",
          content_type: json.content_type ?? "text",
          granted_at: json.granted_at ?? "",
        });
      } else {
        localStorage.removeItem(STORAGE_PREFIX + link.id);
        setUnlock({ stage: "invalid" });
      }
    } catch {
      setUnlock({ stage: "invalid" });
    }
  }

  const handleManualVerify = () => {
    if (tokenInput.trim()) verifyToken(tokenInput.trim());
  };

  const isUnlocked = unlock.stage === "unlocked";
  const isVerifying = unlock.stage === "verifying";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020203",
        backgroundImage: "radial-gradient(circle at 60% 10%, rgba(200,169,110,0.07), transparent 45%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "var(--font-body, 'Outfit', sans-serif)",
      }}
    >
      {/* Wordmark */}
      <div style={{ ...mono, fontSize: "12px", letterSpacing: "0.35em", color: "rgba(200,169,110,0.55)", marginBottom: "40px" }}>
        CIPHER
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#0d0d18",
          border: `1px solid ${isUnlocked ? "rgba(200,169,110,0.4)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: "16px",
          overflow: "hidden",
          transition: "border-color 0.4s",
        }}
      >
        {/* Cover image */}
        {link.cover_image_url && (
          <div
            style={{
              width: "100%",
              aspectRatio: "16/7",
              background: `url(${link.cover_image_url}) center/cover no-repeat`,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              position: "relative",
            }}
          >
            {!isUnlocked && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(2,2,3,0.55)",
                  backdropFilter: "blur(3px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                <LockIcon />
              </div>
            )}
          </div>
        )}

        {/* No cover — placeholder gradient */}
        {!link.cover_image_url && (
          <div
            style={{
              width: "100%",
              height: "90px",
              background: isUnlocked
                ? "linear-gradient(135deg, rgba(200,169,110,0.18), rgba(200,169,110,0.04))"
                : "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isUnlocked ? "rgba(200,169,110,0.6)" : "rgba(255,255,255,0.15)",
              transition: "all 0.4s",
            }}
          >
            {isUnlocked ? <UnlockIcon /> : <LockIcon />}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {/* Header */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ ...disp, fontSize: "26px", color: "rgba(255,255,255,0.92)", lineHeight: 1.2 }}>
                {link.title}
              </div>
              <div
                style={{
                  ...mono,
                  fontSize: "22px",
                  color: "var(--gold, #c8a96e)",
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                {money.format(link.price / 100)}
              </div>
            </div>
            {link.description && (
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginTop: "8px", lineHeight: 1.6 }}>
                {link.description}
              </div>
            )}
            <div style={{ display: "flex", gap: "16px", marginTop: "10px" }}>
              <span style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
                {link.view_count} views
              </span>
              <span style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
                {link.purchase_count} purchased
              </span>
            </div>
          </div>

          {/* ── Unlocked state ── */}
          {isUnlocked && unlock.stage === "unlocked" && (
            <div>
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(80,212,138,0.08)",
                  border: "1px solid rgba(80,212,138,0.25)",
                  borderRadius: "8px",
                  marginBottom: "18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ color: "#50d48a", fontSize: "14px" }}>✓</span>
                <span style={{ ...mono, fontSize: "10px", letterSpacing: "0.12em", color: "#50d48a" }}>
                  ACCESS GRANTED — PURCHASE VERIFIED
                </span>
              </div>
              <ContentDisplay
                content_value={unlock.content_value}
                content_type={unlock.content_type}
              />
            </div>
          )}

          {/* ── Locked / verifying state ── */}
          {!isUnlocked && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Invalid token notice */}
              {unlock.stage === "invalid" && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(224,85,85,0.08)",
                    border: "1px solid rgba(224,85,85,0.25)",
                    borderRadius: "8px",
                    ...mono,
                    fontSize: "10px",
                    letterSpacing: "0.12em",
                    color: "#e05555",
                  }}
                >
                  INVALID OR EXPIRED TOKEN — PURCHASE TO UNLOCK
                </div>
              )}

              {/* Buy Now */}
              {link.whop_checkout_url && (
                <a
                  href={link.whop_checkout_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "14px",
                    background: "var(--gold, #c8a96e)",
                    borderRadius: "8px",
                    color: "#120c00",
                    textDecoration: "none",
                    ...mono,
                    fontSize: "12px",
                    letterSpacing: "0.18em",
                    fontWeight: 600,
                    transition: "opacity 0.15s",
                  }}
                >
                  {isVerifying ? "VERIFYING…" : `BUY NOW — ${money.format(link.price / 100)}`}
                </a>
              )}

              {/* Already paid divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
                <span style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
                  ALREADY PAID?
                </span>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
              </div>

              {/* Token entry */}
              {showTokenInput ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleManualVerify()}
                    placeholder="Paste your access token"
                    style={{
                      flex: 1,
                      background: "#070711",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px",
                      color: "rgba(255,255,255,0.85)",
                      padding: "10px 12px",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleManualVerify}
                    disabled={isVerifying || !tokenInput.trim()}
                    style={{
                      ...mono,
                      padding: "10px 16px",
                      border: "none",
                      borderRadius: "6px",
                      background: "rgba(200,169,110,0.18)",
                      color: "var(--gold, #c8a96e)",
                      fontSize: "11px",
                      letterSpacing: "0.12em",
                      cursor: "pointer",
                      opacity: isVerifying ? 0.5 : 1,
                    }}
                  >
                    {isVerifying ? "…" : "VERIFY"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTokenInput(true)}
                  style={{
                    ...mono,
                    padding: "10px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "6px",
                    background: "transparent",
                    color: "rgba(255,255,255,0.35)",
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    cursor: "pointer",
                  }}
                >
                  ENTER ACCESS TOKEN
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "28px", ...mono, fontSize: "10px", color: "rgba(255,255,255,0.15)", letterSpacing: "0.14em" }}>
        POWERED BY CIPHER
      </div>
    </div>
  );
}
