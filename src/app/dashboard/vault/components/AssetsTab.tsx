export type VaultItem = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  content_type: string;
  preview_path: string | null;
  status: string;
  purchase_count: number;
  created_at: string;
};

export function AssetsTab({ initialItems }: { initialItems: VaultItem[] }) {
  if (initialItems.length === 0) {
    return (
      <div style={{ padding: "48px 32px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--dim)", letterSpacing: "0.08em" }}>
        No assets yet. Upload your first piece of content.
      </div>
    );
  }
  return (
    <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
      {initialItems.map((item) => (
        <div key={item.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "18px 20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--gold-dim)", marginBottom: 6, textTransform: "uppercase" }}>{item.content_type}</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--white)", fontWeight: 500, marginBottom: 4 }}>{item.title}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>${(item.price_cents / 100).toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}
