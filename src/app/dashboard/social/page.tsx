"use client";

import { useState } from "react";

type ShareResult = {
  platform: string;
  ok: boolean;
  error?: string;
};

export default function SocialSharePage() {
  const [contentTitle, setContentTitle] = useState("New drop is live");
  const [shareText, setShareText] = useState("New exclusive content just dropped 🔒");
  const [results, setResults] = useState<ShareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch("/api/social/auto-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentTitle, shareText }),
      });
      const json = (await res.json().catch(() => ({}))) as { results?: ShareResult[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to share content");
      setResults(json.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="social-page">
      <style>{`
        *{box-sizing:border-box}
        .social-page{min-height:100vh;background:#020203;padding:32px;font-family:var(--font-body,'Outfit',sans-serif);color:rgba(255,255,255,0.88)}
        .top{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:22px}
        .eyebrow{font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7a6030;margin-bottom:8px}
        .title{font-family:var(--font-display,'Cormorant Garamond',serif);font-size:clamp(30px,4vw,52px);font-weight:300;line-height:1;margin:0}
        .sub{margin-top:8px;color:rgba(255,255,255,0.32);font-size:13px}
        .card{background:#0f0f1e;border:1px solid rgba(255,255,255,0.055);border-radius:10px;padding:18px}
        .layout{display:grid;grid-template-columns:1.05fr .95fr;gap:14px}
        @media(max-width:980px){.layout{grid-template-columns:1fr}}
        .label{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.28);margin-bottom:10px}
        .input,.textarea{width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(255,255,255,0.84);padding:12px 14px;font-family:var(--font-body,'Outfit',sans-serif);font-size:13px;outline:none}
        .textarea{min-height:120px;resize:vertical;line-height:1.7}
        .input:focus,.textarea:focus{border-color:rgba(200,169,110,0.35)}
        .field{margin-bottom:12px}
        .btn{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.16em;text-transform:uppercase;border:none;border-radius:3px;padding:10px 14px;cursor:pointer}
        .btn-gold{background:#c8a96e;color:#090603}
        .btn-ghost{background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.55)}
        .row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
        .result{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);margin-top:8px;background:rgba(255,255,255,0.02)}
        .ok{color:#50d48a}
        .bad{color:#e05555}
        .preview{padding:16px;border-radius:8px;border:1px solid rgba(200,169,110,0.14);background:rgba(200,169,110,0.04);line-height:1.8;color:rgba(255,255,255,0.72);white-space:pre-wrap}
        .error{padding:12px 14px;border-radius:8px;background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.16);color:rgba(224,85,85,0.92);margin-bottom:14px;font-size:13px;line-height:1.6}
      `}</style>

      <div className="top">
        <div>
          <div className="eyebrow">Social Amplifier</div>
          <h1 className="title">Share Composer</h1>
          <div className="sub">Push content to connected social accounts from one control panel.</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>Reload</button>
          <button className="btn btn-gold" onClick={() => void handleShare()} disabled={loading}>
            {loading ? "Sharing..." : "Share Now"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="layout">
        <div className="card">
          <div className="label">Compose</div>
          <div className="field">
            <input className="input" value={contentTitle} onChange={e => setContentTitle(e.target.value)} placeholder="Content title" />
          </div>
          <div className="field">
            <textarea className="textarea" value={shareText} onChange={e => setShareText(e.target.value)} placeholder="Share text" />
          </div>
          <div className="row">
            <div className="label" style={{ marginBottom: 0 }}>Auto-shares to connected Twitter and Telegram accounts</div>
            <button className="btn btn-gold" onClick={() => void handleShare()} disabled={loading}>
              {loading ? "Sharing..." : "Push Live"}
            </button>
          </div>
          <div style={{ marginTop: 18 }}>
            <div className="label">Results</div>
            {results.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, lineHeight: 1.8 }}>
                When you share, platform-specific results will appear here.
              </div>
            ) : (
              results.map(result => (
                <div key={result.platform} className="result">
                  <div>
                    <div style={{ fontSize: 13, textTransform: "capitalize" }}>{result.platform}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 4 }}>{result.ok ? "Delivered" : result.error || "Failed"}</div>
                  </div>
                  <div className={result.ok ? "ok" : "bad"}>{result.ok ? "OK" : "ERR"}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="label">Preview</div>
          <div className="preview">{shareText}\n\n{contentTitle}</div>
          <div style={{ marginTop: 18 }}>
            <div className="label">Moat Note</div>
            <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 1.8 }}>
              This surface is designed to become a multi-network publishing hub: social share now, then scheduled posting, optimization, and performance feedback loops.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
