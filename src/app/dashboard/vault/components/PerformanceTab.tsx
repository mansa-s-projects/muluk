import type { VaultItem } from "./AssetsTab";

export function PerformanceTab({ items }: { items: VaultItem[] }) {
  const totalRevenue = items.reduce((sum, i) => sum + i.price_cents * i.purchase_count, 0);
  const totalSales = items.reduce((sum, i) => sum + i.purchase_count, 0);

  return (
    <div style={{ padding: "24px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Total Revenue", value: `$${(totalRevenue / 100).toFixed(2)}` },
          { label: "Total Sales",   value: String(totalSales) },
          { label: "Assets",        value: String(items.length) },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "18px 20px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(200,169,110,0.5)", textTransform: "uppercase", marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--gold)", fontWeight: 500 }}>{stat.value}</div>
          </div>
        ))}
      </div>
      {items.length === 0 && (
        <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--dim)", letterSpacing: "0.08em" }}>
          No performance data yet.
        </div>
      )}
    </div>
  );
}
