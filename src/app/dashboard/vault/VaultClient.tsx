"use client";

import { useState } from "react";
import { AssetsTab } from "./components/AssetsTab";
import { ActiveDropsTab } from "./components/ActiveDropsTab";
import { PerformanceTab } from "./components/PerformanceTab";
import type { VaultItem } from "./components/AssetsTab";

type Tab = "assets" | "drops" | "performance";

const TABS: { key: Tab; label: string }[] = [
  { key: "assets",      label: "Assets" },
  { key: "drops",       label: "Active Drops" },
  { key: "performance", label: "Performance" },
];

interface Props {
  creatorId: string;
  handle: string;
  initialItems: VaultItem[];
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
