export default function LoadingPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#020203",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "24px",
    }}>
      <div style={{
        width: "48px",
        height: "48px",
        border: "2px solid rgba(200,169,110,0.1)",
        borderTopColor: "#c8a96e",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />

      <div style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: "12px",
        letterSpacing: "0.2em",
        color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase",
      }}>
        Loading CIPHER
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
