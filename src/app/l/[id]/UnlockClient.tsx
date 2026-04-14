"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  linkId:   string;
  title:    string | null;
  price:    number;   // cents
  fileType: string;
  fileName: string;
}

type Phase =
  | "checking"   // looking up stored token or URL param
  | "locked"     // no valid token — show CTA
  | "preparing"  // calling /checkout to get Whop URL
  | "redirecting"// about to navigate to Whop
  | "polling"    // returned from Whop, waiting for webhook to mark paid
  | "unlocked"   // paid + content URL in hand
  | "error";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

function fileIcon(mime: string) {
  if (mime.startsWith("image/"))  return "◈";
  if (mime.startsWith("video/"))  return "▶";
  if (mime.startsWith("audio/"))  return "♫";
  if (mime === "application/pdf") return "◻";
  if (mime === "application/zip") return "◼";
  return "◉";
}

function fileLabel(mime: string) {
  if (mime.startsWith("image/"))  return "Image";
  if (mime.startsWith("video/"))  return "Video";
  if (mime.startsWith("audio/"))  return "Audio";
  if (mime === "application/pdf") return "PDF";
  if (mime === "application/zip") return "Archive";
  return "File";
}

const GOLD = "#c8a96e";
const DIM  = "rgba(255,255,255,0.38)";
const MONO = { fontFamily: "'DM Mono', monospace" }    as const;
const SANS = { fontFamily: "'Outfit', sans-serif" }    as const;
const SERIF= { fontFamily: "'Cormorant Garamond', serif" } as const;

const TOKEN_KEY = (id: string) => `ml_access_${id}`;

// ── Root component ─────────────────────────────────────────────────────────

export default function UnlockClient({ linkId, title, price, fileType, fileName }: Props) {
  const [phase,      setPhase]      = useState<Phase>("checking");
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [errMsg,     setErrMsg]     = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Try to access content with a stored buyer_token ───────────────────

  const tryAccess = useCallback(async (token: string): Promise<boolean> => {
    try {
      const r = await fetch(`/api/instant-links/${linkId}/access`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ buyer_token: token }),
      });
      if (r.status === 402) return false; // still pending — caller should retry
      if (!r.ok) {
        localStorage.removeItem(TOKEN_KEY(linkId));
        return false;
      }
      const d = await r.json();
      if (d.url) {
        setContentUrl(d.url);
        setPhase("unlocked");
        return true;
      }
    } catch { /* network error — caller retries */ }
    return false;
  }, [linkId]);

  // ── On mount: check URL param (?token=…) then localStorage ───────────

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get("token");
    const lsToken  = localStorage.getItem(TOKEN_KEY(linkId));
    const token    = urlToken ?? lsToken ?? null;

    if (!token) { setPhase("locked"); return; }

    // Persist token from URL into localStorage for future re-access
    if (urlToken) localStorage.setItem(TOKEN_KEY(linkId), urlToken);

    // Try immediately; if still pending (webhook in-flight), start polling
    tryAccess(token).then(ok => {
      if (!ok) {
        setPhase("polling");
        startPolling(token);
      }
    });

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Polling: webhook may arrive a second or two after redirect ────────

  function startPolling(token: string) {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      const ok = await tryAccess(token);
      if (ok || attempts >= 12) {
        stopPolling();
        if (!ok) {
          setErrMsg("Payment received but access is taking longer than expected. Please refresh the page.");
          setPhase("error");
        }
      }
    }, 1500);
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  // ── Handle "Unlock Now" click → provision Whop → redirect ────────────

  const handleUnlock = useCallback(async () => {
    setPhase("preparing");
    setErrMsg(null);
    try {
      const r = await fetch(`/api/instant-links/${linkId}/checkout`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Checkout unavailable");

      const { whop_checkout_url, buyer_token } = d as { whop_checkout_url: string; buyer_token: string };
      if (!whop_checkout_url) throw new Error("No checkout URL returned");

      // Store token BEFORE redirecting so re-access works on return
      localStorage.setItem(TOKEN_KEY(linkId), buyer_token);

      setPhase("redirecting");
      // Small delay so the state change renders before navigation
      setTimeout(() => { window.location.href = whop_checkout_url; }, 120);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Could not create checkout");
      setPhase("error");
    }
  }, [linkId]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (phase === "unlocked" && contentUrl) {
    return (
      <Shell>
        <ContentReveal url={contentUrl} fileType={fileType} fileName={fileName} title={title} />
      </Shell>
    );
  }

  return (
    <Shell>
      <LockedCard
        title={title}
        price={price}
        fileType={fileType}
        fileName={fileName}
        phase={phase}
        errMsg={errMsg}
        onUnlock={handleUnlock}
        onRetry={() => { setErrMsg(null); setPhase("locked"); }}
      />
    </Shell>
  );
}

// ── Page shell ─────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      minHeight:     "100vh",
      background:    "#020203",
      color:         "rgba(255,255,255,0.92)",
      display:       "flex",
      flexDirection: "column",
      alignItems:    "center",
      justifyContent:"center",
      padding:       "40px 20px",
      position:      "relative",
    }}>
      <div aria-hidden style={{
        position:        "fixed",
        inset:           0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
        pointerEvents:   "none",
        zIndex:          0,
      }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: "0.38em", color: "rgba(200,169,110,0.4)", marginBottom: 48, textTransform: "uppercase" }}>
          MULUK
        </div>
        {children}
      </div>
    </main>
  );
}

// ── Locked card ─────────────────────────────────────────────────────────────

function LockedCard({
  title, price, fileType, fileName, phase, errMsg, onUnlock, onRetry,
}: {
  title:    string | null;
  price:    number;
  fileType: string;
  fileName: string;
  phase:    Phase;
  errMsg:   string | null;
  onUnlock: () => void;
  onRetry:  () => void;
}) {
  const busy = phase === "preparing" || phase === "redirecting" || phase === "checking" || phase === "polling";

  const ctaLabel =
    phase === "checking"    ? "Checking…" :
    phase === "preparing"   ? "Preparing checkout…" :
    phase === "redirecting" ? "Redirecting to Whop…" :
    phase === "polling"     ? "Confirming payment…" :
    "Unlock Now";

  return (
    <div style={{
      width:        "100%",
      maxWidth:     440,
      display:      "flex",
      flexDirection:"column",
      gap:          0,
    }}>
      <div style={{
        background:   "rgba(255,255,255,0.025)",
        border:       "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding:      "40px 36px",
        textAlign:    "center",
        position:     "relative",
        overflow:     "hidden",
      }}>
        {/* Gold top glow */}
        <div aria-hidden style={{
          position:   "absolute",
          top:        -1,
          left:       "20%",
          right:      "20%",
          height:     1,
          background: `linear-gradient(90deg, transparent, ${GOLD}60, transparent)`,
        }} />

        {/* Icon */}
        <div style={{
          width:        72,
          height:       72,
          borderRadius: "50%",
          background:   "rgba(200,169,110,0.08)",
          border:       `1px solid rgba(200,169,110,0.22)`,
          display:      "grid",
          placeItems:   "center",
          margin:       "0 auto 24px",
          fontSize:     busy ? 22 : 28,
          animation:    busy ? "spin 1.2s linear infinite" : "none",
        }}>
          {busy ? "◌" : "🔒"}
        </div>

        {/* File type badge */}
        <div style={{
          display:       "inline-flex",
          alignItems:    "center",
          gap:           6,
          padding:       "4px 10px",
          border:        "1px solid rgba(255,255,255,0.08)",
          borderRadius:  20,
          ...MONO,
          fontSize:      9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color:         DIM,
          marginBottom:  16,
        }}>
          <span>{fileIcon(fileType)}</span>
          {fileLabel(fileType)}
        </div>

        {/* Title */}
        <div style={{
          ...SERIF,
          fontSize:      "clamp(22px, 5vw, 30px)",
          fontWeight:    300,
          letterSpacing: "-0.01em",
          lineHeight:    1.2,
          marginBottom:  8,
          color:         "rgba(255,255,255,0.88)",
        }}>
          {title ?? fileName}
        </div>

        <div style={{ ...SANS, fontSize: 13, color: DIM, marginBottom: 32, fontWeight: 300 }}>
          {phase === "polling" ? "Verifying your payment…" : "Locked content — pay once, access forever"}
        </div>

        {/* Price */}
        <div style={{
          ...MONO,
          fontSize:      "clamp(28px, 6vw, 38px)",
          color:         GOLD,
          letterSpacing: "-0.02em",
          marginBottom:  28,
        }}>
          {fmtPrice(price)}
        </div>

        {/* CTA */}
        <button
          onClick={onUnlock}
          disabled={busy || phase === "error"}
          style={{
            width:         "100%",
            padding:       "17px 0",
            background:    busy ? "rgba(200,169,110,0.35)" : GOLD,
            color:         "#0a0800",
            border:        "none",
            borderRadius:  6,
            ...MONO,
            fontSize:      12,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight:    500,
            cursor:        busy || phase === "error" ? "default" : "pointer",
            transition:    "opacity 0.15s",
          }}
          onMouseEnter={e => { if (!busy) e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          {ctaLabel}
        </button>

        <div style={{ ...SANS, fontSize: 11, color: "rgba(255,255,255,0.18)", marginTop: 14, fontWeight: 300 }}>
          Apple Pay · Card · Instant access · Powered by Whop
        </div>
      </div>

      {/* Error state */}
      {phase === "error" && errMsg && (
        <div style={{
          marginTop:    12,
          background:   "rgba(224,85,85,0.08)",
          border:       "1px solid rgba(224,85,85,0.2)",
          borderRadius: 6,
          padding:      "14px 16px",
          fontSize:     13,
          color:        "#e05555",
          ...SANS,
          display:      "flex",
          justifyContent:"space-between",
          alignItems:   "center",
          gap:          12,
        }}>
          <span>{errMsg}</span>
          <button
            onClick={onRetry}
            style={{
              background:    "none",
              border:        "none",
              color:         "rgba(255,255,255,0.35)",
              cursor:        "pointer",
              ...MONO,
              fontSize:      10,
              letterSpacing: "0.12em",
              flexShrink:    0,
            }}
          >
            Retry
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Content reveal ──────────────────────────────────────────────────────────

function ContentReveal({
  url, fileType, fileName, title,
}: {
  url:      string;
  fileType: string;
  fileName: string;
  title:    string | null;
}) {
  const isImage = fileType.startsWith("image/");
  const isVideo = fileType.startsWith("video/");
  const isAudio = fileType.startsWith("audio/");

  return (
    <div style={{ width: "100%", maxWidth: 600, animation: "slideUp 0.3s ease" }}>
      <div style={{
        display:        "flex",
        alignItems:     "center",
        gap:            8,
        justifyContent: "center",
        marginBottom:   24,
        ...MONO,
        fontSize:       10,
        letterSpacing:  "0.2em",
        color:          "#50d48a",
        textTransform:  "uppercase",
      }}>
        <span style={{ fontSize: 14 }}>✓</span> Unlocked
      </div>

      {title && (
        <div style={{
          ...SERIF,
          fontSize:      "clamp(20px, 4vw, 28px)",
          fontWeight:    300,
          color:         "rgba(255,255,255,0.88)",
          textAlign:     "center",
          marginBottom:  24,
          letterSpacing: "-0.01em",
        }}>
          {title}
        </div>
      )}

      <div style={{
        background:   "rgba(255,255,255,0.025)",
        border:       "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        overflow:     "hidden",
      }}>
        {isImage && (
          <img src={url} alt={title ?? fileName} style={{ width: "100%", display: "block", maxHeight: "70vh", objectFit: "contain" }} />
        )}
        {isVideo && (
          <video src={url} controls autoPlay style={{ width: "100%", display: "block", maxHeight: "70vh" }} />
        )}
        {isAudio && (
          <div style={{ padding: "32px 24px" }}>
            <div style={{ ...SANS, fontSize: 13, color: DIM, marginBottom: 16, textAlign: "center" }}>{fileName}</div>
            <audio src={url} controls style={{ width: "100%" }} />
          </div>
        )}
        {!isImage && !isVideo && !isAudio && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{fileIcon(fileType)}</div>
            <div style={{ ...SANS, fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 24 }}>{fileName}</div>
            <a
              href={url}
              download={fileName}
              style={{
                display:        "inline-block",
                padding:        "13px 28px",
                background:     GOLD,
                color:          "#0a0800",
                borderRadius:   5,
                ...MONO,
                fontSize:       11,
                letterSpacing:  "0.18em",
                textTransform:  "uppercase",
                textDecoration: "none",
                fontWeight:     500,
              }}
            >
              Download File
            </a>
          </div>
        )}
      </div>

      <p style={{ ...SANS, fontSize: 11, color: "rgba(255,255,255,0.18)", textAlign: "center", marginTop: 16, fontWeight: 300 }}>
        Your access is saved in this browser · Return anytime via the same link
      </p>
    </div>
  );
}
