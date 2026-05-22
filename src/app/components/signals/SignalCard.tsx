"use client";

import { useState } from "react";

export type Signal = {
  id: string;
  niche: string;
  source: string;
  topic: string;
  title: string;
  summary?: string;
  score: number;
  demand_level: "low" | "medium" | "high" | "viral";
  velocity: number;
  suggested_product?: string;
  suggested_price?: number;
  offer_type?: string;
  action_suggestion?: string;
  keywords?: string[];
  userActions?: string[];
};

type Props = {
  signal: Signal;
  onLaunch: (signal: Signal) => void;
  onDismiss: (id: string) => void;
};

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  tiktok:  { label: "TikTok",   color: "#00f2ea" },
  twitter: { label: "X",        color: "#1da1f2" },
  google:  { label: "Google",   color: "#c8a96e" },
  ai:      { label: "AI",       color: "#a078e0" },
};

const DEMAND_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: "LOW",   color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.05)" },
  medium: { label: "MED",   color: "#c8a96e",               bg: "rgba(200,169,110,0.08)" },
  high:   { label: "HIGH",  color: "#50d48a",               bg: "rgba(80,212,138,0.08)"  },
  viral:  { label: "VIRAL", color: "#e8a830",               bg: "rgba(232,168,48,0.10)"  },
};

const SCORE_COLOR = (s: number) =>
  s >= 85 ? "#e8a830" : s >= 70 ? "#50d48a" : s >= 50 ? "#c8a96e" : "rgba(255,255,255,0.35)";

export default function SignalCard({ signal, onLaunch, onDismiss }: Props) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dismissed = signal.userActions?.includes("dismiss");
  const launched  = signal.userActions?.includes("launch");

  const src    = SOURCE_LABELS[signal.source] ?? { label: signal.source.toUpperCase(), color: "#c8a96e" };
  const demand = DEMAND_CONFIG[signal.demand_level] ?? DEMAND_CONFIG.medium;
  const scoreColor = SCORE_COLOR(signal.score);

  if (dismissed) return null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#0f0f1e",
        border: `1px solid ${hovered ? "rgba(200,169,110,0.25)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: "12px",
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.2s, transform 0.15s",
        transform: hovered ? "translateY(-1px)" : "none",
        cursor: "default",
      }}
    >
      {/* Top shimmer line on hover */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.6), transparent)",
        opacity: hovered ? 1 : 0, transition: "opacity 0.3s",
      }} />

      {/* ── Header row ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
            {/* Source badge */}
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.18em",
              color: src.color, background: `${src.color}18`,
              border: `1px solid ${src.color}40`,
              padding: "2px 8px", borderRadius: "3px",
            }}>
              {src.label}
            </span>
            {/* Demand badge */}
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.18em",
              color: demand.color, background: demand.bg,
              border: `1px solid ${demand.color}40`,
              padding: "2px 8px", borderRadius: "3px",
            }}>
              {demand.label}
            </span>
            {/* Niche */}
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
            }}>
              {signal.niche}
            </span>
          </div>

          {/* Title */}
          <div style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(15px, 2vw, 18px)",
            fontWeight: 300, color: "rgba(255,255,255,0.92)", lineHeight: 1.3,
          }}>
            {signal.title}
          </div>
        </div>

        {/* Score ring */}
        <div style={{
          flexShrink: 0,
          width: "52px", height: "52px",
          borderRadius: "50%",
          border: `2px solid ${scoreColor}`,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: `${scoreColor}10`,
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "16px", color: scoreColor, fontWeight: 500, lineHeight: 1 }}>
            {signal.score}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "7px", color: scoreColor, letterSpacing: "0.1em", opacity: 0.7 }}>
            SCORE
          </div>
        </div>
      </div>

      {/* ── Summary ── */}
      {signal.summary && (
        <div style={{
          fontSize: "13px", color: "rgba(255,255,255,0.48)", lineHeight: 1.6,
          fontFamily: "var(--font-body)", marginBottom: "14px",
          display: expanded ? "block" : "-webkit-box",
          WebkitLineClamp: expanded ? undefined : 2,
          WebkitBoxOrient: "vertical" as const,
          overflow: expanded ? "visible" : "hidden",
        }}>
          {signal.summary}
        </div>
      )}

      {/* ── Monetization row ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: "10px", marginBottom: "16px",
        padding: "12px 14px",
        background: "rgba(200,169,110,0.04)",
        border: "1px solid rgba(200,169,110,0.08)",
        borderRadius: "7px",
      }}>
        {[
          { label: "PRODUCT",  value: signal.suggested_product ?? "—" },
          { label: "PRICE",    value: signal.suggested_price ? `$${signal.suggested_price}` : "—" },
          { label: "OFFER",    value: (signal.offer_type ?? "—").toUpperCase() },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "0.18em", color: "rgba(200,169,110,0.5)", marginBottom: "3px" }}>
              {label}
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.72)", lineHeight: 1.3 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Action suggestion ── */}
      {signal.action_suggestion && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "8px",
          marginBottom: "16px",
        }}>
          <span style={{ color: "var(--gold)", fontSize: "10px", marginTop: "1px", flexShrink: 0 }}>◆</span>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
            {signal.action_suggestion}
          </div>
        </div>
      )}

      {/* ── Keywords ── */}
      {signal.keywords && signal.keywords.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
          {signal.keywords.slice(0, 5).map(kw => (
            <span key={kw} style={{
              fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.28)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "2px 8px", borderRadius: "3px",
            }}>
              #{kw}
            </span>
          ))}
        </div>
      )}

      {/* ── CTA row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={() => onLaunch(signal)}
          disabled={launched}
          style={{
            flex: 1,
            padding: "11px 20px",
            background: launched ? "rgba(80,212,138,0.12)" : "var(--gold)",
            border: launched ? "1px solid rgba(80,212,138,0.3)" : "none",
            borderRadius: "4px",
            color: launched ? "#50d48a" : "#0a0800",
            fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.18em", fontWeight: 500,
            cursor: launched ? "default" : "pointer",
            transition: "opacity 0.2s",
          }}
        >
          {launched ? "✓ LAUNCHED" : "LAUNCH OFFER ↗"}
        </button>

        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            padding: "11px 14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "4px",
            color: "rgba(255,255,255,0.35)",
            fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.1em",
            cursor: "pointer",
          }}
        >
          {expanded ? "LESS" : "MORE"}
        </button>

        <button
          onClick={() => onDismiss(signal.id)}
          style={{
            padding: "11px 12px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "4px",
            color: "rgba(255,255,255,0.2)",
            fontFamily: "var(--font-mono)", fontSize: "12px",
            cursor: "pointer",
          }}
          title="Dismiss signal"
        >
          ×
        </button>
      </div>

      {/* Velocity bar */}
      <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.2)", width: "50px", flexShrink: 0 }}>
          VELOCITY
        </div>
        <div style={{ flex: 1, height: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "1px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${signal.velocity}%`,
            background: `linear-gradient(90deg, ${scoreColor}88, ${scoreColor})`,
            borderRadius: "1px",
            transition: "width 0.6s ease",
          }} />
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: scoreColor, width: "30px", textAlign: "right" as const }}>
          {Math.round(signal.velocity)}
        </div>
      </div>
    </div>
  );
}
