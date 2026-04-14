const PULSE = `@keyframes dlPulse { 0%,100%{opacity:0.35} 50%{opacity:0.85} }`;
const bar = (w: string, h = "14px", mb = "0px") => ({
  width: w,
  height: h,
  borderRadius: "5px",
  border: "1px solid rgba(200,169,110,0.18)",
  background: "rgba(200,169,110,0.055)",
  animation: "dlPulse 1.3s ease-in-out infinite",
  marginBottom: mb,
});

export default function DashboardPageLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      style={{ padding: "28px", background: "#020203", minHeight: "100vh" }}
    >
      <style>{PULSE}</style>
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
        }}
      >
        Loading…
      </span>

      {/* Page title */}
      <div style={{ ...bar("180px", "12px", "6px") }} />
      <div style={{ ...bar("100px", "9px", "28px") }} />

      {/* Stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "12px", marginBottom: "20px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ ...bar("100%", "80px") }} />
        ))}
      </div>

      {/* Main content block */}
      <div style={{ ...bar("100%", "260px", "16px") }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ ...bar("100%", "140px") }} />
        <div style={{ ...bar("100%", "140px") }} />
      </div>
    </div>
  );
}
