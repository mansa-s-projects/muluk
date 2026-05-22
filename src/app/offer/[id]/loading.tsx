// loading.tsx — shown while the server component fetches the offer from Supabase.
// Next.js App Router renders this automatically via Suspense streaming.

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'DM Mono', monospace)",
};

function Bone({ w, h, radius = 6 }: { w: string; h: number; radius?: number }) {
  return (
    <div style={{
      width: w,
      height: `${h}px`,
      borderRadius: `${radius}px`,
      background: "rgba(255,255,255,0.05)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Shimmer sweep */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
        animation: "shimmer 1.6s ease-in-out infinite",
      }} />
    </div>
  );
}

export default function OfferLoading() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%);  }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#020203",
        backgroundImage: "radial-gradient(ellipse 70% 40% at 60% 0%, rgba(200,169,110,0.06), transparent)",
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

        {/* Card skeleton */}
        <div style={{
          width: "100%",
          maxWidth: "520px",
          background: "#0f0f1e",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "16px",
          overflow: "hidden",
        }}>

          {/* Thumbnail skeleton */}
          <div style={{
            width: "100%",
            height: "140px",
            background: "rgba(255,255,255,0.03)",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
              animation: "shimmer 1.6s ease-in-out infinite",
            }} />
          </div>

          {/* Body skeleton */}
          <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Eyebrow */}
            <Bone w="120px" h={10} />

            {/* Title + price row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                <Bone w="80%" h={28} radius={4} />
                <Bone w="55%" h={28} radius={4} />
              </div>
              <Bone w="68px" h={26} radius={4} />
            </div>

            {/* Description lines */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
              <Bone w="100%" h={14} />
              <Bone w="92%"  h={14} />
              <Bone w="76%"  h={14} />
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.04)", margin: "4px 0" }} />

            {/* Button skeleton */}
            <Bone w="100%" h={48} radius={8} />

            {/* Trust line */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Bone w="200px" h={10} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
