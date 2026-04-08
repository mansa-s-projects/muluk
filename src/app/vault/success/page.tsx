"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface UnlockData {
  signed_url: string;
  mime_type: string;
  title: string;
}

export default function VaultSuccessPage() {
  const params = useSearchParams();
  const token  = params.get("token") ?? "";
  const itemId = params.get("item") ?? "";

  const [state, setState] = useState<"pending" | "ready" | "error">("pending");
  const [unlock, setUnlock] = useState<UnlockData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!token || !itemId) {
      setState("error");
      setErrorMsg("Invalid access link.");
      return;
    }

    let cancelled = false;
    const MAX_POLLS = 18; // ~90 seconds

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/vault/${itemId}/view?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) { setUnlock(data); setState("ready"); }
          return;
        }
        if (res.status === 402) {
          // Still pending — keep polling
          setAttempts((n) => {
            const next = n + 1;
            if (next >= MAX_POLLS) {
              setState("error");
              setErrorMsg("Payment not confirmed yet. If you paid, please wait a moment and try refreshing.");
            } else {
              setTimeout(poll, 5000);
            }
            return next;
          });
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (!cancelled) {
          setState("error");
          setErrorMsg(json.error ?? "Could not verify access.");
        }
      } catch {
        if (!cancelled) setTimeout(poll, 5000);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [token, itemId]);

  const isImage = unlock?.mime_type.startsWith("image/");
  const isVideo = unlock?.mime_type.startsWith("video/");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--void)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
      }}
    >
      {/* Noise */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 640,
          textAlign: "center",
        }}
      >
        {/* ── PENDING ── */}
        {state === "pending" && (
          <div>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                border: "2px solid rgba(200,169,110,0.3)",
                borderTop: "2px solid var(--gold)",
                margin: "0 auto 24px",
                animation: "spin 1s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 300,
                fontSize: 32,
                color: "var(--white)",
                margin: "0 0 12px",
              }}
            >
              Confirming payment…
            </h1>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14,
                color: "var(--muted)",
                fontWeight: 300,
                margin: 0,
              }}
            >
              This usually takes a few seconds.
            </p>
          </div>
        )}

        {/* ── ERROR ── */}
        {state === "error" && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 300,
                fontSize: 30,
                color: "var(--white)",
                margin: "0 0 12px",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14,
                color: "var(--muted)",
                fontWeight: 300,
                margin: "0 0 28px",
                lineHeight: 1.6,
              }}
            >
              {errorMsg}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "none",
                border: "1px solid var(--rim2)",
                borderRadius: 3,
                color: "var(--muted)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "12px 24px",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── READY ── */}
        {state === "ready" && unlock && (
          <div>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--green-d)",
                border: "1px solid var(--green-b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                margin: "0 auto 24px",
              }}
            >
              ✓
            </div>

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--gold-dim)",
                marginBottom: 12,
              }}
            >
              Unlocked
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 300,
                fontSize: "clamp(26px, 5vw, 40px)",
                color: "var(--white)",
                margin: "0 0 28px",
                lineHeight: 1.2,
              }}
            >
              {unlock.title}
            </h1>

            {/* Media */}
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--rim2)",
                borderRadius: 10,
                overflow: "hidden",
                marginBottom: 24,
              }}
            >
              {isImage && (
                <img
                  src={unlock.signed_url}
                  alt={unlock.title}
                  style={{ width: "100%", display: "block", borderRadius: 10 }}
                />
              )}
              {isVideo && (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={unlock.signed_url}
                  controls
                  style={{ width: "100%", display: "block", borderRadius: 10 }}
                />
              )}
              {!isImage && !isVideo && (
                <div
                  style={{
                    padding: "40px 20px",
                    color: "var(--muted)",
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                  }}
                >
                  Your content is ready.
                </div>
              )}
            </div>

            {/* Download */}
            <a
              href={unlock.signed_url}
              download
              style={{
                display: "inline-block",
                background: "var(--gold)",
                color: "#0a0800",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "14px 32px",
                borderRadius: 3,
                textDecoration: "none",
                marginBottom: 16,
              }}
            >
              Download
            </a>

            <div style={{ marginTop: 12 }}>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--dim)",
                  letterSpacing: "0.08em",
                }}
              >
                Link expires in 1 hour · Bookmark this page before it expires
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
