"use client";

import type { VaultItem } from "./AssetsTab";
import { GOLD, mono, body } from "@/app/dashboard/_lib/tokens";

function fmt(cents: number) {
  const dollars = cents / 100;
  if (dollars % 1 === 0) return `$${dollars}`;
  return `$${dollars.toFixed(2)}`;
}

export function PerformanceTab({ items }: { items: VaultItem[] }) {
  const totalUnlocks = items.reduce((s, i) => s + i.purchase_count, 0);
  const totalRevenue = items.reduce((s, i) => s + i.purchase_count * i.price_cents, 0);
  const activeItems = items.filter((i) => i.status === "active").length;

  const sorted = [...items].sort((a, b) => (b.purchase_count * b.price_cents) - (a.purchase_count * a.price_cents));

  const StatCard = ({ label, value }: { label: string; value: string }) => (
    <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "20px 24px" }}>
      <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.16em", color: "rgba(255,255,255,0.3)", marginBottom: "8px" }}>{label}</div>
      <div style={{ ...mono, fontSize: "26px", color: GOLD, fontWeight: 300 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        <StatCard label="TOTAL REVENUE" value={fmt(totalRevenue)} />
        <StatCard label="TOTAL UNLOCKS" value={String(totalUnlocks)} />
        <StatCard label="ACTIVE ITEMS" value={String(activeItems)} />
      </div>

      {/* Per-item breakdown */}
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 32px", ...body, fontSize: "14px", color: "rgba(255,255,255,0.2)" }}>
          No items yet — upload content to track performance.
        </div>
      ) : (
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px", gap: "16px", padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {["ITEM", "TYPE", "UNLOCKS", "REVENUE"].map((h) => (
              <div key={h} style={{ ...mono, fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.2)" }}>{h}</div>
            ))}
          </div>
          {sorted.map((item) => {
            const revenue = item.purchase_count * item.price_cents;
            const maxRevenue = sorted[0] ? sorted[0].purchase_count * sorted[0].price_cents : 0;
            const pct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
            return (
              <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px", gap: "16px", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                <div>
                  <div style={{ ...body, fontSize: "13px", color: item.status === "active" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)", marginBottom: "4px" }}>{item.title}</div>
                  <div style={{ height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: GOLD, borderRadius: "2px" }} />
                  </div>
                </div>
                <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>{item.content_type.toUpperCase()}</div>
                <div style={{ ...mono, fontSize: "13px", color: item.purchase_count > 0 ? "#fff" : "rgba(255,255,255,0.2)" }}>{item.purchase_count}</div>
                <div style={{ ...mono, fontSize: "13px", color: revenue > 0 ? GOLD : "rgba(255,255,255,0.2)" }}>{fmt(revenue)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
