"use client";

import { fmt } from "@/app/dashboard/_lib/helpers";
import { GOLD, G, mono, body } from "@/app/dashboard/_lib/tokens";
import type { DashboardStats } from "@/app/dashboard/_lib/types";

function tier(revenue: number): { label: string; next: string; progress: number } {
  if (revenue < 3000)  return { label: "Rising",  next: "Elite",  progress: revenue / 3000 * 100 };
  if (revenue < 10000) return { label: "Elite",   next: "Apex",   progress: (revenue - 3000) / 7000 * 100 };
  return { label: "Apex", next: "Apex", progress: 100 };
}

export function StatusBar({ stats }: { stats: DashboardStats }) {
  const { label, next, progress } = tier(stats.todayRevenue);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "24px",
      padding: "12px 20px",
      background: "#0d0d0d",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "8px",
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.2)" }}>STATUS</span>
        <span style={{ ...mono, fontSize: "11px", color: GOLD, letterSpacing: "0.1em" }}>{label.toUpperCase()}</span>
      </div>

      <div style={{ flex: 1, minWidth: 120, display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ flex: 1, height: "2px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: GOLD, borderRadius: "2px", transition: "width 0.8s ease" }} />
        </div>
        {label !== "Apex" && (
          <span style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)", whiteSpace: "nowrap" }}>→ {next}</span>
        )}
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        <div>
          <div style={{ ...mono, fontSize: "14px", color: "#fff", fontWeight: 300 }}>{stats.totalMembers}</div>
          <div style={{ ...body, fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>members</div>
        </div>
        <div>
          <div style={{ ...mono, fontSize: "14px", color: "#22c55e", fontWeight: 300 }}>{stats.onlineNow}</div>
          <div style={{ ...body, fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>online</div>
        </div>
        <div>
          <div style={{ ...mono, fontSize: "14px", color: GOLD, fontWeight: 300 }}>{fmt(stats.todayRevenue)}</div>
          <div style={{ ...body, fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>today</div>
        </div>
      </div>
    </div>
  );
}
