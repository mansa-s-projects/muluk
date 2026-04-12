export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label="Loading content" style={{
      minHeight: "100vh",
      background: "#020203",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "24px",
    }}>
      <div aria-hidden="true" style={{
        width: "48px",
        height: "48px",
        border: "2px solid rgba(200,169,110,0.1)",
        borderTopColor: "#c8a96e",
        borderRadius: "50%",
        animation: "spinLoadingAnimation 1s linear infinite",
      }} />
      
      <div style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: "12px",
        letterSpacing: "0.2em",
        color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase",
      }}>
        Loading MULUK
      </div>

      <span style={{
        border: 0,
        clip: "rect(0 0 0 0)",
        height: "1px",
        margin: "-1px",
        overflow: "hidden",
        padding: 0,
        position: "absolute",
        width: "1px",
        whiteSpace: "nowrap",
      }}>
        Loading MULUK
      </span>

      <style>{`
        @keyframes spinLoadingAnimation {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
