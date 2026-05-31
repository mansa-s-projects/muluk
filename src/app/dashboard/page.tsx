"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type Scores = {
  moguls_score: number;
  total_followers: number;
  total_revenue_usd: number;
  growth_pct_30d: number;
  predicted_revenue_30d: number;
  top_platform: string | null;
  last_scored_at: string | null;
};

type Connection = {
  platform: string;
  platform_username: string | null;
  follower_count: number | null;
  last_synced_at: string | null;
};

type DashData = {
  scores: Scores | null;
  connections: Connection[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function scoreColor(s: number): string {
  if (s >= 700) return "#50d48a";
  if (s >= 400) return "#c8a96e";
  return "#e05555";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonBlock({ w, h }: { w: string; h: number }) {
  return (
    <div
      className="skel"
      style={{ width: w, height: h, borderRadius: 4 }}
    />
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  loading: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      {loading ? (
        <SkeletonBlock w="70%" h={36} />
      ) : (
        <div className="stat-value" style={accent ? { color: accent } : undefined}>
          {value}
        </div>
      )}
      {sub && !loading && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function ActionCard({
  href,
  eyebrow,
  title,
  desc,
  arrow,
}: {
  href: string;
  eyebrow: string;
  title: string;
  desc: string;
  arrow?: boolean;
}) {
  return (
    <Link href={href} className="action-card" style={{ textDecoration: "none" }}>
      <div className="action-eyebrow">{eyebrow}</div>
      <div className="action-title">
        {title}
        {arrow && <span className="action-arrow"> →</span>}
      </div>
      <div className="action-desc">{desc}</div>
    </Link>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardHome() {
  const [data, setData] = useState<DashData>({ scores: null, connections: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/intelligence/scores").then(r =>
        r.ok
          ? (r.json() as Promise<{ scores: Scores | null; connections: Connection[] }>)
          : null,
      ),
      fetch("/api/social/connections").then(r =>
        r.ok
          ? (r.json() as Promise<{ connections: Connection[] }>)
          : null,
      ),
    ])
      .then(([intel, social]) => {
        setData({
          scores: intel?.scores ?? null,
          connections: intel?.connections ?? social?.connections ?? [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { scores, connections } = data;
  const noAccounts = !loading && connections.length === 0;
  const activePlatforms = connections.filter(c => c.platform_username).length;
  const totalFollowers = connections.reduce((s, c) => s + (c.follower_count ?? 0), 0);
  const mogulsScore = scores?.moguls_score ?? 0;
  const revenue = scores?.total_revenue_usd ?? 0;
  const growth30d = scores?.growth_pct_30d ?? 0;

  return (
    <div className="dash-home">
      {/* ── Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .dash-home {
          min-height: 100vh;
          background: #020203;
          padding: 44px 48px 80px;
          font-family: 'Outfit', var(--font-body, sans-serif);
          color: rgba(255,255,255,0.88);
          position: relative;
        }

        /* Noise texture */
        .dash-home::before {
          content: '';
          position: fixed; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.038'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        /* Gold orb */
        .orb {
          position: fixed;
          top: -200px; right: -160px;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(200,169,110,0.07) 0%, transparent 65%);
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
          animation: breathe 9s ease-in-out infinite;
        }

        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%       { transform: scale(1.12); opacity: 1; }
        }

        .z1 { position: relative; z-index: 1; }

        /* ── Header ── */
        .header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 48px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .eyebrow {
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #7a6030;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .eyebrow::before {
          content: '';
          display: block;
          width: 24px; height: 1px;
          background: #7a6030;
        }

        .page-title {
          font-family: 'Cormorant Garamond', var(--font-display, serif);
          font-size: clamp(32px, 4.5vw, 58px);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 1.1;
          color: rgba(255,255,255,0.92);
        }

        .page-sub {
          font-size: 14px;
          font-weight: 300;
          color: rgba(255,255,255,0.35);
          margin-top: 6px;
        }

        .header-meta {
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 10px;
          letter-spacing: 0.15em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
          text-align: right;
        }

        .scored-at {
          margin-top: 4px;
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 9px;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.15);
        }

        /* ── Stats Row ── */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 14px;
        }

        @media (max-width: 1000px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px)  { .stats-row { grid-template-columns: 1fr; } }

        .stat-card {
          background: #0f0f1e;
          border: 1px solid rgba(255,255,255,0.055);
          border-radius: 10px;
          padding: 22px 24px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
        }
        .stat-card:hover { border-color: rgba(255,255,255,0.09); transform: translateY(-1px); }
        .stat-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, #c8a96e, transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .stat-card:hover::before { opacity: 1; }

        .stat-label {
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.28);
          margin-bottom: 14px;
        }

        .stat-value {
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 38px;
          font-weight: 500;
          color: #c8a96e;
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .stat-sub {
          font-size: 12px;
          font-weight: 300;
          color: rgba(255,255,255,0.28);
          margin-top: 8px;
        }

        .growth-badge {
          display: inline-flex;
          align-items: center;
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 9px;
          letter-spacing: 0.12em;
          padding: 3px 8px;
          border-radius: 100px;
          margin-top: 10px;
        }
        .badge-green { color: #50d48a; background: rgba(80,212,138,0.1); border: 1px solid rgba(80,212,138,0.22); }
        .badge-red   { color: #e05555; background: rgba(224,85,85,0.1);  border: 1px solid rgba(224,85,85,0.22);  }
        .badge-gold  { color: #c8a96e; background: rgba(200,169,110,0.1); border: 1px solid rgba(200,169,110,0.22); }

        /* ── Action Cards ── */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 14px;
        }
        @media (max-width: 760px) { .actions-grid { grid-template-columns: 1fr; } }

        .action-card {
          background: #0f0f1e;
          border: 1px solid rgba(255,255,255,0.055);
          border-radius: 10px;
          padding: 28px 26px 32px;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          display: block;
          transition: border-color 0.2s, transform 0.2s;
        }
        .action-card:hover { border-color: rgba(200,169,110,0.22); transform: translateY(-1px); }
        .action-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, #c8a96e, transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .action-card:hover::before { opacity: 1; }

        .action-eyebrow {
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #7a6030;
          margin-bottom: 12px;
        }

        .action-title {
          font-family: 'Cormorant Garamond', var(--font-display, serif);
          font-size: 26px;
          font-weight: 300;
          color: rgba(255,255,255,0.9);
          letter-spacing: -0.01em;
          margin-bottom: 10px;
        }

        .action-arrow {
          color: #c8a96e;
          transition: transform 0.2s;
          display: inline-block;
        }
        .action-card:hover .action-arrow { transform: translateX(4px); }

        .action-desc {
          font-size: 13px;
          font-weight: 300;
          color: rgba(255,255,255,0.3);
          line-height: 1.7;
        }

        /* ── Quick Links ── */
        .quick-links {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .ghost-btn {
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          background: transparent;
          color: rgba(255,255,255,0.38);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 3px;
          padding: 11px 20px;
          text-decoration: none;
          display: inline-block;
          transition: color 0.2s, border-color 0.2s;
          cursor: pointer;
        }
        .ghost-btn:hover { color: rgba(255,255,255,0.78); border-color: rgba(255,255,255,0.18); }

        /* ── Empty State ── */
        .empty-banner {
          background: linear-gradient(135deg, #0f0f1e, rgba(200,169,110,0.04));
          border: 1px solid rgba(200,169,110,0.15);
          border-radius: 12px;
          padding: 60px 48px;
          text-align: center;
          margin-bottom: 14px;
          position: relative;
          overflow: hidden;
        }
        .empty-banner::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, #c8a96e, transparent);
          opacity: 0.7;
        }

        .empty-title {
          font-family: 'Cormorant Garamond', var(--font-display, serif);
          font-size: clamp(24px, 3vw, 38px);
          font-weight: 300;
          color: rgba(255,255,255,0.7);
          margin-bottom: 10px;
        }
        .empty-title em {
          font-style: italic;
          color: #c8a96e;
        }

        .empty-sub {
          font-size: 14px;
          font-weight: 300;
          color: rgba(255,255,255,0.28);
          line-height: 1.8;
          max-width: 420px;
          margin: 0 auto 32px;
        }

        .btn-primary {
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          background: #c8a96e;
          color: #0a0800;
          border: none;
          border-radius: 3px;
          padding: 14px 32px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: opacity 0.2s;
        }
        .btn-primary:hover { opacity: 0.85; }

        /* ── Activity Feed ── */
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .section-label {
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.28);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .section-label::before {
          content: '';
          display: block;
          width: 18px; height: 1px;
          background: rgba(255,255,255,0.15);
        }

        .coming-soon-badge {
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 8px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #7a6030;
          background: rgba(200,169,110,0.07);
          border: 1px solid rgba(200,169,110,0.15);
          border-radius: 100px;
          padding: 3px 10px;
        }

        .activity-card {
          background: #0f0f1e;
          border: 1px solid rgba(255,255,255,0.055);
          border-radius: 10px;
          padding: 28px;
          position: relative;
          overflow: hidden;
        }

        .activity-placeholder {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .activity-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .activity-row:last-child { border-bottom: none; }

        .activity-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .activity-text {
          flex: 1;
          font-size: 13px;
          font-weight: 300;
          color: rgba(255,255,255,0.22);
        }

        .activity-time {
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 9px;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.12);
        }

        .activity-coming {
          text-align: center;
          padding: 24px 0 12px;
        }

        .activity-coming-title {
          font-family: 'Cormorant Garamond', var(--font-display, serif);
          font-size: 22px;
          font-weight: 300;
          font-style: italic;
          color: rgba(255,255,255,0.22);
          margin-bottom: 6px;
        }

        .activity-coming-sub {
          font-size: 12px;
          font-weight: 300;
          color: rgba(255,255,255,0.14);
        }

        /* ── Platforms mini strip ── */
        .platforms-strip {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 14px;
          margin-bottom: 14px;
        }

        .plat-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 100px;
          padding: 6px 12px;
          font-family: 'DM Mono', var(--font-mono, monospace);
          font-size: 10px;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.45);
          text-transform: capitalize;
        }

        .plat-dot-sm {
          width: 6px; height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* ── Divider ── */
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
          margin: 32px 0;
        }

        /* ── Skeleton ── */
        .skel {
          background: linear-gradient(90deg, #111122 25%, #1a1a30 50%, #111122 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-track { background: #020203; }
        ::-webkit-scrollbar-thumb { background: rgba(200,169,110,0.2); border-radius: 2px; }
      `}</style>

      <div className="orb" />

      <div className="z1">

        {/* ── Header ── */}
        <div className="header">
          <div>
            <div className="eyebrow">Empire Overview</div>
            <h1 className="page-title">
              {loading ? "Your Empire" : "Empire Overview"}
            </h1>
            <p className="page-sub">
              {loading
                ? "Loading your intelligence layer..."
                : activePlatforms > 0
                ? `${activePlatforms} platform${activePlatforms !== 1 ? "s" : ""} active — your empire, unified.`
                : "Connect your first platform to begin."}
            </p>
          </div>

          {!loading && scores?.last_scored_at && (
            <div className="header-meta">
              <div>Last scored</div>
              <div className="scored-at">
                {new Date(scores.last_scored_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Empty State: no platforms ── */}
        {noAccounts && (
          <div className="empty-banner">
            <div className="empty-title">
              Your empire is <em>waiting</em> to be built.
            </div>
            <p className="empty-sub">
              Connect Instagram, TikTok, YouTube, X, LinkedIn, or Telegram.
              Mansas Moguls becomes your intelligence layer across every platform you own.
            </p>
            <Link href="/dashboard/integrations" className="btn-primary">
              Connect First Platform →
            </Link>
          </div>
        )}

        {/* ── Stats Row ── */}
        <div className="stats-row">
          <StatCard
            label="Total Followers"
            value={fmt(totalFollowers)}
            sub={
              growth30d !== 0
                ? undefined
                : activePlatforms > 0
                ? "across all platforms"
                : "no platforms connected"
            }
            accent="#c8a96e"
            loading={loading}
          />
          <div className="stat-card">
            <div className="stat-label">Moguls Score</div>
            {loading ? (
              <SkeletonBlock w="55%" h={36} />
            ) : (
              <>
                <div
                  className="stat-value"
                  style={{ color: scoreColor(mogulsScore) }}
                >
                  {mogulsScore}
                </div>
                <div className="stat-sub" style={{ color: "rgba(255,255,255,0.18)" }}>
                  out of 1000
                </div>
                {mogulsScore > 0 && (
                  <div
                    className={`growth-badge ${
                      mogulsScore >= 700
                        ? "badge-green"
                        : mogulsScore >= 400
                        ? "badge-gold"
                        : "badge-red"
                    }`}
                  >
                    {mogulsScore >= 700
                      ? "Elite Tier"
                      : mogulsScore >= 400
                      ? "Rising"
                      : "Emerging"}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="stat-card">
            <div className="stat-label">Revenue</div>
            {loading ? (
              <SkeletonBlock w="60%" h={36} />
            ) : (
              <>
                <div className="stat-value">{revenue > 0 ? fmtUsd(revenue) : "—"}</div>
                {scores?.predicted_revenue_30d && scores.predicted_revenue_30d > 0 ? (
                  <div className="growth-badge badge-gold" style={{ marginTop: 10 }}>
                    {fmtUsd(scores.predicted_revenue_30d)} est / 30d
                  </div>
                ) : (
                  <div className="stat-sub">lifetime earnings</div>
                )}
              </>
            )}
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Platforms</div>
            {loading ? (
              <SkeletonBlock w="40%" h={36} />
            ) : (
              <>
                <div className="stat-value" style={{ color: "#c8a96e" }}>
                  {activePlatforms}
                </div>
                {growth30d !== 0 && (
                  <div
                    className={`growth-badge ${
                      growth30d >= 0 ? "badge-green" : "badge-red"
                    }`}
                    style={{ marginTop: 10 }}
                  >
                    {growth30d >= 0 ? "+" : ""}
                    {growth30d.toFixed(1)}% / 30d
                  </div>
                )}
                {activePlatforms === 0 && (
                  <div className="stat-sub">none connected yet</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Platform pills */}
        {!loading && connections.length > 0 && (
          <div className="platforms-strip">
            {connections.map(c => {
              const COLORS: Record<string, string> = {
                instagram: "#E1306C", tiktok: "#c8a96e", youtube: "#FF0000",
                twitter: "#1DA1F2", linkedin: "#0077B5", telegram: "#2AABEE",
                website: "#50d48a", newsletter: "#a078e0",
              };
              return (
                <div key={c.platform} className="plat-pill">
                  <div
                    className="plat-dot-sm"
                    style={{ background: COLORS[c.platform] ?? "#c8a96e" }}
                  />
                  {c.platform}
                  {c.platform_username && (
                    <span style={{ color: "rgba(255,255,255,0.22)" }}>
                      @{c.platform_username}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="divider" />

        {/* ── Action Cards ── */}
        <div className="actions-grid">
          <ActionCard
            href="/dashboard/intelligence"
            eyebrow="Intelligence Layer"
            title="Intelligence"
            desc="Moguls Score, growth trends, AI insights, and content rankings across every platform."
            arrow
          />
          <ActionCard
            href="/dashboard/integrations"
            eyebrow="Platform Command"
            title="Integrations"
            desc="Connect and sync Instagram, TikTok, YouTube, X, LinkedIn, and Telegram."
            arrow
          />
          <ActionCard
            href="/dashboard/affiliates"
            eyebrow="Brand Revenue"
            title="Affiliates"
            desc="Curated brand partnerships matched to your niche. Earn from every recommendation."
            arrow
          />
        </div>

        {/* ── Quick Links ── */}
        <div className="quick-links">
          <Link href="/dashboard/settings" className="ghost-btn">
            Settings
          </Link>
          <Link href="/dashboard/intelligence?tab=coach" className="ghost-btn">
            AI Coach
          </Link>
          <Link href="/dashboard/intelligence?tab=strategy" className="ghost-btn">
            Strategy Room
          </Link>
          <Link href="/dashboard/workflows" className="ghost-btn">
            Workflows
          </Link>
        </div>

        <div className="divider" />

        {/* ── Recent Activity Feed ── */}
        <div className="section-header">
          <div className="section-label">Recent Activity</div>
          <div className="coming-soon-badge">Coming Soon</div>
        </div>

        <div className="activity-card">
          <div className="activity-placeholder">
            {[
              { color: "rgba(200,169,110,0.4)", text: "Platform sync events and follower milestones", time: "—" },
              { color: "rgba(80,212,138,0.4)",  text: "Revenue transactions and affiliate conversions", time: "—" },
              { color: "rgba(91,141,232,0.4)",  text: "AI Coach interactions and strategy updates", time: "—" },
              { color: "rgba(160,120,224,0.4)", text: "Intelligence scores and briefing completions", time: "—" },
            ].map((row, i) => (
              <div key={i} className="activity-row">
                <div
                  className="activity-dot"
                  style={{ background: row.color }}
                />
                <div className="activity-text">{row.text}</div>
                <div className="activity-time">{row.time}</div>
              </div>
            ))}
          </div>

          <div className="activity-coming">
            <div className="activity-coming-title">
              Your empire&rsquo;s story, unfolding in real time.
            </div>
            <div className="activity-coming-sub">
              Live activity feed ships in the next release.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
