import Link from "next/link";

export default function PendingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
          "radial-gradient(circle at top, rgba(200,169,110,0.10), transparent 32%), #060610",
      }}
    >
      {/* Ambient top glow */}
      <div
        aria-hidden
        style={{
          pointerEvents: "none",
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(200,169,110,0.08) 0%, transparent 70%)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "460px",
          margin: "0 auto",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "6px",
          padding: "48px 32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          textAlign: "center",
        }}
      >
        {/* Gold top line */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: "32px",
            right: "32px",
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(200,169,110,0.55), transparent)",
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            margin: "0 auto 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            color: "#c8a96e",
            background:
              "linear-gradient(135deg, rgba(200,169,110,0.18), rgba(200,169,110,0.04))",
            border: "1px solid rgba(200,169,110,0.28)",
          }}
        >
          ✦
        </div>

        {/* Label */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(200,169,110,0.55)",
            marginBottom: "12px",
          }}
        >
          MULUK Access
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "36px",
            fontWeight: 300,
            fontStyle: "italic",
            color: "#c8a96e",
            marginBottom: "16px",
            lineHeight: 1.1,
          }}
        >
          Under Review
        </h1>

        {/* Subtext */}
        <p
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: "15px",
            lineHeight: 1.7,
            marginBottom: "10px",
          }}
        >
          Your access is under review.
        </p>

        {/* Small text */}
        <p
          style={{
            color: "rgba(255,255,255,0.28)",
            fontSize: "13px",
            lineHeight: 1.7,
            marginBottom: "36px",
          }}
        >
          We manually review every creator. You&apos;ll be notified once approved.
        </p>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: "rgba(255,255,255,0.06)",
            marginBottom: "28px",
          }}
        />

        {/* Return button */}
        <Link
          href="/"
          style={{
            display: "inline-block",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "13px 32px",
            borderRadius: "3px",
            textDecoration: "none",
            background: "transparent",
            color: "#c8a96e",
            border: "1px solid rgba(200,169,110,0.3)",
            transition: "all 0.25s",
          }}
        >
          Return
        </Link>
      </div>
    </main>
  );
}
