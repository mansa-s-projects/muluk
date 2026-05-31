"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type Scores = {
  moguls_score: number;
  influence_score: number;
  authority_score: number;
  growth_score: number;
  revenue_score: number;
  engagement_score: number;
  audience_quality: number;
  content_score: number;
  virality_score: number;
  consistency_score: number;
  total_followers: number;
  total_reach: number;
  avg_engagement_rate: number;
  top_platform: string | null;
  growth_pct_7d: number;
  growth_pct_30d: number;
  growth_pct_90d: number;
  total_revenue_usd: number;
  ai_insights: string[];
  ai_recommendations: string[];
  predicted_revenue_30d: number;
  last_scored_at: string | null;
};

type Connection = {
  platform: string;
  platform_username: string | null;
  follower_count: number | null;
  metrics: Record<string, number> | null;
  last_synced_at: string | null;
};

type Snapshot = {
  platform: string;
  snapshot_date: string;
  followers: number;
  engagement_rate: number;
  avg_views: number;
  reach: number;
};

type ContentRanking = {
  id: string;
  platform: string;
  title: string | null;
  thumbnail_url: string | null;
  post_url: string | null;
  content_type: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
  virality_score: number;
  posted_at: string | null;
};

type Brief = {
  insights: string[];
  recommendations: string[];
  opportunities: string[];
  warning: string | null;
};

type CoachMessage = { role: string; content: string; id: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function scoreColor(s: number): string {
  if (s >= 700) return "#50d48a";
  if (s >= 400) return "#c8a96e";
  return "#e05555";
}

function ScoreRing({ score, max = 1000, label, size = 80 }: { score: number; max?: number; label: string; size?: number }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / max) * circ;
  const color = scoreColor(score);
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
      </svg>
      <div style={{ marginTop: -(size / 2 + 8), fontSize: Math.round(size / 4), fontFamily: "var(--font-mono,'DM Mono',monospace)", fontWeight: 500, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em" }}>
        {score}
      </div>
      <div style={{ marginTop: size / 2 - 2, fontSize: 9, fontFamily: "var(--font-mono,'DM Mono',monospace)", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
        {label}
      </div>
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, fontFamily: "var(--font-mono,'DM Mono',monospace)",
  fontSize: 11, color: "rgba(255,255,255,0.8)",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  const [scores, setScores] = useState<Scores | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [content, setContent] = useState<ContentRanking[]>([]);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [coachInput, setCoachInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [coaching, setCoaching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [chartRange, setChartRange] = useState<30 | 90 | 365>(30);
  const [activeTab, setActiveTab] = useState<"overview" | "content" | "coach" | "affiliates">("overview");
  const coachBottom = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/intelligence/scores").then(r => r.ok ? r.json() as Promise<{ scores: Scores | null; connections: Connection[]; history: Snapshot[] }> : null),
      fetch("/api/intelligence/content").then(r => r.ok ? r.json() as Promise<{ content: ContentRanking[] }> : null),
      fetch("/api/intelligence/coach").then(r => r.ok ? r.json() as Promise<{ messages: CoachMessage[] }> : null),
    ]).then(([intel, cont, coach]) => {
      if (intel) { setScores(intel.scores); setConnections(intel.connections ?? []); setHistory(intel.history ?? []); }
      if (cont) setContent(cont.content ?? []);
      if (coach) setCoachMessages(coach.messages ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { coachBottom.current?.scrollIntoView({ behavior: "smooth" }); }, [coachMessages]);

  const runAnalysis = () => {
    setAnalyzing(true);
    fetch("/api/intelligence/brief", { method: "POST" })
      .then(r => r.ok ? r.json() as Promise<Brief> : null)
      .then(b => { if (b) setBrief(b); setAnalyzing(false); })
      .catch(() => setAnalyzing(false));
  };

  const syncAll = () => {
    setSyncing(true);
    fetch("/api/social/sync", { method: "POST" })
      .then(() => { load(); setSyncing(false); })
      .catch(() => setSyncing(false));
  };

  const sendCoach = () => {
    if (!coachInput.trim() || coaching) return;
    const msg = coachInput.trim();
    setCoachInput("");
    setCoaching(true);
    setCoachMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: msg }]);
    fetch("/api/intelligence/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg }) })
      .then(r => r.ok ? r.json() as Promise<{ reply: string }> : null)
      .then(d => {
        if (d?.reply) setCoachMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: d.reply }]);
        setCoaching(false);
      })
      .catch(() => setCoaching(false));
  };

  // Build chart data from snapshots
  const chartArr = useMemo(() => {
    const now = new Date().toISOString(); // captured outside Date.now() call
    const cutoff = new Date(new Date(now).getTime() - chartRange * 86400000).toISOString().split("T")[0];
    const acc: Record<string, { date: string; followers: number; engagement: number }> = {};
    for (const s of history) {
      if (s.snapshot_date < cutoff) continue;
      const d = s.snapshot_date;
      if (!acc[d]) acc[d] = { date: d.slice(5), followers: 0, engagement: 0 };
      acc[d].followers += s.followers;
      acc[d].engagement = Math.max(acc[d].engagement, s.engagement_rate);
    }
    return Object.values(acc).sort((a, b) => a.date.localeCompare(b.date));
  }, [history, chartRange]);

  const noAccounts = !loading && connections.length === 0;

  return (
    <div className="intel-page">
      <style>{`
        * { box-sizing: border-box; }
        .intel-page { min-height: 100vh; background: #020203; padding: 40px; font-family: var(--font-body,'Outfit',sans-serif); color: rgba(255,255,255,0.88); position: relative; }
        .intel-page::before { content:''; position:fixed; inset:0; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.038'/%3E%3C/svg%3E"); pointer-events:none; z-index:0; }
        .z1 { position: relative; z-index: 1; }
        .header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:40px; }
        .eyebrow { font-family:var(--font-mono,'DM Mono',monospace); font-size:10px; letter-spacing:0.28em; text-transform:uppercase; color:#7a6030; display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .eyebrow::before { content:''; width:20px; height:1px; background:#7a6030; }
        .page-title { font-family:var(--font-display,'Cormorant Garamond',serif); font-size:clamp(28px,3.5vw,48px); font-weight:300; letter-spacing:-0.02em; margin:0; }
        .page-sub { color:rgba(255,255,255,0.35); font-size:13px; margin-top:5px; font-weight:300; }
        .actions { display:flex; gap:10px; }
        .btn-gold { font-family:var(--font-mono,'DM Mono',monospace); font-size:10px; font-weight:500; letter-spacing:0.18em; text-transform:uppercase; background:#c8a96e; color:#0a0800; border:none; border-radius:3px; padding:10px 20px; cursor:pointer; transition:opacity 0.2s; white-space:nowrap; }
        .btn-gold:hover { opacity:0.85; } .btn-gold:disabled { opacity:0.4; cursor:not-allowed; }
        .btn-ghost { font-family:var(--font-mono,'DM Mono',monospace); font-size:10px; font-weight:500; letter-spacing:0.18em; text-transform:uppercase; background:transparent; color:rgba(255,255,255,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:3px; padding:10px 20px; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
        .btn-ghost:hover { color:rgba(255,255,255,0.8); border-color:rgba(255,255,255,0.2); } .btn-ghost:disabled { opacity:0.4; cursor:not-allowed; }
        .tabs { display:flex; gap:2px; margin-bottom:32px; border-bottom:1px solid rgba(255,255,255,0.06); }
        .tab { font-family:var(--font-mono,'DM Mono',monospace); font-size:10px; letter-spacing:0.18em; text-transform:uppercase; padding:12px 20px; border:none; background:transparent; color:rgba(255,255,255,0.3); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; transition:all 0.2s; }
        .tab:hover { color:rgba(255,255,255,0.6); } .tab.active { color:#c8a96e; border-bottom-color:#c8a96e; }
        .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:14px; }
        .grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:14px; }
        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
        @media(max-width:1100px) { .grid-4 { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:700px) { .grid-4,.grid-3,.grid-2 { grid-template-columns:1fr; } }
        .card { background:#0f0f1e; border:1px solid rgba(255,255,255,0.055); border-radius:10px; padding:22px; }
        .card-sm { background:#0f0f1e; border:1px solid rgba(255,255,255,0.055); border-radius:10px; padding:18px; }
        .card-label { font-family:var(--font-mono,'DM Mono',monospace); font-size:9px; letter-spacing:0.22em; text-transform:uppercase; color:rgba(255,255,255,0.28); margin:0 0 14px; }
        .big-val { font-family:var(--font-mono,'DM Mono',monospace); font-size:38px; font-weight:500; color:#c8a96e; letter-spacing:-0.03em; line-height:1; }
        .big-sub { font-size:12px; color:rgba(255,255,255,0.3); margin-top:5px; font-weight:300; }
        .growth-tag { display:inline-flex; align-items:center; font-family:var(--font-mono,'DM Mono',monospace); font-size:9px; padding:2px 7px; border-radius:100px; margin-top:8px; }
        .green-tag { color:#50d48a; background:rgba(80,212,138,0.1); border:1px solid rgba(80,212,138,0.2); }
        .red-tag { color:#e05555; background:rgba(224,85,85,0.1); border:1px solid rgba(224,85,85,0.2); }
        .gold-tag { color:#c8a96e; background:rgba(200,169,110,0.1); border:1px solid rgba(200,169,110,0.2); }
        .scores-row { display:grid; grid-template-columns:repeat(5,1fr); gap:16px; padding:8px 0; }
        @media(max-width:900px) { .scores-row { grid-template-columns:repeat(3,1fr); } }
        .chart-controls { display:flex; gap:8px; margin-bottom:16px; }
        .range-btn { font-family:var(--font-mono,'DM Mono',monospace); font-size:9px; letter-spacing:0.15em; text-transform:uppercase; padding:5px 12px; border-radius:100px; border:1px solid rgba(255,255,255,0.08); background:transparent; color:rgba(255,255,255,0.3); cursor:pointer; transition:all 0.2s; }
        .range-btn:hover { color:rgba(255,255,255,0.6); } .range-btn.active { color:#c8a96e; border-color:rgba(200,169,110,0.3); background:rgba(200,169,110,0.06); }
        .platform-row { display:flex; align-items:center; justify-content:space-between; padding:11px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .platform-row:last-child { border-bottom:none; }
        .plat-info { display:flex; align-items:center; gap:10px; }
        .plat-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .plat-name { font-size:13px; font-weight:400; text-transform:capitalize; }
        .plat-handle { font-size:11px; color:rgba(255,255,255,0.28); }
        .plat-right { text-align:right; }
        .plat-val { font-family:var(--font-mono,'DM Mono',monospace); font-size:14px; font-weight:500; }
        .plat-sub { font-family:var(--font-mono,'DM Mono',monospace); font-size:9px; color:rgba(255,255,255,0.2); }
        .health-bar { width:60px; height:4px; background:rgba(255,255,255,0.06); border-radius:2px; margin-top:4px; overflow:hidden; }
        .health-fill { height:100%; border-radius:2px; transition:width 0.8s ease; }
        .insight-line { padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:13px; color:rgba(255,255,255,0.6); font-weight:300; line-height:1.7; }
        .insight-line:last-child { border-bottom:none; }
        .insight-line::before { content:'→ '; color:#c8a96e; }
        .rec-card { padding:12px 14px; background:rgba(200,169,110,0.04); border:1px solid rgba(200,169,110,0.1); border-radius:6px; margin-bottom:8px; font-size:12px; color:rgba(255,255,255,0.6); font-weight:300; line-height:1.7; }
        .opp-card { padding:12px 14px; background:rgba(80,212,138,0.04); border:1px solid rgba(80,212,138,0.12); border-radius:6px; margin-bottom:8px; font-size:12px; color:rgba(255,255,255,0.6); font-weight:300; line-height:1.7; }
        .warn-card { padding:12px 16px; background:rgba(224,85,85,0.06); border:1px solid rgba(224,85,85,0.18); border-radius:6px; font-size:13px; color:rgba(224,85,85,0.9); margin-top:12px; }
        .content-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
        .content-card { background:#0f0f1e; border:1px solid rgba(255,255,255,0.055); border-radius:8px; padding:16px; cursor:pointer; transition:border-color 0.2s,transform 0.2s; text-decoration:none; display:block; }
        .content-card:hover { border-color:rgba(255,255,255,0.1); transform:translateY(-1px); }
        .content-platform { font-family:var(--font-mono,'DM Mono',monospace); font-size:8px; letter-spacing:0.2em; text-transform:uppercase; color:rgba(255,255,255,0.3); margin-bottom:8px; }
        .content-title { font-size:13px; color:rgba(255,255,255,0.75); font-weight:400; line-height:1.5; margin-bottom:12px; }
        .content-stats { display:flex; gap:16px; }
        .cstat { font-family:var(--font-mono,'DM Mono',monospace); font-size:11px; color:rgba(255,255,255,0.4); }
        .cstat span { color:rgba(255,255,255,0.7); }
        .coach-container { display:flex; flex-direction:column; height:500px; }
        .coach-messages { flex:1; overflow-y:auto; padding:16px 0; display:flex; flex-direction:column; gap:12px; }
        .coach-messages::-webkit-scrollbar { width:3px; }
        .coach-messages::-webkit-scrollbar-thumb { background:rgba(200,169,110,0.2); border-radius:2px; }
        .msg { max-width:80%; padding:12px 16px; border-radius:8px; font-size:13px; line-height:1.7; font-weight:300; }
        .msg-user { background:rgba(200,169,110,0.1); border:1px solid rgba(200,169,110,0.15); color:rgba(255,255,255,0.85); align-self:flex-end; }
        .msg-assistant { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); color:rgba(255,255,255,0.7); align-self:flex-start; }
        .coach-input-row { display:flex; gap:10px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.06); }
        .coach-input { flex:1; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.09); border-radius:3px; color:rgba(255,255,255,0.8); font-family:var(--font-body,'Outfit',sans-serif); font-size:13px; font-weight:300; padding:12px 16px; outline:none; transition:border-color 0.2s; }
        .coach-input:focus { border-color:rgba(200,169,110,0.4); }
        .coach-input::placeholder { color:rgba(255,255,255,0.2); }
        .moguls-score-hero { text-align:center; padding:32px 0 24px; }
        .moguls-number { font-family:var(--font-mono,'DM Mono',monospace); font-size:72px; font-weight:500; letter-spacing:-0.04em; line-height:1; }
        .moguls-label { font-family:var(--font-mono,'DM Mono',monospace); font-size:10px; letter-spacing:0.3em; text-transform:uppercase; color:rgba(255,255,255,0.28); margin-top:8px; }
        .moguls-sub { font-size:13px; color:rgba(255,255,255,0.35); margin-top:6px; font-weight:300; }
        .divider { height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent); margin:8px 0 20px; }
        .empty-state { text-align:center; padding:80px 40px; }
        .empty-title { font-family:var(--font-display,'Cormorant Garamond',serif); font-size:32px; font-weight:300; color:rgba(255,255,255,0.5); margin:0 0 10px; }
        .empty-sub { font-size:14px; color:rgba(255,255,255,0.25); margin-bottom:28px; font-weight:300; }
        .pulse { animation:pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .skel { background:linear-gradient(90deg,#111122 25%,#1a1a30 50%,#111122 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:4px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <div className="z1">
        {/* Header */}
        <div className="header">
          <div>
            <div className="eyebrow">Creator Intelligence</div>
            <h1 className="page-title">Empire Intelligence</h1>
            <p className="page-sub">Your proprietary intelligence layer — across every platform you own.</p>
          </div>
          <div className="actions">
            <button className="btn-ghost" onClick={syncAll} disabled={syncing}>{syncing ? "Syncing..." : "↻ Sync All"}</button>
            <button className="btn-gold" onClick={runAnalysis} disabled={analyzing}>{analyzing ? <span className="pulse">Analyzing...</span> : "Run AI Analysis"}</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {(["overview", "content", "coach", "affiliates"] as const).map(t => (
            <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
              {t === "coach" ? "AI Coach" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {noAccounts && (
          <div className="empty-state">
            <div className="empty-title">No platforms connected</div>
            <div className="empty-sub">Connect Instagram, TikTok, YouTube, X, LinkedIn, or Telegram to unlock your intelligence layer.</div>
            <a href="/dashboard/integrations" className="btn-gold" style={{ textDecoration: "none", display: "inline-block" }}>Connect Platforms →</a>
          </div>
        )}

        {!noAccounts && activeTab === "overview" && (
          <>
            {/* Moguls Score Hero */}
            <div className="card" style={{ marginBottom: 14, background: "linear-gradient(135deg,#0f0f1e,#16102a)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
                <div className="moguls-score-hero" style={{ padding: "8px 32px 8px 0", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="moguls-number" style={{ color: scoreColor((scores?.moguls_score ?? 0)) }}>{loading ? "—" : scores?.moguls_score ?? 0}</div>
                  <div className="moguls-label">Moguls Score</div>
                  <div className="moguls-sub">out of 1000</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
                    {[
                      { label: "Influence", val: scores?.influence_score ?? 0 },
                      { label: "Authority", val: scores?.authority_score ?? 0 },
                      { label: "Growth", val: scores?.growth_score ?? 0 },
                      { label: "Revenue", val: scores?.revenue_score ?? 0 },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: 22, fontWeight: 500, color: scoreColor(s.val), letterSpacing: "-0.02em" }}>{s.val}</div>
                        <div style={{ fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginTop: 3 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Executive KPIs */}
            <div className="grid-4">
              <div className="card-sm">
                <div className="card-label">Total Followers</div>
                <div className="big-val">{loading ? <div className="skel" style={{ height: 40, width: 100 }} /> : fmt(scores?.total_followers ?? 0)}</div>
                {(scores?.growth_pct_30d ?? 0) !== 0 && (
                  <div className={`growth-tag ${(scores?.growth_pct_30d ?? 0) >= 0 ? "green-tag" : "red-tag"}`}>
                    {(scores?.growth_pct_30d ?? 0) >= 0 ? "+" : ""}{scores?.growth_pct_30d?.toFixed(1)}% / 30d
                  </div>
                )}
              </div>
              <div className="card-sm">
                <div className="card-label">Avg Engagement</div>
                <div className="big-val">{loading ? "—" : `${(scores?.avg_engagement_rate ?? 0).toFixed(2)}%`}</div>
                <div className="big-sub">across all platforms</div>
              </div>
              <div className="card-sm">
                <div className="card-label">Revenue Score</div>
                <div className="big-val" style={{ color: scoreColor(scores?.revenue_score ?? 0) }}>{scores?.revenue_score ?? "—"}</div>
                {(scores?.predicted_revenue_30d ?? 0) > 0 && (
                  <div className="gold-tag" style={{ marginTop: 8, display: "inline-flex" }}>
                    ${Math.round(scores?.predicted_revenue_30d ?? 0)} est/30d
                  </div>
                )}
              </div>
              <div className="card-sm">
                <div className="card-label">Platforms</div>
                <div className="big-val">{connections.length}</div>
                <div className="big-sub">connected</div>
              </div>
            </div>

            {/* Sub-scores */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-label">Intelligence Breakdown</div>
              <div className="scores-row">
                <ScoreRing score={scores?.engagement_score ?? 0} label="Engagement" />
                <ScoreRing score={scores?.audience_quality ?? 0} label="Audience" />
                <ScoreRing score={scores?.content_score ?? 0} label="Content" />
                <ScoreRing score={scores?.virality_score ?? 0} label="Virality" />
                <ScoreRing score={scores?.consistency_score ?? 0} label="Consistency" />
              </div>
            </div>

            {/* Growth Chart */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div className="card-label" style={{ margin: 0 }}>Follower Growth</div>
                <div className="chart-controls">
                  {([30, 90, 365] as const).map(r => (
                    <button key={r} className={`range-btn ${chartRange === r ? "active" : ""}`} onClick={() => setChartRange(r)}>
                      {r}D
                    </button>
                  ))}
                </div>
              </div>
              {chartArr.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartArr} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c8a96e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#c8a96e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: "DM Mono,monospace", fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "DM Mono,monospace", fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v as number)} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="followers" stroke="#c8a96e" strokeWidth={2} fill="url(#goldGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                  Sync your accounts to see growth charts
                </div>
              )}
            </div>

            {/* Platform Breakdown + AI Insights */}
            <div className="grid-2">
              <div className="card">
                <div className="card-label">Platform Breakdown</div>
                {connections.map(c => {
                  const health = Math.min(100, Math.round(
                    (c.follower_count ?? 0 > 1000 ? 30 : 10) +
                    ((c.metrics?.engagementRate ?? 0) > 2 ? 40 : (c.metrics?.engagementRate ?? 0) * 15) +
                    (c.last_synced_at ? 30 : 0)
                  ));
                  const PLAT_COLORS: Record<string, string> = { instagram: "#E1306C", tiktok: "#c8a96e", youtube: "#FF0000", twitter: "#1DA1F2", linkedin: "#0077B5", telegram: "#2AABEE", website: "#50d48a", newsletter: "#a078e0", podcast: "#e8a830" };
                  const color = PLAT_COLORS[c.platform] ?? "#c8a96e";
                  return (
                    <div key={c.platform} className="platform-row">
                      <div className="plat-info">
                        <div className="plat-dot" style={{ background: color }} />
                        <div>
                          <div className="plat-name">{c.platform}</div>
                          <div className="plat-handle">{c.platform_username ? `@${c.platform_username}` : "—"}</div>
                        </div>
                      </div>
                      <div className="plat-right">
                        <div className="plat-val">{fmt(c.follower_count ?? 0)}</div>
                        <div className="health-bar">
                          <div className="health-fill" style={{ width: `${health}%`, background: health >= 70 ? "#50d48a" : health >= 40 ? "#c8a96e" : "#e05555" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card">
                <div className="card-label">AI Insights</div>
                {!brief && !(scores?.ai_insights?.length) ? (
                  <div style={{ color: "rgba(255,255,255,0.18)", fontSize: 13, lineHeight: 1.8 }}>
                    Click &ldquo;Run AI Analysis&rdquo; to generate personalized insights from your analytics.
                  </div>
                ) : (
                  (brief?.insights ?? scores?.ai_insights ?? []).map((ins, i) => (
                    <div key={i} className="insight-line">{ins}</div>
                  ))
                )}
                {brief && (
                  <>
                    <div className="divider" />
                    {brief.recommendations.slice(0, 3).map((r, i) => <div key={i} className="rec-card">{r}</div>)}
                    {brief.warning && <div className="warn-card">⚠ {brief.warning}</div>}
                  </>
                )}
              </div>
            </div>

            {/* Opportunities */}
            {brief?.opportunities && brief.opportunities.length > 0 && (
              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-label">Growth Opportunities</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
                  {brief.opportunities.map((o, i) => <div key={i} className="opp-card">{o}</div>)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Content Rankings Tab */}
        {!noAccounts && activeTab === "content" && (
          <div>
            <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
                {content.length} posts ranked
              </div>
              <button className="btn-ghost" onClick={() => fetch("/api/intelligence/sync-content", { method: "POST" }).then(() => load())}>
                Sync Top Content
              </button>
            </div>
            {content.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
                No content data yet. Sync your accounts to rank your top posts.
              </div>
            ) : (
              <div className="content-grid">
                {content.map(p => (
                  <a key={p.id} href={p.post_url ?? "#"} target="_blank" rel="noopener noreferrer" className="content-card">
                    <div className="content-platform">{p.platform} · {p.content_type}</div>
                    <div className="content-title">{p.title || "Untitled post"}</div>
                    <div className="content-stats">
                      <div className="cstat"><span>{fmt(p.views)}</span> views</div>
                      <div className="cstat"><span>{fmt(p.likes)}</span> likes</div>
                      <div className="cstat"><span>{p.engagement_rate.toFixed(1)}%</span> eng</div>
                    </div>
                    {p.virality_score > 700 && (
                      <div className="green-tag" style={{ marginTop: 10, display: "inline-flex", fontSize: 8, padding: "2px 8px" }}>Viral</div>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Coach Tab */}
        {!noAccounts && activeTab === "coach" && (
          <div className="card coach-container">
            <div className="card-label">AI Growth Coach</div>
            <div className="coach-messages">
              {coachMessages.length === 0 && (
                <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, padding: "20px 0" }}>
                  Ask me anything about growing your influence, improving your content, or monetizing your audience.
                </div>
              )}
              {coachMessages.map(m => (
                <div key={m.id} className={`msg ${m.role === "user" ? "msg-user" : "msg-assistant"}`}>
                  {m.content}
                </div>
              ))}
              {coaching && <div className="msg msg-assistant pulse">Analyzing your empire...</div>}
              <div ref={coachBottom} />
            </div>
            <div className="coach-input-row">
              <input
                className="coach-input"
                placeholder="Ask your AI Growth Coach..."
                value={coachInput}
                onChange={e => setCoachInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendCoach()}
                disabled={coaching}
              />
              <button className="btn-gold" onClick={sendCoach} disabled={coaching || !coachInput.trim()}>Send</button>
            </div>
          </div>
        )}

        {/* Affiliates tab */}
        {!noAccounts && activeTab === "affiliates" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontFamily: "var(--font-display,'Cormorant Garamond',serif)", fontSize: 28, fontWeight: 300, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>
              Brand Partnership Intelligence
            </div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, marginBottom: 28 }}>
              30+ curated affiliate programs matched to your niche and audience size.
            </div>
            <a href="/dashboard/affiliates" className="btn-gold" style={{ textDecoration: "none", display: "inline-block" }}>
              Browse All Programs →
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
