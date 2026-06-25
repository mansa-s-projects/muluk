"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Scores = {
  moguls_score: number;
  total_followers: number;
  total_revenue_usd: number;
  revenue_score: number;
  top_platform: string | null;
  growth_pct_7d: number;
  growth_pct_30d: number;
  predicted_revenue_30d: number;
  ai_recommendations: string[];
  ai_insights: string[];
};

type TrendPrediction = {
  platform: string;
  projectedFollowers14d: number;
  opportunityScore: number;
  confidence: "low" | "medium" | "high";
};

type TrendWindow = {
  labelUtc: string;
  expectedEngagementRate: number;
  samples: number;
};

type ScheduleSlot = {
  slotLabelUtc: string;
  confidence: "low" | "medium" | "high";
  evidenceSamples: number;
};

type Message = {
  supporter_code: string;
  content: string;
  from_creator: boolean | null;
  created_at: string;
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function WarRoomPage() {
  const [scores, setScores] = useState<Scores | null>(null);
  const [predictions, setPredictions] = useState<TrendPrediction[]>([]);
  const [trendWindows, setTrendWindows] = useState<TrendWindow[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [scoresRes, trendsRes, scheduleRes, messagesRes] = await Promise.all([
          fetch("/api/intelligence/scores").then(r => r.ok ? r.json() as Promise<{ scores: Scores | null }> : null),
          fetch("/api/intelligence/trends").then(r => r.ok ? r.json() as Promise<{ predictions: TrendPrediction[]; recommendedPostingWindowsUtc: TrendWindow[] }> : null),
          fetch("/api/intelligence/schedule-optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform: "all", lookbackDays: 90 }),
          }).then(r => r.ok ? r.json() as Promise<{ recommendedSlots: ScheduleSlot[] }> : null),
          fetch("/api/messages").then(r => r.ok ? r.json() as Promise<{ messages: Message[] }> : null),
        ]);

        if (cancelled) return;
        if (scoresRes) setScores(scoresRes.scores ?? null);
        if (trendsRes) { setPredictions(trendsRes.predictions ?? []); setTrendWindows(trendsRes.recommendedPostingWindowsUtc ?? []); }
        if (scheduleRes) setScheduleSlots(scheduleRes.recommendedSlots ?? []);
        if (messagesRes) setMessages(messagesRes.messages ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const activeThreads = useMemo(() => new Set(messages.map(m => m.supporter_code.toUpperCase())).size, [messages]);
  const latestSupporter = useMemo(() => [...messages].sort((a, b) => b.created_at.localeCompare(a.created_at)).find(m => !m.from_creator), [messages]);

  return (
    <div className="war-page">
      <style>{`
        *{box-sizing:border-box}
        .war-page{min-height:100vh;background:#020203;padding:32px;font-family:var(--font-body,'Outfit',sans-serif);color:rgba(255,255,255,0.88)}
        .top{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:22px}
        .eyebrow{font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7a6030;margin-bottom:8px}
        .title{font-family:var(--font-display,'Cormorant Garamond',serif);font-size:clamp(30px,4vw,52px);font-weight:300;line-height:1;margin:0}
        .sub{margin-top:8px;color:rgba(255,255,255,0.32);font-size:13px}
        .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
        @media(max-width:1100px){.grid{grid-template-columns:1fr 1fr}}
        @media(max-width:760px){.grid{grid-template-columns:1fr}}
        .card{background:#0f0f1e;border:1px solid rgba(255,255,255,0.055);border-radius:10px;padding:18px}
        .hero{background:linear-gradient(135deg,#0f0f1e,#16102a)}
        .label{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.28);margin-bottom:12px}
        .value{font-family:var(--font-mono,'DM Mono',monospace);font-size:34px;font-weight:500;color:#c8a96e;letter-spacing:-0.03em;line-height:1}
        .small{margin-top:6px;color:rgba(255,255,255,0.34);font-size:12px;line-height:1.7}
        .list{display:flex;flex-direction:column;gap:8px}
        .item{padding:12px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);font-size:13px;line-height:1.7;color:rgba(255,255,255,0.7)}
        .item::before{content:'→ ';color:#c8a96e}
        .row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
        .row:last-child{border-bottom:none}
        .row-title{font-size:13px;font-weight:500}
        .row-sub{margin-top:5px;font-size:11px;color:rgba(255,255,255,0.34);font-family:var(--font-mono,'DM Mono',monospace)}
        .pill{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.12em;text-transform:uppercase;padding:6px 8px;border-radius:999px;border:1px solid rgba(255,255,255,0.08)}
        .gold{background:rgba(200,169,110,0.08);border-color:rgba(200,169,110,0.18);color:#c8a96e}
        .green{background:rgba(80,212,138,0.08);border-color:rgba(80,212,138,0.18);color:#50d48a}
        .muted{color:rgba(255,255,255,0.22);font-size:13px;line-height:1.8}
        .split{display:grid;grid-template-columns:1.1fr 0.9fr;gap:14px;margin-top:14px}
        @media(max-width:980px){.split{grid-template-columns:1fr}}
        .links{display:flex;gap:10px;flex-wrap:wrap}
        .btnlink{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.16em;text-transform:uppercase;border-radius:3px;padding:10px 14px;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.65);text-decoration:none}
      `}</style>

      <div className="top">
        <div>
          <div className="eyebrow">Command Center</div>
          <h1 className="title">Revenue War Room</h1>
          <div className="sub">A live operating room for revenue, retention, timing, and response.
          </div>
        </div>
        <div className="links">
          <Link href="/dashboard/messages" className="btnlink">Inbox</Link>
          <Link href="/dashboard/social" className="btnlink">Share</Link>
          <Link href="/dashboard/voices" className="btnlink">Voice Lab</Link>
          <Link href="/dashboard/release" className="btnlink">Release</Link>
        </div>
      </div>

      <div className="grid">
        <div className="card hero">
          <div className="label">Moguls Score</div>
          <div className="value">{loading ? "—" : scores?.moguls_score ?? 0}</div>
          <div className="small">Top platform: {scores?.top_platform ?? "none"} · Followers: {fmt(scores?.total_followers ?? 0)}</div>
        </div>
        <div className="card">
          <div className="label">Revenue</div>
          <div className="value">{loading ? "—" : `$${fmt(scores?.predicted_revenue_30d ?? 0)}`}</div>
          <div className="small">30-day forecast. Use this as the first weekly planning anchor.</div>
        </div>
        <div className="card">
          <div className="label">Threads</div>
          <div className="value">{loading ? "—" : activeThreads}</div>
          <div className="small">Open supporter conversations and latest reply signal.</div>
        </div>
      </div>

      <div className="split">
        <div className="card">
          <div className="label">Next Best Actions</div>
          <div className="list">
            {(scores?.ai_recommendations?.length ? scores.ai_recommendations : [
              "Generate a fresh voice-based reply for your latest supporter thread.",
              "Share one new offer using the social composer to connected accounts.",
              "Post in the best UTC time window suggested by the schedule optimizer.",
            ]).slice(0, 3).map((item, idx) => <div key={idx} className="item">{item}</div>)}
          </div>
        </div>

        <div className="card">
          <div className="label">Latest Supporter Signal</div>
          {latestSupporter ? (
            <>
              <div className="row" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="row-title">{latestSupporter.supporter_code}</div>
                  <div className="row-sub">{new Date(latestSupporter.created_at).toLocaleString()}</div>
                </div>
                <div className="pill gold">Latest</div>
              </div>
              <div style={{ marginTop: 12, color: "rgba(255,255,255,0.68)", lineHeight: 1.8, fontSize: 13 }}>
                {latestSupporter.content}
              </div>
            </>
          ) : (
            <div className="muted">No supporter messages yet. Once people reply, the signal will appear here.</div>
          )}
        </div>
      </div>

      <div className="split">
        <div className="card">
          <div className="label">Trend Forecast</div>
          {predictions.length === 0 ? (
            <div className="muted">Not enough historical data yet. Sync more accounts to power forecasting.</div>
          ) : (
            predictions.slice(0, 3).map(p => (
              <div className="row" key={p.platform}>
                <div>
                  <div className="row-title">{p.platform}</div>
                  <div className="row-sub">{p.confidence} confidence · opportunity {p.opportunityScore.toFixed(1)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="row-title">{p.projectedFollowers14d.toLocaleString()}</div>
                  <div className="row-sub">14d projected followers</div>
                </div>
              </div>
            ))
          )}
          {trendWindows.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="label" style={{ marginBottom: 10 }}>Best UTC Windows</div>
              <div className="links">
                {trendWindows.slice(0, 3).map(w => <span key={w.labelUtc} className="pill gold">{w.labelUtc}</span>)}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="label">Scheduling</div>
          {scheduleSlots.length === 0 ? (
            <div className="muted">Historical post timing will unlock ranked publishing slots.</div>
          ) : (
            scheduleSlots.slice(0, 4).map(slot => (
              <div className="row" key={slot.slotLabelUtc}>
                <div>
                  <div className="row-title">{slot.slotLabelUtc}</div>
                  <div className="row-sub">{slot.evidenceSamples} sample posts · {slot.confidence} confidence</div>
                </div>
                <div className={`pill ${slot.confidence === "high" ? "green" : "gold"}`}>Best</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="label">War Room Links</div>
        <div className="links">
          <Link href="/dashboard/messages" className="btnlink">Open Inbox</Link>
          <Link href="/dashboard/social" className="btnlink">Push Social Share</Link>
          <Link href="/dashboard/voices" className="btnlink">Generate Voice Audio</Link>
          <Link href="/dashboard/release" className="btnlink">Run Smoke Checks</Link>
        </div>
      </div>
    </div>
  );
}
