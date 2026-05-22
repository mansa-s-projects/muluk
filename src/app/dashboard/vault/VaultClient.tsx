"use client";

import { useState } from "react";

type Tab = "assets" | "drops" | "performance";

const TABS: { key: Tab; label: string }[] = [
  { key: "assets",      label: "Assets" },
  { key: "drops",       label: "Active Drops" },
  { key: "performance", label: "Performance" },
];

interface VaultItem {
  id: string;
  title: string;
  description?: string;
  price_cents: number;
  content_type: string;
  preview_path?: string;
  status: string;
  purchase_count?: number;
  created_at: string;
}

interface Props {
  creatorId: string;
  handle: string;
  initialItems: VaultItem[];
}

function AssetsTab({ initialItems }: { initialItems: VaultItem[] }) {
  if (initialItems.length === 0) {
    return (
      <div style={{ padding: "60px 32px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em" }}>NO ASSETS YET</div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--dim)", marginTop: 12 }}>Upload your first content to start selling.</p>
      </div>
    );
  }
  return (
    <div style={{ padding: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
      {initialItems.map((item) => (
        <div key={item.id} style={{ background: "var(--deep)", border: "1px solid var(--rim)", borderRadius: 10, padding: "20px" }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--white)", marginBottom: 8 }}>{item.title}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--gold)" }}>${(item.price_cents / 100).toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}

function ActiveDropsTab({ userId: _userId }: { userId: string }) {
  return (
    <div style={{ padding: "60px 32px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em" }}>NO ACTIVE DROPS</div>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--dim)", marginTop: 12 }}>Create a drop to release limited content.</p>
    </div>
  );
}

function PerformanceTab({ items }: { items: VaultItem[] }) {
  const totalRevenue = items.reduce((sum, item) => sum + (item.price_cents * (item.purchase_count ?? 0)), 0);
  const totalSales = items.reduce((sum, item) => sum + (item.purchase_count ?? 0), 0);
  return (
    <div style={{ padding: "32px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      <div style={{ background: "var(--deep)", border: "1px solid var(--rim)", borderRadius: 10, padding: "24px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)", letterSpacing: "0.1em", marginBottom: 8 }}>TOTAL REVENUE</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, color: "var(--gold)" }}>${(totalRevenue / 100).toFixed(2)}</div>
      </div>
      <div style={{ background: "var(--deep)", border: "1px solid var(--rim)", borderRadius: 10, padding: "24px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)", letterSpacing: "0.1em", marginBottom: 8 }}>TOTAL SALES</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, color: "var(--gold)" }}>{totalSales}</div>
      </div>
      <div style={{ background: "var(--deep)", border: "1px solid var(--rim)", borderRadius: 10, padding: "24px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)", letterSpacing: "0.1em", marginBottom: 8 }}>TOTAL ITEMS</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, color: "var(--gold)" }}>{items.length}</div>
      </div>
    </div>
  );
}

export default function VaultClient({ creatorId, handle, initialItems }: Props) {
  const [tab, setTab] = useState<Tab>("assets");

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)" }}>
      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid var(--rim)", padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "block", width: 20, height: 1, background: "var(--gold-dim)" }} />
            Monetization
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontSize: 30, color: "var(--white)", margin: 0 }}>Vault</h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>
            Upload content, launch drops, track revenue — all in one place.
          </p>
        </div>
        {handle && (
          <a href={`/vault/${handle}`} target="_blank" rel="noreferrer"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)", border: "1px solid var(--rim2)", borderRadius: 3, padding: "10px 18px", textDecoration: "none", whiteSpace: "nowrap" }}>
            Preview Page
          </a>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div style={{ borderBottom: "1px solid var(--rim)", padding: "0 32px", display: "flex", gap: 0 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              style={{ padding: "14px 20px", background: "transparent", border: "none", borderBottom: `2px solid ${active ? "var(--gold)" : "transparent"}`, color: active ? "var(--gold)" : "var(--dim)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.15s", marginBottom: -1 }}>
              {t.label.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      {tab === "assets"      && <AssetsTab initialItems={initialItems} />}
      {tab === "drops"       && <ActiveDropsTab userId={creatorId} />}
      {tab === "performance" && <PerformanceTab items={initialItems} />}
    </div>
  );
}
