"use client";

import { useState } from "react";

type Check = {
  name: string;
  path: string;
  status: number | null;
  ok: boolean;
  error?: string;
};

const TARGETS = [
  { name: "Landing", path: "/" },
  { name: "Login", path: "/login" },
  { name: "Dashboard", path: "/dashboard" },
  { name: "Twitter OAuth", path: "/api/auth/twitter/connect" },
  { name: "Env Debug", path: "/api/debug/env" },
];

export default function ReleaseReadinessPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const runChecks = async () => {
    setRunning(true);
    try {
      const results = await Promise.all(
        TARGETS.map(async target => {
          try {
            const res = await fetch(target.path, { method: target.path.startsWith("/api/") ? "GET" : "HEAD" });
            return {
              name: target.name,
              path: target.path,
              status: res.status,
              ok: res.ok,
            } satisfies Check;
          } catch (error) {
            return {
              name: target.name,
              path: target.path,
              status: null,
              ok: false,
              error: error instanceof Error ? error.message : "Request failed",
            } satisfies Check;
          }
        })
      );
      setChecks(results);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="release-page">
      <style>{`
        *{box-sizing:border-box}
        .release-page{min-height:100vh;background:#020203;padding:32px;font-family:var(--font-body,'Outfit',sans-serif);color:rgba(255,255,255,0.88)}
        .top{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:22px}
        .eyebrow{font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7a6030;margin-bottom:8px}
        .title{font-family:var(--font-display,'Cormorant Garamond',serif);font-size:clamp(30px,4vw,52px);font-weight:300;line-height:1;margin:0}
        .sub{margin-top:8px;color:rgba(255,255,255,0.32);font-size:13px}
        .btn{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.16em;text-transform:uppercase;border:none;border-radius:3px;padding:10px 14px;cursor:pointer}
        .btn-gold{background:#c8a96e;color:#090603}
        .btn-ghost{background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.55)}
        .card{background:#0f0f1e;border:1px solid rgba(255,255,255,0.055);border-radius:10px;padding:18px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        @media(max-width:900px){.grid{grid-template-columns:1fr}}
        .row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
        .row:last-child{border-bottom:none}
        .name{font-size:13px;font-weight:500}
        .path{font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;color:rgba(255,255,255,0.34);margin-top:5px}
        .ok{color:#50d48a}
        .bad{color:#e05555}
        .pill{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.12em;text-transform:uppercase;padding:6px 8px;border-radius:999px;border:1px solid rgba(255,255,255,0.08)}
        .pill.ok{background:rgba(80,212,138,0.08);border-color:rgba(80,212,138,0.18)}
        .pill.bad{background:rgba(224,85,85,0.08);border-color:rgba(224,85,85,0.18)}
        .summary{display:flex;gap:12px;flex-wrap:wrap}
        .metric{padding:14px 16px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);min-width:150px}
        .metric-label{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.28)}
        .metric-value{margin-top:8px;font-size:26px;font-family:var(--font-mono,'DM Mono',monospace);color:#c8a96e}
      `}</style>

      <div className="top">
        <div>
          <div className="eyebrow">Operator Tools</div>
          <h1 className="title">Release Readiness</h1>
          <div className="sub">Run a fast smoke suite against the routes that matter before a deploy.</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>Reload</button>
          <button className="btn btn-gold" onClick={() => void runChecks()} disabled={running}>
            {running ? "Checking..." : "Run Smoke Checks"}
          </button>
        </div>
      </div>

      <div className="summary" style={{ marginBottom: 14 }}>
        <div className="metric">
          <div className="metric-label">Targets</div>
          <div className="metric-value">{TARGETS.length}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Passed</div>
          <div className="metric-value" style={{ color: "#50d48a" }}>{checks.filter(c => c.ok).length}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Failed</div>
          <div className="metric-value" style={{ color: "#e05555" }}>{checks.filter(c => !c.ok).length}</div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="card-label" style={{ marginBottom: 14 }}>Smoke Suite</div>
          {checks.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.22)", fontSize: 13, lineHeight: 1.8 }}>Run the smoke checks to verify deploy readiness.</div>
          ) : (
            checks.map(check => (
              <div className="row" key={check.path}>
                <div>
                  <div className="name">{check.name}</div>
                  <div className="path">{check.path}</div>
                  {check.error && <div className="path" style={{ color: "#e05555", marginTop: 6 }}>{check.error}</div>}
                </div>
                <div className={`pill ${check.ok ? "ok" : "bad"}`}>
                  {check.ok ? `OK ${check.status}` : `FAIL ${check.status ?? "ERR"}`}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-label" style={{ marginBottom: 14 }}>Release Notes</div>
          <div style={{ color: "rgba(255,255,255,0.64)", fontSize: 13, lineHeight: 1.8 }}>
            This page is designed to catch broken routes before a public deploy. As the app grows, this should evolve into a richer gate that includes OAuth callback checks, env var validation, and core user-path testing.
          </div>
          <div style={{ marginTop: 16, color: "rgba(255,255,255,0.32)", fontSize: 12, lineHeight: 1.8 }}>
            Use it before pushing to production and after each major feature bundle ships.
          </div>
        </div>
      </div>
    </div>
  );
}
