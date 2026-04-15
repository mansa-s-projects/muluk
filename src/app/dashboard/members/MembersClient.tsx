"use client";

import { useState } from "react";
import Link from "next/link";

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;

interface Fan {
  fan_code: string;
  last_active: string;
  message_count: number;
}

interface Props {
  fans: Fan[];
  handle: string;
  creatorId: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function MembersClient({ fans, handle, creatorId }: Props) {
  const [search, setSearch] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const filtered = fans.filter((f) =>
    f.fan_code.toLowerCase().includes(search.toLowerCase())
  );

  async function generateCode() {
    setGenerating(true);
    try {
      const res = await fetch("/api/fans/generate", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setGeneratedCode(json.fan_code ?? json.code ?? null);
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--void, #08080f)", padding: "2rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ ...mono, fontSize: "1.5rem", fontWeight: 500, color: "#fff", margin: 0, letterSpacing: "0.05em" }}>
              Fans
            </h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "4px" }}>
              {fans.length} fan{fans.length !== 1 ? "s" : ""} in your community
            </p>
          </div>
          <button
            onClick={generateCode}
            disabled={generating}
            style={{ ...mono, fontSize: "12px", letterSpacing: "0.08em", padding: "10px 18px", background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.3)", color: "#c8a96e", borderRadius: "6px", cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.6 : 1 }}
          >
            {generating ? "Generating…" : "+ Generate Fan Code"}
          </button>
        </div>

        {/* Generated code banner */}
        {generatedCode && (
          <div style={{ marginBottom: "1.5rem", padding: "14px 18px", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ ...mono, fontSize: "11px", color: "rgba(200,169,110,0.6)", letterSpacing: "0.12em" }}>NEW CODE</span>
            <span style={{ ...mono, fontSize: "14px", color: "#c8a96e", letterSpacing: "0.1em" }}>{generatedCode}</span>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
              Share: {typeof window !== "undefined" ? `${window.location.origin}/fan/access/${generatedCode}` : ""}
            </span>
            <button onClick={() => setGeneratedCode(null)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "16px" }}>✕</button>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "2rem" }}>
          {[
            { label: "Total Fans", value: fans.length },
            { label: "Active (7d)", value: fans.filter(f => Date.now() - new Date(f.last_active).getTime() < 7 * 86400000).length },
            { label: "Total Messages", value: fans.reduce((s, f) => s + f.message_count, 0) },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: "16px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px" }}>
              <div style={{ ...mono, fontSize: "11px", color: "rgba(200,169,110,0.5)", letterSpacing: "0.12em", marginBottom: "6px" }}>{label}</div>
              <div style={{ ...mono, fontSize: "22px", fontWeight: 500, color: "#fff" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search fan codes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", fontSize: "13px", marginBottom: "1rem", boxSizing: "border-box", outline: "none" }}
        />

        {/* Fan list */}
        {filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: "14px" }}>
            {fans.length === 0
              ? "No fans yet. Generate a fan code and share it to get started."
              : "No fans match your search."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 100px", padding: "6px 16px", ...mono, fontSize: "10px", color: "rgba(200,169,110,0.4)", letterSpacing: "0.12em" }}>
              <span>FAN CODE</span>
              <span>LAST ACTIVE</span>
              <span>MESSAGES</span>
              <span></span>
            </div>
            {filtered.map((fan) => (
              <div
                key={fan.fan_code}
                style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 100px", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "6px", gap: "8px" }}
              >
                <span style={{ ...mono, fontSize: "13px", color: "#c8a96e", letterSpacing: "0.08em" }}>{fan.fan_code}</span>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{timeAgo(fan.last_active)}</span>
                <span style={{ ...mono, fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>{fan.message_count}</span>
                <Link
                  href={`/dashboard/direct-line?fan=${fan.fan_code}`}
                  style={{ ...mono, fontSize: "11px", color: "rgba(200,169,110,0.7)", textDecoration: "none", letterSpacing: "0.06em", textAlign: "right" }}
                >
                  Message →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
