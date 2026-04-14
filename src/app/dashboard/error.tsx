"use client";

import { useEffect } from "react";
import Link from "next/link";

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;
const body = { fontFamily: "var(--font-body, 'Outfit', sans-serif)" } as const;
const GOLD = "var(--gold, #c8a96e)";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] unhandled error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020203",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px", textAlign: "center" }}>
        <div style={{ ...mono, fontSize: "11px", letterSpacing: "0.22em", color: GOLD, marginBottom: "24px" }}>
          DASHBOARD ERROR
        </div>

        <div
          style={{
            width: "56px",
            height: "56px",
            margin: "0 auto 24px",
            borderRadius: "50%",
            border: "1px solid rgba(200,169,110,0.25)",
            background: "rgba(200,169,110,0.06)",
            display: "grid",
            placeItems: "center",
            ...mono,
            fontSize: "20px",
            color: GOLD,
          }}
        >
          ✕
        </div>

        <h1
          style={{
            ...body,
            fontSize: "20px",
            fontWeight: 400,
            color: "rgba(255,255,255,0.85)",
            margin: "0 0 12px",
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            ...body,
            fontSize: "13px",
            color: "rgba(255,255,255,0.35)",
            margin: "0 0 8px",
            lineHeight: 1.6,
          }}
        >
          {error.message?.slice(0, 200) || "An unexpected error occurred on this page."}
        </p>

        {error.digest && (
          <p
            style={{
              ...mono,
              fontSize: "10px",
              color: "rgba(255,255,255,0.18)",
              margin: "0 0 32px",
              letterSpacing: "0.08em",
            }}
          >
            ID: {error.digest}
          </p>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "32px" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "11px 24px",
              background: GOLD,
              border: "none",
              borderRadius: "6px",
              color: "#0a0800",
              ...mono,
              fontSize: "11px",
              letterSpacing: "0.14em",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            TRY AGAIN
          </button>

          <Link
            href="/dashboard"
            style={{
              padding: "11px 24px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "rgba(255,255,255,0.48)",
              ...mono,
              fontSize: "11px",
              letterSpacing: "0.14em",
              textDecoration: "none",
            }}
          >
            DASHBOARD
          </Link>
        </div>
      </div>
    </div>
  );
}
