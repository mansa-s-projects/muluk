"use client";

import { useState, useEffect, useCallback } from "react";
import SignalCard, { type Signal } from "../../components/signals/SignalCard";
import LaunchOfferModal from "../../components/signals/LaunchOfferModal";

const NICHES = [
  "all", "fitness", "finance", "tech", "fashion", "gaming",
  "education", "luxury", "music", "travel", "food",
];

const SOURCE_FILTERS = ["all", "tiktok", "twitter", "google", "ai"];

const DEMAND_ORDER: Record<string, number> = { viral: 0, high: 1, medium: 2, low: 3 };

type SortMode = "score" | "demand" | "price";

export default function SignalBoardClient() {
  const [signals, setSignals]   = useState<Signal[]>([]);
  const [niche, setNiche]       = useState("all");
  const [source, setSource]     = useState("all");
  const [sort, setSort]         = useState<SortMode>("score");
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSignal, setActiveSignal] = useState<Signal | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const loadSignals = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "30" });
    if (niche !== "all") params.set("niche", niche);
    if (source !== "all") params.set("source", source);
    try {
      const res = await fetch(`/api/signals?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { signals: Signal[] };
      setSignals(data.signals ?? []);
    } catch {
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, [niche, source]);

  useEffect(() => { loadSignals(); }, [loadSignals]);

  const handleRefresh = async () => {
    if (refreshing || niche === "all") return;
    setRefreshing(true);
    try {
      await fetch("/api/signals/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche }),
      });
      await loadSignals();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDismiss = async (id: string) => {
    setDismissed(d => new Set([...d, id]));
    fetch("/api/signals/engage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal_id: id, action: "dismiss" }),
    }).catch(() => {});
  };

  const handleLaunched = (signalId: string) => {
    setSignals(prev => prev.map(s =>
      s.id === signalId
        ? { ...s, userActions: [...(s.userActions ?? []), "launch"] }
        : s
    ));
  };

  const visible = signals
    .filter(s => !dismissed.has(s.id))
    .sort((a, b) => {
      if (sort === "score")  return b.score - a.score;
      if (sort === "demand") return (DEMAND_ORDER[a.demand_level] ?? 2) - (DEMAND_ORDER[b.demand_level] ?? 2);
      if (sort === "price")  return (b.suggested_price ?? 0) - (a.suggested_price ?? 0);
      return 0;
    });

  const viralCount = visible.filter(s => s.demand_level === "viral").length;

  return (
    <div style={{ color: "rgba(255,255,255,0.92)" }}>
      {/* ── Header ── */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.055)",
        padding: "24px 32px 20px",
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        flexWrap: "wrap", gap: "16px",
      }}>
        <div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.25em",
            color: "var(--gold-dim)", marginBottom: "4px",
          }}>
            INTELLIGENCE
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 42px)",
            fontWeight: 300, color: "rgba(255,255,255,0.95)", margin: 0, lineHeight: 1,
          }}>
            Signal Board
          </h1>
          {viralCount > 0 && (
            <div style={{
              marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "4px 12px",
              background: "rgba(232,168,48,0.1)", border: "1px solid rgba(232,168,48,0.3)",
              borderRadius: "3px",
            }}>
              <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#e8a830", boxShadow: "0 0 5px #e8a830" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.18em", color: "#e8a830" }}>
                {viralCount} VIRAL SIGNAL{viralCount > 1 ? "S" : ""} ACTIVE
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing || niche === "all"}
          style={{
            padding: "10px 20px",
            background: "transparent",
            border: "1px solid rgba(200,169,110,0.3)",
            borderRadius: "4px",
            color: niche === "all" ? "rgba(255,255,255,0.15)" : "var(--gold)",
            fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.15em",
            cursor: niche === "all" || refreshing ? "not-allowed" : "pointer",
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          {refreshing ? "REFRESHING…" : "↻ REFRESH"}
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{
        padding: "16px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap",
      }}>
        {/* Niche pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {NICHES.map(n => (
            <button
              key={n}
              onClick={() => setNiche(n)}
              style={{
                padding: "5px 12px",
                background: niche === n ? "rgba(200,169,110,0.1)" : "transparent",
                border: `1px solid ${niche === n ? "rgba(200,169,110,0.35)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: "3px",
                color: niche === n ? "var(--gold)" : "rgba(255,255,255,0.3)",
                fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em",
                textTransform: "uppercase" as const, cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {n}
            </button>
          ))}
        </div>

        <div style={{ height: "20px", width: "1px", background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

        {/* Source filter */}
        <div style={{ display: "flex", gap: "6px" }}>
          {SOURCE_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setSource(s)}
              style={{
                padding: "5px 10px",
                background: source === s ? "rgba(255,255,255,0.06)" : "transparent",
                border: `1px solid ${source === s ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: "3px",
                color: source === s ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
                fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.12em",
                textTransform: "uppercase" as const, cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ height: "20px", width: "1px", background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

        {/* Sort */}
        <div style={{ display: "flex", gap: "6px" }}>
          {(["score", "demand", "price"] as SortMode[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              style={{
                padding: "5px 10px",
                background: sort === s ? "rgba(200,169,110,0.06)" : "transparent",
                border: `1px solid ${sort === s ? "rgba(200,169,110,0.2)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: "3px",
                color: sort === s ? "var(--gold-dim)" : "rgba(255,255,255,0.2)",
                fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.12em",
                textTransform: "uppercase" as const, cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      <div style={{ padding: "28px 32px 80px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                height: "240px", borderRadius: "12px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px", opacity: 0.2 }}>✦</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 300, color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>
              No signals active
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.22)", marginBottom: "24px" }}>
              {niche !== "all" ? `Select a niche filter and click Refresh to generate signals.` : "Select a specific niche to load signals."}
            </div>
            {niche !== "all" && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  padding: "12px 28px", background: "var(--gold)", border: "none", borderRadius: "4px",
                  color: "#0a0800", fontFamily: "var(--font-mono)", fontSize: "10px",
                  letterSpacing: "0.18em", cursor: "pointer",
                }}
              >
                GENERATE SIGNALS
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
            {visible.map(signal => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onLaunch={s => setActiveSignal(s)}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        )}

        {/* Summary bar */}
        {visible.length > 0 && !loading && (
          <div style={{
            marginTop: "32px", padding: "12px 18px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "8px", display: "flex", gap: "28px", flexWrap: "wrap",
          }}>
            {[
              { label: "TOTAL SIGNALS", value: visible.length },
              { label: "VIRAL",  value: visible.filter(s => s.demand_level === "viral").length },
              { label: "HIGH",   value: visible.filter(s => s.demand_level === "high").length },
              { label: "AVG SCORE", value: Math.round(visible.reduce((a, b) => a + b.score, 0) / visible.length) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.2)", marginBottom: "2px" }}>{label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "18px", color: "var(--gold)", fontWeight: 400 }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {activeSignal && (
        <LaunchOfferModal
          signal={activeSignal}
          onClose={() => setActiveSignal(null)}
          onLaunched={handleLaunched}
        />
      )}
    </div>
  );
}
