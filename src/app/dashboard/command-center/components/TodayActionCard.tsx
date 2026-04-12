"use client";

import Link from "next/link";
import { fmt } from "@/app/dashboard/_lib/helpers";
import { GOLD, mono, body, display, card } from "@/app/dashboard/_lib/tokens";
import type { DashboardStats, TodayAction } from "@/app/dashboard/_lib/types";

function GoldBtn({ children, href, onClick }: { children: React.ReactNode; href?: string; onClick?: () => void }) {
  const style: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: GOLD, color: "#0a0a0a", border: "none", borderRadius: "6px",
    padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
    letterSpacing: "0.04em", textDecoration: "none", whiteSpace: "nowrap", ...mono,
  };
  if (href) return <Link href={href} style={style}>{children}</Link>;
  return <button type="button" onClick={onClick} style={style}>{children}</button>;
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      background: "transparent", color: "rgba(255,255,255,0.5)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px",
      padding: "8px 14px", fontSize: "12px", cursor: "pointer",
      letterSpacing: "0.03em", ...body,
    }}>
      {children}
    </button>
  );
}

interface TodayActionCardProps {
  stats: DashboardStats;
  action?: TodayAction | null;
  onCreateDrop: () => void;
}

export function TodayActionCard({ stats, action, onCreateDrop }: TodayActionCardProps) {
  const gap = stats.bestDayRevenue - stats.todayRevenue;
  const progress =
    stats.bestDayRevenue > 0
      ? Math.min((stats.todayRevenue / stats.bestDayRevenue) * 100, 100)
      : 0;

  // Prefer server-computed action; fall back to stats-derived heuristic
  const label = action?.label ?? (
    gap > 0 && stats.bestDayRevenue > 0
      ? `Send paid offers to activate ${stats.onlineNow} members online now`
      : stats.todayRevenue > 0
      ? "Strong day — push a drop to lock in more revenue"
      : "No revenue yet today. Send a paid message to your top members"
  );

  const why = action?.reason ?? (
    gap > 0 && stats.bestDayRevenue > 0
      ? `You're ${fmt(gap)} away from your best day. ${stats.onlineNow} members are online right now.`
      : "Momentum is yours. A timed drop converts 3–5× better than a static offer."
  );

  const ctaHref = action?.cta_target;
  const showDropCta = !action || action.action_type === "no_active_drop";

  return (
    <div style={{
      ...card,
      padding: "32px",
      borderColor: "rgba(200,169,110,0.15)",
      background: "linear-gradient(135deg, #0f0f0f 0%, #111 60%, rgba(200,169,110,0.04) 100%)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        {/* Left */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.2em", color: GOLD, marginBottom: "10px", opacity: 0.7 }}>
            TODAY&apos;S ACTION
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 400, color: "#fff", margin: "0 0 8px", lineHeight: 1.35, ...display }}>
            {label}
          </h2>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: "0 0 20px", ...body }}>{why}</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {ctaHref ? (
              <GoldBtn href={ctaHref}>Take Action →</GoldBtn>
            ) : (
              <GoldBtn href="/dashboard/direct-line">Send Offer →</GoldBtn>
            )}
            {showDropCta && <GhostBtn onClick={onCreateDrop}>Create Drop</GhostBtn>}
          </div>
        </div>

        {/* Right: stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 160, textAlign: "right" }}>
          <div>
            <div style={{ ...mono, fontSize: "28px", color: GOLD, fontWeight: 300 }}>{fmt(stats.todayRevenue)}</div>
            <div style={{ ...body, fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>today&apos;s revenue</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
            <span style={{ ...body, fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{stats.onlineNow} online</span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
          </div>
        </div>
      </div>

      {stats.bestDayRevenue > 0 && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em" }}>
              PROGRESS TO BEST DAY
            </span>
            <span style={{ ...mono, fontSize: "10px", color: GOLD }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: "2px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: GOLD, borderRadius: "2px", transition: "width 0.8s ease" }} />
          </div>
          <div style={{ ...body, fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "5px" }}>
            Best day: {fmt(stats.bestDayRevenue)}
          </div>
        </div>
      )}
    </div>
  );
}
