"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
type NavSection = "overview" | "agent-outputs" | "strategy" | "red-blue" | "tactics" | "synthesis";
type AgentStatus = "idle" | "thinking" | "active" | "error";

interface AgentOutputRecord {
  id: string;
  agent: string;
  output: { text: string; model?: string; timestamp?: string };
  run_id: string;
  created_at: string;
}

// ─── Style helpers ────────────────────────────────────────────────────────────
const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display)" };
const gold: React.CSSProperties = { color: "var(--gold)" };
const muted: React.CSSProperties = { color: "var(--muted)" };
const dim: React.CSSProperties = { color: "var(--dim)" };
const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
};

// ─── Constants ────────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: NavSection; label: string; glyph: string }[] = [
  { id: "overview",      label: "Overview",       glyph: "◈" },
  { id: "agent-outputs", label: "Agent Outputs",  glyph: "◎" },
  { id: "strategy",      label: "Strategy Board", glyph: "◇" },
  { id: "red-blue",      label: "Red vs Blue",    glyph: "⊕" },
  { id: "tactics",       label: "Tactics",        glyph: "≡" },
  { id: "synthesis",     label: "Synthesis",      glyph: "◉" },
];

const CHANNEL_ITEMS = [
  { name: "Twitter / X",  color: "#1da1f2" },
  { name: "TikTok",       color: "#ff2d55" },
  { name: "Instagram",    color: "#c8a96e" },
  { name: "Email",        color: "#9898cc" },
];

const MOCK_METRICS = [
  { channel: "twitter",   value: 47200, change_pct: 12.4 },
  { channel: "tiktok",    value: 89100, change_pct: 28.7 },
  { channel: "instagram", value: 31400, change_pct: -3.2 },
  { channel: "email",     value: 12800, change_pct: 6.1  },
];

const ADVISORS = [
  { role: "CFO", color: "#4cc88c", bg: "rgba(76,200,140,0.06)", border: "rgba(76,200,140,0.18)",
    insight: "At 8% rake on $50K creator MRR, CIPHER generates $4K/month. Break-even requires 200 active creators at $2K avg MRR. Achievable by Q3 if CAC stays under $180.",
    action: "Model CAC at $120 target. Prioritize organic creator referrals over paid ads." },
  { role: "CMO", color: "#c8a96e", bg: "rgba(200,169,110,0.08)", border: "rgba(200,169,110,0.22)",
    insight: "The 88% creator revenue claim is the single strongest differentiator. Every competitor comparison ad should lead with that number. Secondary hook: anonymous fan codes.",
    action: "A/B test: '88%' vs 'anonymous fans' as primary CTA hook across all paid channels." },
  { role: "CTO", color: "#9898cc", bg: "rgba(140,140,200,0.08)", border: "rgba(140,140,200,0.22)",
    insight: "Fan code system scales to 10M codes with current UUID architecture. USDC rails on Polygon L2 avoid Stripe's adult content policy risk entirely. 1,200 TPS headroom.",
    action: "Ship fan code mobile wallet view before launch. Crypto onboarding is the biggest UX gap." },
  { role: "Devil's Advocate", color: "#e88888", bg: "rgba(200,76,76,0.06)", border: "rgba(200,76,76,0.18)",
    insight: "Anonymous payments attract fraud. One viral chargeback incident destroys creator trust instantly. The 190-country claim needs explicit carve-outs and legal review.",
    action: "Build fraud scoring v1 before beta. Define restricted regions explicitly in ToS and ads." },
];

const RED_BLUE = [
  {
    topic: "Primary Acquisition Channel",
    red:  { label: "OFFENSE", position: "Go all-in on TikTok creator testimonials — high-earning creators showing their CIPHER vs OnlyFans earnings comparison will go viral. Lean into the controversy.", tactics: ["Creator earnings reveal videos", "Side-by-side platform fee comparisons", "Controversial 'I'm leaving OF' content"] },
    blue: { label: "DEFENSE", position: "Build trust through transparency. A public earnings calculator, open-source smart contract audit, and creator testimonials focused on payment reliability matter more long-term.", tactics: ["Public earnings calculator tool", "Open-source smart contract audit", "Creator payment guarantee pilot"] },
  },
  {
    topic: "Competitor Response Strategy",
    red:  { label: "OFFENSE", position: "Don't wait for OnlyFans to respond — announce the migration tool first. Build an OF→CIPHER importer that moves fan codes in one click. Make it a news story.", tactics: ["Build OF → CIPHER migration tool", "Pre-announce migration capability", "Target OF creator subreddits directly"] },
    blue: { label: "DEFENSE", position: "Avoid direct comparison marketing. Position as 'next generation platform' rather than an OF killer. Differentiate through crypto-native features, not price wars.", tactics: ["Crypto-native positioning language", "Avoid competitor brand comparisons", "Focus on unique fan code identity"] },
  },
];

const TACTICS = [
  { num: "01", tactic: "Instagram Reel Series",      channel: "Instagram",    timing: "48h post-launch", priority: "Critical", status: "pending" },
  { num: "02", tactic: "TikTok Earnings Reveal",     channel: "TikTok",       timing: "Week 1",          priority: "Critical", status: "pending" },
  { num: "03", tactic: "5-Email Onboarding Drip",    channel: "Email",        timing: "Pre-launch",      priority: "High",     status: "active"  },
  { num: "04", tactic: "Micro-Creator Seeding (12)", channel: "Direct",       timing: "D-7",             priority: "High",     status: "active"  },
  { num: "05", tactic: "Twitter/X Thread: Fan Codes",channel: "Twitter/X",    timing: "Launch day",      priority: "High",     status: "pending" },
  { num: "06", tactic: "Reddit Guerrilla Posts",     channel: "Reddit",       timing: "Ongoing",         priority: "Medium",   status: "pending" },
  { num: "07", tactic: "Retargeting — Waitlist",     channel: "Paid Social",  timing: "Week 2",          priority: "Medium",   status: "pending" },
];

const CHANNEL_FORECAST = [
  { channel: "TikTok",    pct: 34, color: "#ff2d55" },
  { channel: "Twitter/X", pct: 28, color: "#1da1f2" },
  { channel: "Instagram", pct: 22, color: "#c8a96e" },
  { channel: "Email",     pct: 10, color: "#9898cc" },
  { channel: "Organic",   pct: 6,  color: "#4cc88c" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function renderText(text: string) {
  return text.split("\n").map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: "6px" }} />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <div key={i} style={{ lineHeight: 1.75, marginBottom: "1px" }}>
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j} style={{ color: "var(--gold)", fontWeight: 500 }}>{part.slice(2, -2)}</strong>
            : <span key={j}>{part.replace(/^_|_$/g, "")}</span>
        )}
      </div>
    );
  });
}

function StatusDot({ status }: { status: AgentStatus }) {
  const colors: Record<AgentStatus, string> = {
    idle: "rgba(255,255,255,0.18)",
    thinking: "#f5a623",
    active: "#4cc88c",
    error: "#e88888",
  };
  return (
    <span style={{
      display: "inline-block",
      width: 7, height: 7,
      borderRadius: "50%",
      background: colors[status],
      flexShrink: 0,
      animation: status === "thinking" ? "mkt-pulse 1.2s ease-in-out infinite" : undefined,
    }} />
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function OverviewSection({
  waitlist, creators, metrics,
}: { waitlist: number; creators: number; metrics: typeof MOCK_METRICS }) {
  const stats = [
    { label: "Waitlist Signups",     value: String(waitlist || "—"), sub: "from waitlist table",  change: null },
    { label: "Creator Applications", value: String(creators || "—"), sub: "from creator_applications", change: null },
    { label: "Launch Markets",       value: "3",                      sub: "US · UK · LatAm",      change: null },
    { label: "Viral Coefficient",    value: "2.4×",                   sub: "referral multiplier",  change: "+0.3" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden", marginBottom: "32px" }}>
        {stats.map(({ label, value, sub, change }) => (
          <div key={label} style={{ background: "var(--card)", padding: "28px 24px" }}>
            <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", ...dim, marginBottom: "14px" }}>{label}</div>
            <div style={{ ...disp, fontSize: "42px", fontWeight: 300, ...gold, lineHeight: 1, marginBottom: "6px" }}>{value}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 300, ...dim }}>{sub}</span>
              {change && <span style={{ ...mono, fontSize: "9px", color: "#4cc88c" }}>{change}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: "28px 24px" }}>
        <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", ...dim, marginBottom: "20px" }}>Channel Metrics — Live Reach</div>
        {metrics.map(({ channel, value, change_pct }) => {
          const ch = CHANNEL_ITEMS.find(c => c.name.toLowerCase().includes(channel)) ?? CHANNEL_ITEMS[0];
          const isPos = change_pct >= 0;
          const maxVal = Math.max(...metrics.map(m => m.value), 1);
          return (
            <div key={channel} style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px" }}>
              <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.08em", ...dim, width: "80px", flexShrink: 0, textTransform: "capitalize" }}>{channel}</div>
              <div style={{ flex: 1, height: "5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(value / maxVal) * 100}%`, background: ch.color, borderRadius: "3px", transition: "width 0.8s ease", opacity: 0.7 }} />
              </div>
              <div style={{ ...mono, fontSize: "11px", ...muted, width: "52px", textAlign: "right", flexShrink: 0 }}>{fmtNum(value)}</div>
              <div style={{ ...mono, fontSize: "10px", color: isPos ? "#4cc88c" : "#e88888", width: "44px", textAlign: "right", flexShrink: 0 }}>
                {isPos ? "+" : ""}{change_pct.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentOutputsSection({
  outputs, statuses,
}: { outputs: Record<string, AgentOutputRecord | null>; statuses: Record<string, AgentStatus> }) {
  const agents = [
    { key: "researcher", label: "Researcher",  sub: "Market intelligence & analysis" },
    { key: "writer",     label: "Writer",       sub: "Copy generation & messaging"    },
    { key: "critic",     label: "Critic",       sub: "Risk assessment & red team"     },
  ];

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {agents.map(({ key, label, sub }) => {
        const output = outputs[key];
        const status = statuses[key];
        return (
          <div key={key} style={{ ...card, padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <StatusDot status={status} />
              <span style={{ ...mono, fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", ...gold }}>{label}</span>
              <span style={{ fontSize: "11px", ...dim }}>— {sub}</span>
              {output?.created_at && (
                <span style={{ ...mono, fontSize: "9px", ...dim, marginLeft: "auto" }}>
                  {new Date(output.created_at).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 300, ...muted, lineHeight: 1.75, minHeight: "80px" }}>
              {status === "thinking" ? (
                <span style={{ animation: "mkt-pulse 1.2s ease-in-out infinite", display: "inline-block", ...dim }}>Agent is thinking…</span>
              ) : output ? (
                renderText(output.output.text)
              ) : (
                <span style={{ ...dim, fontStyle: "italic" }}>No output yet — click Run All Agents to generate.</span>
              )}
            </div>
            {output?.output.model && (
              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)", ...mono, fontSize: "9px", ...dim }}>
                model: {output.output.model} · run_id: {output.run_id.slice(0, 20)}…
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StrategySection() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" }}>
      {ADVISORS.map(({ role, color, bg, border, insight, action }) => (
        <div key={role} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "4px", padding: "28px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ ...mono, fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color }}>{role}</span>
          </div>
          <p style={{ fontSize: "13px", fontWeight: 300, ...muted, lineHeight: 1.75, marginBottom: "16px" }}>{insight}</p>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <span style={{ ...mono, fontSize: "10px", color, flexShrink: 0, marginTop: "1px" }}>→</span>
            <span style={{ ...mono, fontSize: "11px", color, lineHeight: 1.6 }}>{action}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RedBlueSection() {
  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {RED_BLUE.map(({ topic, red, blue }) => (
        <div key={topic}>
          <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", ...dim, marginBottom: "12px" }}>{topic}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              { side: red,  bg: "rgba(200,76,76,0.06)",    border: "rgba(200,76,76,0.18)",    color: "#e88888" },
              { side: blue, bg: "rgba(106,142,212,0.06)",  border: "rgba(106,142,212,0.18)",  color: "#6a8ed4" },
            ].map(({ side, bg, border, color }) => (
              <div key={side.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "4px", padding: "24px 20px" }}>
                <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color, marginBottom: "12px" }}>{side.label}</div>
                <p style={{ fontSize: "13px", fontWeight: 300, ...muted, lineHeight: 1.75, marginBottom: "14px" }}>{side.position}</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {side.tactics.map(t => (
                    <li key={t} style={{ fontSize: "12px", ...dim, display: "flex", gap: "8px", alignItems: "flex-start" }}>
                      <span style={{ color, flexShrink: 0 }}>·</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TacticsSection() {
  const priColor: Record<string, string> = {
    Critical: "#e88888",
    High:     "#c8a96e",
    Medium:   "#9898cc",
  };
  return (
    <div style={{ ...card, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 120px 90px 80px", padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
        {["#", "Tactic", "Channel", "Timing", "Priority", "Status"].map(h => (
          <div key={h} style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", ...dim }}>{h}</div>
        ))}
      </div>
      {TACTICS.map(({ num, tactic, channel, timing, priority, status }) => (
        <div key={num} style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 120px 90px 80px", padding: "16px 20px", borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--card-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)" }}>{num}</div>
          <div style={{ fontSize: "13px", fontWeight: 300, ...muted }}>{tactic}</div>
          <div style={{ ...mono, fontSize: "10px", ...dim }}>{channel}</div>
          <div style={{ ...mono, fontSize: "10px", ...dim }}>{timing}</div>
          <div style={{ ...mono, fontSize: "10px", color: priColor[priority] ?? "var(--muted)" }}>{priority}</div>
          <div>
            <span style={{
              ...mono, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "3px 8px", borderRadius: "2px",
              background: status === "active" ? "rgba(76,200,140,0.1)" : "rgba(255,255,255,0.04)",
              color: status === "active" ? "#4cc88c" : "var(--dim)",
              border: `1px solid ${status === "active" ? "rgba(76,200,140,0.25)" : "var(--border)"}`,
            }}>{status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SynthesisSection() {
  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div style={{ ...card, padding: "32px 28px" }}>
        <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", ...dim, marginBottom: "16px" }}>Strategic Synthesis</div>
        <h2 style={{ ...disp, fontSize: "32px", fontWeight: 300, lineHeight: 1.15, letterSpacing: "-0.01em", marginBottom: "16px" }}>
          CIPHER&apos;s launch window is <em style={{ fontStyle: "italic", ...gold }}>now.</em>
        </h2>
        <p style={{ fontSize: "14px", fontWeight: 300, ...muted, lineHeight: 1.85, maxWidth: "640px", marginBottom: "20px" }}>
          The convergence of creator fee fatigue, OnlyFans regulatory pressure, and Gen Z&apos;s crypto-native identity creates a 90-day acquisition window that won&apos;t repeat. The anonymous fan code is a category-defining feature - no competitor can match it without a full rebuild. Priority: activate 50 seed creators before any paid spend. Organic creator-to-creator referral is the only sustainable CAC model at this stage.
        </p>
        <div style={{ display: "flex", gap: "24px" }}>
          {[
            { label: "Confidence", val: "High", color: "#4cc88c" },
            { label: "Time Horizon", val: "90 days", color: "#c8a96e" },
            { label: "Key Risk", val: "Creator activation", color: "#e88888" },
          ].map(({ label, val, color }) => (
            <div key={label}>
              <div style={{ ...mono, fontSize: "9px", ...dim, marginBottom: "4px" }}>{label}</div>
              <div style={{ ...mono, fontSize: "12px", color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card, padding: "28px 24px" }}>
        <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", ...dim, marginBottom: "20px" }}>Channel Acquisition Forecast</div>
        {CHANNEL_FORECAST.map(({ channel, pct, color }) => (
          <div key={channel} style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 300, ...muted }}>{channel}</span>
              <span style={{ ...mono, fontSize: "11px", color }}>{pct}%</span>
            </div>
            <div style={{ height: "5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px", opacity: 0.75 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MarketingDashboard() {
  const [activeNav, setActiveNav] = useState<NavSection>("overview");
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [creatorCount, setCreatorCount] = useState(0);
  const [channelMetrics, setChannelMetrics] = useState(MOCK_METRICS);
  const [agentOutputs, setAgentOutputs] = useState<Record<string, AgentOutputRecord | null>>({
    researcher: null, writer: null, critic: null,
  });
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({
    researcher: "idle", writer: "idle", critic: "idle",
  });
  const [isRunning, setIsRunning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const supabase = createClient();
      const [wRes, cRes, mRes] = await Promise.all([
        supabase.from("waitlist").select("*", { count: "exact", head: true }),
        supabase.from("creator_applications").select("*", { count: "exact", head: true }),
        supabase.from("marketing_metrics").select("*").order("recorded_at", { ascending: false }).limit(20),
      ]);
      if (wRes.count !== null) setWaitlistCount(wRes.count);
      if (cRes.count !== null) setCreatorCount(cRes.count);
      if (mRes.data && mRes.data.length > 0) setChannelMetrics(mRes.data);

      const outputMap: Record<string, AgentOutputRecord | null> = {};
      await Promise.all(["researcher", "writer", "critic"].map(async (agent) => {
        const { data } = await supabase
          .from("agent_outputs").select("*").eq("agent", agent)
          .order("created_at", { ascending: false }).limit(1);
        outputMap[agent] = (data?.[0] as AgentOutputRecord) ?? null;
      }));
      setAgentOutputs(outputMap);
      setLastRefresh(new Date());
    } catch {}
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const runAllAgents = async () => {
    if (isRunning) return;
    setIsRunning(true);
    const runId = `run_${Date.now()}`;
    try {
      const supabase = createClient();
      await supabase.from("marketing_runs").insert({ status: "running", agents_completed: 0 });
    } catch {}
    setAgentStatuses({ researcher: "thinking", writer: "thinking", critic: "thinking" });

    await Promise.all(["researcher", "writer", "critic"].map(async (agent) => {
      try {
        const res = await fetch("/api/marketing-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent, run_id: runId }),
        });
        if (!res.ok) throw new Error("failed");
        setAgentStatuses(prev => ({ ...prev, [agent]: "active" }));
        await fetchAll();
      } catch {
        setAgentStatuses(prev => ({ ...prev, [agent]: "error" }));
      }
    }));
    setIsRunning(false);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#020203", position: "relative" }}>
      <style>{`
        @keyframes mkt-pulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.3; }
        }
      `}</style>

      {/* ── SIDEBAR ───────────────────────────────────── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: "240px",
        background: "#08080f", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", zIndex: 50, overflowY: "auto",
      }}>
        {/* Logo */}
        <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ ...mono, fontSize: "16px", fontWeight: 500, letterSpacing: "0.25em", ...gold }}>CIPHER</span>
            <span style={{ ...mono, fontSize: "8px", letterSpacing: "0.2em", color: "rgba(200,169,110,0.5)", border: "1px solid rgba(200,169,110,0.2)", padding: "2px 6px", borderRadius: "2px" }}>MKT</span>
          </div>
          <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.1em", ...dim, marginTop: "6px" }}>Marketing Intelligence</div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "12px 0", flex: 1 }}>
          <div style={{ ...mono, fontSize: "8px", letterSpacing: "0.25em", textTransform: "uppercase", ...dim, padding: "8px 24px 8px", marginBottom: "2px" }}>Navigation</div>
          {NAV_ITEMS.map(({ id, label, glyph }) => {
            const isActive = activeNav === id;
            return (
              <button key={id} onClick={() => setActiveNav(id)} style={{
                display: "flex", alignItems: "center", gap: "10px",
                width: "100%", padding: "10px 24px",
                background: isActive ? "rgba(200,169,110,0.07)" : "transparent",
                border: "none", borderLeft: `2px solid ${isActive ? "var(--gold)" : "transparent"}`,
                cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: "12px", color: isActive ? "var(--gold)" : "var(--dim)", width: "16px", flexShrink: 0 }}>{glyph}</span>
                <span style={{ ...mono, fontSize: "11px", letterSpacing: "0.06em", color: isActive ? "var(--gold)" : "rgba(255,255,255,0.45)" }}>{label}</span>
              </button>
            );
          })}

          {/* Channels */}
          <div style={{ ...mono, fontSize: "8px", letterSpacing: "0.25em", textTransform: "uppercase", ...dim, padding: "20px 24px 8px" }}>Channels</div>
          {CHANNEL_ITEMS.map(({ name, color }) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 24px" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: "12px", fontWeight: 300, ...dim }}>{name}</span>
            </div>
          ))}

          {/* Agent status */}
          <div style={{ ...mono, fontSize: "8px", letterSpacing: "0.25em", textTransform: "uppercase", ...dim, padding: "20px 24px 8px" }}>Agents</div>
          {["researcher", "writer", "critic"].map((agent) => (
            <div key={agent} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 24px" }}>
              <StatusDot status={agentStatuses[agent]} />
              <span style={{ fontSize: "12px", fontWeight: 300, ...dim, textTransform: "capitalize" }}>{agent}</span>
            </div>
          ))}
        </nav>

        {/* Refresh indicator */}
        {lastRefresh && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
            <div style={{ ...mono, fontSize: "9px", ...dim }}>
              Last sync {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN ──────────────────────────────────────── */}
      <main style={{ flex: 1, marginLeft: "240px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#08080f", position: "sticky", top: 0, zIndex: 40 }}>
          <div>
            <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", ...dim, marginBottom: "4px" }}>
              {NAV_ITEMS.find(n => n.id === activeNav)?.glyph} {NAV_ITEMS.find(n => n.id === activeNav)?.label}
            </div>
            <h1 style={{ ...disp, fontSize: "22px", fontWeight: 300, ...gold, lineHeight: 1 }}>Marketing Dashboard</h1>
          </div>
          <button
            onClick={runAllAgents}
            disabled={isRunning}
            style={{
              ...mono, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase",
              padding: "12px 24px", borderRadius: "3px", border: "1px solid rgba(200,169,110,0.35)",
              background: isRunning ? "rgba(200,169,110,0.05)" : "rgba(200,169,110,0.1)",
              color: isRunning ? "rgba(200,169,110,0.4)" : "var(--gold)",
              cursor: isRunning ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              position: "relative", zIndex: 10,
            }}
            onMouseEnter={e => { if (!isRunning) { e.currentTarget.style.background = "rgba(200,169,110,0.18)"; e.currentTarget.style.borderColor = "rgba(200,169,110,0.6)"; }}}
            onMouseLeave={e => { e.currentTarget.style.background = isRunning ? "rgba(200,169,110,0.05)" : "rgba(200,169,110,0.1)"; e.currentTarget.style.borderColor = "rgba(200,169,110,0.35)"; }}
          >
            {isRunning ? "Running agents…" : "Run All Agents"}
          </button>
        </header>

        {/* Content */}
        <div style={{ padding: "32px", flex: 1 }}>
          {activeNav === "overview" && (
            <OverviewSection waitlist={waitlistCount} creators={creatorCount} metrics={channelMetrics} />
          )}
          {activeNav === "agent-outputs" && (
            <AgentOutputsSection outputs={agentOutputs} statuses={agentStatuses} />
          )}
          {activeNav === "strategy" && <StrategySection />}
          {activeNav === "red-blue" && <RedBlueSection />}
          {activeNav === "tactics" && <TacticsSection />}
          {activeNav === "synthesis" && <SynthesisSection />}
        </div>
      </main>
    </div>
  );
}
