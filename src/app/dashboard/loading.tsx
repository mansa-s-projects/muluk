export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading dashboard"
      style={{
        minHeight: "100vh",
        background: "#020203",
        padding: "28px",
        display: "grid",
        gap: "12px",
      }}
    >
      <span style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>Loading…</span>
      <div style={{ width: "240px", height: "20px", borderRadius: "6px", border: "1px solid rgba(200,169,110,0.25)", background: "rgba(200,169,110,0.06)", animation: "pulse 1.2s ease-in-out infinite" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "10px" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: "120px", borderRadius: "8px", border: "1px solid rgba(200,169,110,0.25)", background: "rgba(200,169,110,0.06)", animation: "pulse 1.2s ease-in-out infinite" }} />
        ))}
      </div>
      <div style={{ height: "220px", borderRadius: "8px", border: "1px solid rgba(200,169,110,0.25)", background: "rgba(200,169,110,0.06)", animation: "pulse 1.2s ease-in-out infinite" }} />
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}
