"use client";

import { useEffect, useRef, useState } from "react";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" };

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export type PayLink = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  content_type: string;
  content_value?: string | null;
  file_url?: string | null;
  view_count: number;
  purchase_count: number;
  slug?: string | null;
};

type UnlockState = "locked" | "redirecting" | "unlocking" | "verify" | "checking" | "unlocked" | "error";

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

function Spinner() {
  return (
    <span
      aria-label="Loading"
      style={{
        display: "inline-block",
        width: "14px",
        height: "14px",
        border: "2px solid rgba(200,169,110,0.25)",
        borderTopColor: "var(--gold, #c8a96e)",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyError(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error("Clipboard write failed:", err);
      setCopied(false);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2000);
    });
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
        background: copyError ? "rgba(224,85,85,0.15)" : copied ? "rgba(200,169,110,0.15)" : "transparent",
        color: copyError ? "#e05555" : copied ? "var(--gold, #c8a96e)" : "rgba(255,255,255,0.55)",
        fontSize: "11px",
        letterSpacing: "0.14em",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {copyError ? "FAILED" : copied ? "COPIED ✓" : label}
    </button>
  );
}

function ContentDisplay({ content_value, content_type }: { content_value: string; content_type: string }) {
  if (content_type === "file") {
    // Use URL.pathname for reliable extension matching (avoids false positives from
    // query params or multi-segment paths like /img.png/download.php)
    let ext = "";
    try {
      const u = new URL(content_value);
      ext = u.pathname.toLowerCase();
    } catch {
      // Not a valid absolute URL — fall back to the raw string
      ext = content_value.toLowerCase();
    }
    const isImage = /\.(png|jpe?g|webp|gif)$/.test(ext);
    const isVideo = /\.(mp4|webm|mov)$/.test(ext);
    let safeDownloadUrl: string | null = null;
    try {
      const parsed = new URL(content_value);
      if (["http:", "https:"].includes(parsed.protocol)) {
        safeDownloadUrl = parsed.toString();
      }
    } catch {
      safeDownloadUrl = null;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "rgba(200,169,110,0.6)" }}>
          UNLOCKED FILE
        </div>
        {isImage && (
          <img
            src={content_value}
            alt="Unlocked content"
            style={{ width: "100%", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        )}
        {isVideo && (
          <video
            controls
            src={content_value}
            style={{ width: "100%", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        )}
        {safeDownloadUrl ? (
          <a
            href={safeDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...mono,
              display: "inline-block",
              padding: "12px 18px",
              background: "var(--gold, #c8a96e)",
              color: "#120c00",
              borderRadius: "8px",
              fontSize: "11px",
              letterSpacing: "0.18em",
              fontWeight: 600,
              textDecoration: "none",
              textAlign: "center",
            }}
          >
            DOWNLOAD FILE
          </a>
        ) : (
          <div
            style={{
              ...mono,
              display: "inline-block",
              padding: "12px 18px",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.35)",
              borderRadius: "8px",
              fontSize: "11px",
              letterSpacing: "0.18em",
              border: "1px solid rgba(255,255,255,0.08)",
              textAlign: "center",
            }}
          >
            DOWNLOAD UNAVAILABLE
          </div>
        )}
        <CopyButton text={content_value} label="COPY LINK" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "rgba(200,169,110,0.6)" }}>
        UNLOCKED CONTENT
      </div>
      <div
        style={{
          padding: "16px",
          background: "rgba(200,169,110,0.04)",
          border: "1px solid rgba(200,169,110,0.18)",
          borderRadius: "8px",
          color: "rgba(255,255,255,0.82)",
          lineHeight: 1.75,
          whiteSpace: "pre-wrap",
          fontSize: "14px",
        }}
      >
        {content_value}
      </div>
      <CopyButton text={content_value} label="COPY TEXT" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────

export default function PayLinkClient({
  link,
  checkoutUrl,
}: {
  link: PayLink;
  checkoutUrl: string | null;
}) {
  const [state, setState] = useState<UnlockState>("locked");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [unlockedContent, setUnlockedContent] = useState<string | null>(null);
  const tokenVerified = useRef(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // On mount: read URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const token = params.get("token");

    if (token && !tokenVerified.current) {
      tokenVerified.current = true;
      verifyByToken(token);
    } else if (success === "1") {
      startPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyByToken(token: string) {
    setState("checking");
    try {
      const res = await fetch(`/api/pay/${link.id}/verify?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (json.access && json.content_value) {
        setUnlockedContent(json.content_value);
        setState("unlocked");
      } else {
        setState("verify"); // fall through to email
      }
    } catch {
      setState("verify");
    }
  }

  async function verifyByEmail() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError(null);
    setState("checking");
    try {
      const res = await fetch(`/api/pay/${link.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json();
      if (json.access && json.content_value) {
        setUnlockedContent(json.content_value);
        setState("unlocked");
      } else {
        setEmailError("No purchase found for this email. Complete checkout first.");
        setState("verify");
      }
    } catch {
      setEmailError("Something went wrong. Please try again.");
      setState("verify");
    }
  }

  function startPolling() {
    const storedTs =
      typeof window !== "undefined"
        ? sessionStorage.getItem("cipher_checkout_started")
        : null;
    const since = storedTs
      ? new Date(parseInt(storedTs, 10)).toISOString()
      : new Date(Date.now() - 3 * 60 * 1000).toISOString(); // fallback: 3 min ago
    setState("unlocking");
    pollForToken(since);
  }

  function pollForToken(since: string) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let attempts = 0;
    const maxAttempts = 15; // 30 seconds at 2-second intervals
    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(
          `/api/fan/access-tokens?payment_link_id=${encodeURIComponent(link.id)}&since=${encodeURIComponent(since)}`
        );
        const json = await res.json();
        if (json.token) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          window.location.href = `/fan/access/${json.token}`;
          return;
        }
      } catch (error) {
        console.error("[PayLinkClient] token polling failed", {
          payment_link_id: link.id,
          attempts,
          error,
        });
      }
      if (attempts >= maxAttempts) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        setState("verify"); // fallback: email form
      }
    }, 2000);
  }

  function startCheckout() {
    if (!checkoutUrl) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("cipher_checkout_started", Date.now().toString());
    }
    setState("redirecting");
    window.location.href = checkoutUrl;
  }

  const isUnlocked = state === "unlocked";

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
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
          MULUK
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
          {/* Banner */}
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

            {/* ── UNLOCKED ── */}
            {state === "unlocked" && unlockedContent && (
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
                  content_value={unlockedContent}
                  content_type={link.content_type}
                />
              </div>
            )}

            {/* ── REDIRECTING ── */}
            {state === "redirecting" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "14px",
                  padding: "24px 0",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <Spinner />
                <span style={{ ...mono, fontSize: "11px", letterSpacing: "0.14em" }}>
                  REDIRECTING TO CHECKOUT…
                </span>
              </div>
            )}

            {/* ── UNLOCKING (polling for webhook) ── */}
            {state === "unlocking" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "14px",
                  padding: "24px 0",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <Spinner />
                <span style={{ ...mono, fontSize: "11px", letterSpacing: "0.14em" }}>
                  UNLOCKING YOUR CONTENT…
                </span>
                <span style={{ ...mono, fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)" }}>
                  Confirming your payment
                </span>
              </div>
            )}

            {/* ── CHECKING ── */}
            {state === "checking" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "14px",
                  padding: "24px 0",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <Spinner />
                <span style={{ ...mono, fontSize: "11px", letterSpacing: "0.14em" }}>
                  VERIFYING PURCHASE…
                </span>
              </div>
            )}

            {/* ── VERIFY (email form) ── */}
            {state === "verify" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(200,169,110,0.07)",
                    border: "1px solid rgba(200,169,110,0.2)",
                    borderRadius: "8px",
                    ...mono,
                    fontSize: "10px",
                    letterSpacing: "0.12em",
                    color: "rgba(200,169,110,0.75)",
                  }}
                >
                  PAYMENT RECEIVED — ENTER YOUR EMAIL TO UNLOCK
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") verifyByEmail(); }}
                    placeholder="your@email.com"
                    autoComplete="email"
                    style={{
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${emailError ? "rgba(224,85,85,0.5)" : "rgba(255,255,255,0.12)"}`,
                      borderRadius: "8px",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: "14px",
                      outline: "none",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  {emailError && (
                    <span style={{ ...mono, fontSize: "10px", color: "#e05555", letterSpacing: "0.1em" }}>
                      {emailError}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={verifyByEmail}
                  style={{
                    padding: "14px",
                    background: "var(--gold, #c8a96e)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#120c00",
                    ...mono,
                    fontSize: "12px",
                    letterSpacing: "0.18em",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  UNLOCK ACCESS
                </button>

                <button
                  type="button"
                  onClick={() => setState("locked")}
                  style={{
                    background: "transparent",
                    border: "none",
                    ...mono,
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.3)",
                    letterSpacing: "0.12em",
                    cursor: "pointer",
                    padding: "4px 0",
                  }}
                >
                  ← HAVEN&apos;T PAID YET?
                </button>
              </div>
            )}

            {/* ── LOCKED ── */}
            {state === "locked" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Blurred preview */}
                {link.content_type === "text" && (
                  <div
                    style={{
                      padding: "16px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      color: "rgba(255,255,255,0.6)",
                      lineHeight: 1.7,
                      filter: "blur(4px)",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                  >
                    {(link.content_value?.trim() || "Exclusive premium content").slice(0, 280)}
                  </div>
                )}
                {link.content_type === "file" && (
                  <div
                    style={{
                      padding: "16px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      ...mono,
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.3)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    🔒 LOCKED FILE — COMPLETE PURCHASE TO DOWNLOAD
                  </div>
                )}

                {/* Checkout button */}
                {checkoutUrl ? (
                  <button
                    type="button"
                    onClick={startCheckout}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "14px",
                      background: "var(--gold, #c8a96e)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#120c00",
                      ...mono,
                      fontSize: "12px",
                      letterSpacing: "0.18em",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                  >
                    UNLOCK — {money.format(link.price / 100)}
                  </button>
                ) : (
                  <div
                    style={{
                      padding: "14px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      ...mono,
                      fontSize: "11px",
                      letterSpacing: "0.14em",
                      color: "rgba(255,255,255,0.3)",
                      textAlign: "center",
                    }}
                  >
                    CHECKOUT NOT YET CONFIGURED
                  </div>
                )}

                {/* Already paid link */}
                <button
                  type="button"
                  onClick={() => setState("verify")}
                  style={{
                    background: "transparent",
                    border: "none",
                    ...mono,
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.3)",
                    letterSpacing: "0.12em",
                    cursor: "pointer",
                    padding: "4px 0",
                    textAlign: "center",
                  }}
                >
                  ALREADY PAID? ENTER EMAIL TO UNLOCK →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            ...mono,
            marginTop: "24px",
            fontSize: "10px",
            letterSpacing: "0.14em",
            color: "rgba(255,255,255,0.18)",
          }}
        >
          Secured by Cipher · Powered by Whop
        </div>
      </div>
    </>
  );
}
