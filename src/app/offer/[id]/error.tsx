"use client";

// error.tsx — catches unexpected errors thrown during server-side rendering
// of the offer page (e.g. Supabase connection failure, unexpected null, etc.).
// Must be a Client Component — Next.js requirement for error boundaries.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'DM Mono', monospace)",
};
const disp: React.CSSProperties = {
  fontFamily: "var(--font-display, 'Cormorant Garamond', serif)",
};

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OfferError({ error, reset }: Props) {
  const router = useRouter();

  useEffect(() => {
    // Log to console so it surfaces in server/Vercel logs
    console.error("[offer/[id]] render error:", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020203",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 20px",
    }}>

      {/* Wordmark */}
      <div style={{
        ...mono,
        fontSize: "11px",
        letterSpacing: "0.35em",
        color: "rgba(200,169,110,0.35)",
        marginBottom: "44px",
      }}>
        MULUK
      </div>

      {/* Error card */}
      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "#0f0f1e",
        border: "1px solid rgba(224,85,85,0.2)",
        borderRadius: "16px",
        padding: "40px 32px",
        textAlign: "center",
      }}>
        {/* Icon */}
        <div style={{
          width: "48px",
          height: "48px",
          background: "rgba(224,85,85,0.08)",
          border: "1px solid rgba(224,85,85,0.2)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          color: "#e05555",
        }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
        </div>

        {/* Heading */}
        <h2 style={{
          ...disp,
          fontSize: "26px",
          fontWeight: 300,
          color: "rgba(255,255,255,0.88)",
          margin: "0 0 10px",
        }}>
          Something went wrong
        </h2>

        {/* Message */}
        <p style={{
          fontSize: "13px",
          fontWeight: 300,
          color: "rgba(255,255,255,0.38)",
          lineHeight: 1.7,
          margin: "0 0 28px",
          fontFamily: "var(--font-body, 'Outfit', sans-serif)",
        }}>
          We couldn&apos;t load this offer right now. This is usually temporary.
        </p>

        {/* Error digest — helps correlate with Vercel logs */}
        {error.digest && (
          <div style={{
            ...mono,
            fontSize: "10px",
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.15)",
            marginBottom: "24px",
          }}>
            ERR · {error.digest}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "12px 24px",
              background: "var(--gold, #c8a96e)",
              border: "none",
              borderRadius: "6px",
              color: "#0a0800",
              ...mono,
              fontSize: "10px",
              letterSpacing: "0.18em",
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
          >
            TRY AGAIN
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            style={{
              padding: "12px 24px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "6px",
              color: "rgba(255,255,255,0.4)",
              ...mono,
              fontSize: "10px",
              letterSpacing: "0.18em",
              cursor: "pointer",
              transition: "border-color 0.15s, color 0.15s",
            }}
          >
            GO HOME
          </button>
        </div>
      </div>
    </div>
  );
}
