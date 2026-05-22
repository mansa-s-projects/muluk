"use client";

import { useState } from "react";

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'DM Mono', monospace)",
};

type Props = {
  whopLink: string | null;
  offerId: string;
};

export default function BuyButton({ whopLink, offerId }: Props) {
  const [clicked, setClicked] = useState(false);

  if (!whopLink) {
    return (
      <div style={{
        padding: "14px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "8px",
        textAlign: "center",
        ...mono,
        fontSize: "11px",
        letterSpacing: "0.14em",
        color: "rgba(255,255,255,0.2)",
      }}>
        CHECKOUT NOT YET CONFIGURED
      </div>
    );
  }

  async function handleBuy() {
    if (!whopLink) return;
    setClicked(true);

    // Log the event server-side via API, then redirect.
    // await so the request fires before navigation — still fast (<50 ms).
    try {
      await fetch("/api/offers/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offerId }),
      });
    } catch {
      // Never block the redirect on a logging failure
    }

    window.location.href = whopLink;
  }

  return (
    <button
      type="button"
      onClick={handleBuy}
      disabled={clicked}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        padding: "15px 28px",
        background: clicked ? "rgba(200,169,110,0.4)" : "var(--gold, #c8a96e)",
        border: "none",
        borderRadius: "8px",
        color: "#0a0800",
        ...mono,
        fontSize: "12px",
        letterSpacing: "0.2em",
        fontWeight: 600,
        cursor: clicked ? "not-allowed" : "pointer",
        transition: "background 0.2s, opacity 0.2s",
      }}
    >
      {clicked ? (
        <>
          <Spinner />
          REDIRECTING…
        </>
      ) : (
        <>
          <LockIcon />
          BUY NOW
        </>
      )}
    </button>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes _s { to { transform: rotate(360deg); } }`}</style>
      <span style={{
        display: "inline-block",
        width: "12px",
        height: "12px",
        border: "1.5px solid rgba(10,8,0,0.25)",
        borderTopColor: "#0a0800",
        borderRadius: "50%",
        animation: "_s 0.65s linear infinite",
        flexShrink: 0,
      }} />
    </>
  );
}
