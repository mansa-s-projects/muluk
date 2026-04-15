"use client";

import { useState } from "react";

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;

interface PayLink {
  id: string;
  title: string;
  price: number;
  purchase_count: number | null;
  view_count: number | null;
  is_active: boolean;
}

interface Props {
  payLinks: PayLink[];
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function conversionRate(views: number | null, purchases: number | null) {
  if (!views || views === 0) return "—";
  return `${(((purchases ?? 0) / views) * 100).toFixed(1)}%`;
}

export default function PricingClient({ payLinks }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<{ id: string; suggested_price: number; reason: string }[]>([]);

  async function runAiPricing() {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/monetization/dynamic-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payLinks }),
      });
      if (res.ok) {
        const json = await res.json();
        setSuggestions(json.suggestions ?? []);
      }
    } finally {
      setAnalyzing(false);
    }
  }

  const suggestionMap = new Map(suggestions.map((s) => [s.id, s]));

  return (
    <div style={{ minHeight: "100vh", background: "var(--void, #08080f)", padding: "2rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ ...mono, fontSize: "1.5rem", fontWeight: 500, color: "#fff", margin: 0, letterSpacing: "0.05em" }}>Pricing</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "4px" }}>
              AI-powered price optimization across your catalog
            </p>
          </div>
          <button
            onClick={runAiPricing}
            disabled={analyzing || payLinks.length === 0}
            style={{ ...mono, fontSize: "12px", letterSpacing: "0.08em", padding: "10px 18px", background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.3)", color: "#c8a96e", borderRadius: "6px", cursor: analyzing || payLinks.length === 0 ? "not-allowed" : "pointer", opacity: analyzing || payLinks.length === 0 ? 0.5 : 1 }}
          >
            {analyzing ? "Analyzing…" : "◈ Run AI Analysis"}
          </button>
        </div>

        {/* How it works */}
        {suggestions.length === 0 && (
          <div style={{ marginBottom: "2rem", padding: "16px 20px", background: "rgba(200,169,110,0.04)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: "8px" }}>
            <p style={{ ...mono, fontSize: "11px", color: "rgba(200,169,110,0.6)", letterSpacing: "0.1em", marginBottom: "6px" }}>HOW IT WORKS</p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              AI analyzes your conversion rates, view counts, and market positioning to suggest optimal prices for each product.
              Click "Run AI Analysis" to get personalized recommendations.
            </p>
          </div>
        )}

        {/* AI suggestions */}
        {suggestions.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ ...mono, fontSize: "10px", color: "rgba(200,169,110,0.5)", letterSpacing: "0.14em", marginBottom: "10px" }}>AI RECOMMENDATIONS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {suggestions.map((s) => {
                const link = payLinks.find((p) => p.id === s.id);
                if (!link) return null;
                return (
                  <div key={s.id} style={{ padding: "14px 18px", background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", color: "#fff" }}>{link.title}</div>
                      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "3px" }}>{s.reason}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ ...mono, fontSize: "12px", color: "rgba(255,255,255,0.35)", textDecoration: "line-through" }}>{formatCents(link.price)}</span>
                      <span style={{ ...mono, fontSize: "14px", color: "#c8a96e" }}>{formatCents(s.suggested_price)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Current pricing table */}
        {payLinks.length === 0 ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "14px" }}>
            <div style={{ ...mono, fontSize: "28px", marginBottom: "12px" }}>◈</div>
            <p>No products to analyze yet.</p>
            <p style={{ fontSize: "12px", marginTop: "8px" }}>Create pay links to get pricing recommendations.</p>
          </div>
        ) : (
          <>
            <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.14em", marginBottom: "10px" }}>CURRENT CATALOG</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 80px 90px", padding: "6px 16px", ...mono, fontSize: "10px", color: "rgba(200,169,110,0.4)", letterSpacing: "0.1em" }}>
                <span>PRODUCT</span><span>PRICE</span><span>VIEWS</span><span>SALES</span><span>CONV.</span>
              </div>
              {payLinks.map((link) => {
                const sug = suggestionMap.get(link.id);
                return (
                  <div key={link.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 80px 90px", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "6px" }}>
                    <div>
                      <div style={{ fontSize: "13px", color: "#fff" }}>{link.title}</div>
                      {sug && <div style={{ ...mono, fontSize: "10px", color: "#c8a96e", marginTop: "2px" }}>→ {formatCents(sug.suggested_price)} suggested</div>}
                    </div>
                    <span style={{ ...mono, fontSize: "13px", color: "#c8a96e" }}>{formatCents(link.price)}</span>
                    <span style={{ ...mono, fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{link.view_count ?? 0}</span>
                    <span style={{ ...mono, fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{link.purchase_count ?? 0}</span>
                    <span style={{ ...mono, fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{conversionRate(link.view_count, link.purchase_count)}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
