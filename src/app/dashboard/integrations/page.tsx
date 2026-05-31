"use client";

import { useEffect, useState, useCallback } from "react";

type Connection = {
  platform: string;
  platform_username: string | null;
  follower_count: number | null;
  metrics: Record<string, number> | null;
  last_synced_at: string | null;
  profile_url: string | null;
};

const PLATFORMS = [
  { key: "instagram", label: "Instagram", color: "#E1306C", icon: "IG", connectPath: "/api/auth/instagram/connect?next=/dashboard/integrations" },
  { key: "tiktok",    label: "TikTok",    color: "#010101", icon: "TT", connectPath: "/api/auth/tiktok/connect?next=/dashboard/integrations" },
  { key: "youtube",   label: "YouTube",   color: "#FF0000", icon: "YT", connectPath: "/api/auth/youtube/connect?next=/dashboard/integrations" },
  { key: "twitter",   label: "X / Twitter", color: "#1DA1F2", icon: "X",  connectPath: "/api/auth/twitter/connect?next=/dashboard/integrations" },
  { key: "telegram",  label: "Telegram",  color: "#2AABEE", icon: "TG", connectPath: "/api/auth/telegram/connect?next=/dashboard/integrations" },
];

function fmt(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const loadConnections = useCallback(() => {
    fetch("/api/social/connections")
      .then(r => r.ok ? r.json() as Promise<{ connections: Connection[] }> : Promise.resolve({ connections: [] }))
      .then(data => { setConnections(data.connections ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  const sync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    const res = await fetch("/api/social/sync", { method: "POST" });
    const data = await res.json() as { synced: number; platforms: string[] };
    setSyncMsg(`Synced ${data.synced} platform${data.synced !== 1 ? "s" : ""}`);
    setSyncing(false);
    void loadConnections();
  };

  const connMap = new Map(connections.map(c => [c.platform, c]));

  return (
    <div className="integrations-page">
      <style>{`
        .integrations-page {
          min-height: 100vh;
          background: #020203;
          padding: 48px 40px;
          font-family: var(--font-body, 'Outfit', sans-serif);
          position: relative;
        }
        .integrations-page::before {
          content: '';
          position: fixed; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.038'/%3E%3C/svg%3E");
          pointer-events: none; z-index: 0;
        }
        .int-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: 48px; position: relative; z-index: 1;
        }
        .int-eyebrow {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase;
          color: #7a6030; display: flex; align-items: center; gap: 12px;
          margin-bottom: 12px;
        }
        .int-eyebrow::before { content: ''; width: 24px; height: 1px; background: #7a6030; }
        .int-title {
          font-family: var(--font-display, 'Cormorant Garamond', serif);
          font-size: clamp(32px, 4vw, 52px); font-weight: 300; color: rgba(255,255,255,0.92);
          letter-spacing: -0.02em; margin: 0;
        }
        .int-subtitle { color: rgba(255,255,255,0.4); font-size: 14px; margin-top: 6px; font-weight: 300; }
        .sync-btn {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 11px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase;
          background: transparent; color: #c8a96e;
          border: 1px solid rgba(200,169,110,0.3); border-radius: 3px;
          padding: 12px 24px; cursor: pointer; transition: background 0.2s;
          display: flex; align-items: center; gap: 8px;
        }
        .sync-btn:hover { background: rgba(200,169,110,0.08); }
        .sync-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sync-msg {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 11px; color: #50d48a; letter-spacing: 0.12em;
          margin-top: 8px; text-align: right;
        }
        .platforms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 16px; position: relative; z-index: 1;
        }
        .platform-card {
          background: #0f0f1e; border: 1px solid rgba(255,255,255,0.055);
          border-radius: 10px; padding: 24px; position: relative; overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
        }
        .platform-card:hover { border-color: rgba(255,255,255,0.09); transform: translateY(-1px); }
        .platform-card.connected { border-color: rgba(200,169,110,0.15); }
        .platform-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--plat-color, #c8a96e), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .platform-card.connected::before { opacity: 0.6; }
        .platform-card:hover::before { opacity: 1; }
        .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .platform-icon {
          width: 44px; height: 44px; border-radius: 8px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.6);
          letter-spacing: 0.05em;
        }
        .platform-status {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 9px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase;
          padding: 4px 10px; border-radius: 100px; border: 1px solid;
        }
        .status-connected { color: #50d48a; background: rgba(80,212,138,0.1); border-color: rgba(80,212,138,0.25); }
        .status-disconnected { color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
        .platform-name {
          font-family: var(--font-display, 'Cormorant Garamond', serif);
          font-size: 22px; font-weight: 300; color: rgba(255,255,255,0.92);
          margin: 0 0 4px;
        }
        .platform-handle { font-size: 13px; color: rgba(255,255,255,0.35); font-weight: 300; }
        .metrics-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
        .metric { }
        .metric-val {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 18px; font-weight: 500; color: rgba(255,255,255,0.88); letter-spacing: -0.02em;
        }
        .metric-lbl {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(255,255,255,0.25); margin-top: 2px;
        }
        .divider { height: 1px; background: rgba(255,255,255,0.05); margin: 16px 0; }
        .card-footer { display: flex; align-items: center; justify-content: space-between; }
        .sync-time {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px; color: rgba(255,255,255,0.2); letter-spacing: 0.1em;
        }
        .connect-btn {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase;
          background: rgba(200,169,110,0.1); color: #c8a96e;
          border: 1px solid rgba(200,169,110,0.25); border-radius: 3px;
          padding: 8px 16px; cursor: pointer; text-decoration: none;
          transition: background 0.2s;
        }
        .connect-btn:hover { background: rgba(200,169,110,0.18); }
        .disconnect-btn {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;
          color: rgba(255,255,255,0.2); background: transparent; border: none;
          cursor: pointer; padding: 8px 0; transition: color 0.2s;
        }
        .disconnect-btn:hover { color: rgba(224,85,85,0.8); }
        .skeleton { background: linear-gradient(90deg, #111122 25%, #1a1a30 50%, #111122 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .total-bar {
          background: #0f0f1e; border: 1px solid rgba(255,255,255,0.055);
          border-radius: 10px; padding: 20px 28px; margin-bottom: 24px;
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
          position: relative; z-index: 1;
        }
        .total-val {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 28px; font-weight: 500; color: #c8a96e; letter-spacing: -0.02em;
        }
        .total-lbl {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(255,255,255,0.25); margin-top: 4px;
        }
      `}</style>

      <div className="int-header">
        <div>
          <div className="int-eyebrow">Empire Integrations</div>
          <h1 className="int-title">Social Command</h1>
          <p className="int-subtitle">Connect your platforms. Mansas Moguls becomes your intelligence layer.</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <button className="sync-btn" onClick={sync} disabled={syncing}>
            {syncing ? "Syncing..." : "↻ Sync All"}
          </button>
          {syncMsg && <div className="sync-msg">{syncMsg}</div>}
        </div>
      </div>

      {!loading && connections.length > 0 && (
        <div className="total-bar">
          <div>
            <div className="total-val">{fmt(connections.reduce((s, c) => s + (c.follower_count ?? 0), 0))}</div>
            <div className="total-lbl">Total Followers</div>
          </div>
          <div>
            <div className="total-val">{connections.filter(c => c.follower_count).length}</div>
            <div className="total-lbl">Active Platforms</div>
          </div>
          <div>
            <div className="total-val">
              {connections.length > 0
                ? `${(connections.reduce((s, c) => s + (c.metrics?.engagementRate ?? 0), 0) / connections.length).toFixed(1)}%`
                : "—"}
            </div>
            <div className="total-lbl">Avg Engagement</div>
          </div>
          <div>
            <div className="total-val">{connections.filter(c => c.last_synced_at).length > 0 ? "Live" : "Pending"}</div>
            <div className="total-lbl">Data Status</div>
          </div>
        </div>
      )}

      <div className="platforms-grid">
        {loading
          ? PLATFORMS.map(p => (
              <div key={p.key} className="platform-card">
                <div className="skeleton" style={{ height: 44, width: 44, borderRadius: 8, marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 22, width: "60%", marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: "40%" }} />
              </div>
            ))
          : PLATFORMS.map(p => {
              const conn = connMap.get(p.key);
              const isConnected = !!conn?.platform_username;
              const metrics = conn?.metrics as Record<string, number> | null;

              return (
                <div
                  key={p.key}
                  className={`platform-card ${isConnected ? "connected" : ""}`}
                  style={{ "--plat-color": p.color } as React.CSSProperties}
                >
                  <div className="card-top">
                    <div className="platform-icon">{p.icon}</div>
                    <span className={`platform-status ${isConnected ? "status-connected" : "status-disconnected"}`}>
                      {isConnected ? "Connected" : "Not Connected"}
                    </span>
                  </div>

                  <div className="platform-name">{p.label}</div>
                  <div className="platform-handle">
                    {conn?.platform_username ? `@${conn.platform_username}` : "No account linked"}
                  </div>

                  {isConnected && (
                    <>
                      <div className="metrics-row">
                        <div className="metric">
                          <div className="metric-val">{fmt(conn?.follower_count ?? null)}</div>
                          <div className="metric-lbl">Followers</div>
                        </div>
                        <div className="metric">
                          <div className="metric-val">
                            {metrics?.engagementRate != null ? `${metrics.engagementRate.toFixed(1)}%` : "—"}
                          </div>
                          <div className="metric-lbl">Engagement</div>
                        </div>
                        <div className="metric">
                          <div className="metric-val">{fmt(metrics?.posts_count ?? null)}</div>
                          <div className="metric-lbl">Posts</div>
                        </div>
                      </div>
                      <div className="divider" />
                    </>
                  )}

                  <div className="card-footer">
                    <span className="sync-time">
                      {isConnected ? `Synced ${timeAgo(conn?.last_synced_at ?? null)}` : ""}
                    </span>
                    {isConnected
                      ? <button className="disconnect-btn">Disconnect</button>
                      : <a href={p.connectPath} className="connect-btn">Connect →</a>
                    }
                  </div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}
