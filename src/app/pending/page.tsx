import Link from "next/link";

export const metadata = {
  title: "Application Under Review — MULUK",
  robots: { index: false, follow: false },
};

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" };

export default function PendingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020203",
        backgroundImage: "radial-gradient(circle at 50% 20%, rgba(200,169,110,0.07), transparent 50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      {/* Wordmark */}
      <div style={{ ...mono, fontSize: "12px", letterSpacing: "0.35em", color: "rgba(200,169,110,0.5)", marginBottom: "48px" }}>
        MULUK
      </div>

      {/* Icon */}
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "1px solid rgba(200,169,110,0.3)",
          background: "rgba(200,169,110,0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "28px",
        }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#c8a96e" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Heading */}
      <h1
        style={{
          ...disp,
          fontSize: "clamp(28px, 5vw, 42px)",
          fontWeight: 300,
          fontStyle: "italic",
          color: "rgba(255,255,255,0.9)",
          margin: "0 0 14px",
          lineHeight: 1.1,
        }}
      >
        Application Under Review
      </h1>

      {/* Subtext */}
      <p
        style={{
          fontSize: "15px",
          fontWeight: 300,
          color: "rgba(255,255,255,0.45)",
          lineHeight: 1.8,
          maxWidth: "420px",
          margin: "0 0 40px",
        }}
      >
        We review every application personally.
        <br />
        Check your inbox — you&apos;ll hear from us within 48 hours.
      </p>

      {/* Divider */}
      <div
        style={{
          width: "60px",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.35), transparent)",
          marginBottom: "40px",
        }}
      />

      {/* What to expect */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "340px", marginBottom: "44px" }}>
        {[
          ["✦", "Confirmation email sent to your inbox"],
          ["✦", "Personal review within 48 hours"],
          ["✦", "88% payout rate once you're in"],
        ].map(([icon, text]) => (
          <div
            key={text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 16px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "8px",
            }}
          >
            <span style={{ color: "rgba(200,169,110,0.5)", fontSize: "10px" }}>{icon}</span>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>{text}</span>
          </div>
        ))}
      </div>

      <Link
        href="/"
        style={{
          ...mono,
          fontSize: "10px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.25)",
          textDecoration: "none",
          transition: "color 0.15s",
        }}
      >
        ← Back to MULUK
      </Link>
    </div>
  );
}
