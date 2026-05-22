import Link from "next/link";

export default function ErrorPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#020203",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      color: "rgba(255,255,255,0.92)",
      fontFamily: "var(--font-body), sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "480px",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "var(--font-display), serif",
          fontSize: "64px",
          color: "#c8a96e",
          marginBottom: "24px",
        }}>⚠</div>

        <h1 style={{
          fontFamily: "var(--font-display), serif",
          fontSize: "28px",
          fontWeight: 300,
          marginBottom: "16px",
        }}>Something went wrong</h1>

        <p style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.48)",
          marginBottom: "32px",
          lineHeight: 1.6,
        }}>
          An unexpected error occurred. Please try again or return home.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Link
            href="/"
            style={{
              padding: "14px 28px",
              background: "#c8a96e",
              border: "none",
              borderRadius: "4px",
              color: "#0a0800",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "12px",
              letterSpacing: "0.15em",
              textDecoration: "none",
              textTransform: "uppercase",
            }}
          >
            Go Home
          </Link>

          <Link
            href="/dashboard"
            style={{
              padding: "14px 28px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "4px",
              color: "rgba(255,255,255,0.7)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "12px",
              letterSpacing: "0.15em",
              textDecoration: "none",
              textTransform: "uppercase",
            }}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
