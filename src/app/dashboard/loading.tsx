export default function DashboardLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020203",
        padding: "28px",
        display: "grid",
        gap: "12px",
      }}
    >
      <div style={{ width: "240px", height: "20px", borderRadius: "6px", border: "1px solid rgba(200,169,110,0.25)", background: "rgba(200,169,110,0.06)", animation: "pulse 1.2s ease-in-out infinite" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "10px" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: "120px", borderRadius: "8px", border: "1px solid rgba(200,169,110,0.25)", background: "rgba(200,169,110,0.06)", animation: "pulse 1.2s ease-in-out infinite" }} />
        ))}
      </div>
      <div style={{ height: "220px", borderRadius: "8px", border: "1px solid rgba(200,169,110,0.25)", background: "rgba(200,169,110,0.06)", animation: "pulse 1.2s ease-in-out infinite" }} />
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}
