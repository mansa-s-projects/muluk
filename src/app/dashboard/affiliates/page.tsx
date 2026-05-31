"use client";

import { useEffect, useState, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Program = {
  id: string;
  brand_name: string;
  niches: string[];
  commission_rate: string;
  commission_type: string;
  program_url: string;
  description: string | null;
  avg_order_value_usd: number;
  cookie_duration_days: number;
  payout_threshold_usd: number;
  tier: string;
  network: string | null;
  epc_usd: number | null;
  avg_conversion_rate: number | null;
  trending_score: number;
  demand_level: string;
  tags: string[];
  requires_approval: boolean;
  monthly_revenue_potential_usd: Record<string, number | null>;
  // AI match fields
  match_score?: number;
  estimated_monthly_revenue_usd?: number;
  match_reasons?: string[];
  revenue_range?: { low: number; high: number };
  confidence?: string;
};

type TrendingProduct = {
  id: string;
  source: string;
  title: string;
  price_usd: number | null;
  image_url: string | null;
  product_url: string;
  affiliate_url: string | null;
  brand_name: string | null;
  commission_rate: string | null;
  trending_score: number;
  sales_velocity: string;
  tags: string[];
  niches: string[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const NICHES = ["all","fashion","beauty","fitness","tech","gaming","crypto","finance","education","travel","food","music","art","health","lifestyle","luxury","business","sports"];
const TABS = ["matched","trending","catalog","my-links"] as const;
type Tab = typeof TABS[number];

const TIER_COLOR: Record<string, string>    = { exclusive: "#a078e0", premium: "#c8a96e", standard: "rgba(255,255,255,0.35)" };
const DEMAND_COLOR: Record<string, string>  = { viral: "#50d48a", high: "#c8a96e", medium: "rgba(255,255,255,0.4)", low: "rgba(255,255,255,0.2)" };
const SOURCE_LABEL: Record<string, string>  = { instagram: "Instagram", tiktok: "TikTok", amazon: "Amazon" };
const VELOCITY_COLOR: Record<string, string> = { viral: "#50d48a", rising: "#c8a96e", steady: "rgba(255,255,255,0.4)", falling: "#e05555" };
const _PLATFORM_EMOJI: Record<string, string> = { instagram: "IG", tiktok: "TT", amazon: "AMZ", tiktok_shop: "TT" };

function fmtMoney(n: number | null | undefined): string {
  if (!n && n !== 0) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function _scoreBar(score: number): string {
  const color = score >= 80 ? "#50d48a" : score >= 60 ? "#c8a96e" : "rgba(255,255,255,0.25)";
  return `<div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;margin-top:4px"><div style="height:100%;width:${score}%;background:${color};border-radius:2px;transition:width 1s ease"></div></div>`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AffiliatesPage() {
  const [tab, setTab]               = useState<Tab>("matched");
  const [niche, setNiche]           = useState("all");
  const [search, setSearch]         = useState("");
  const [programs, setPrograms]     = useState<Program[]>([]);
  const [trending, setTrending]     = useState<TrendingProduct[]>([]);
  const [loadingP, setLoadingP]     = useState(true);
  const [loadingT, setLoadingT]     = useState(false);
  const [totalRevPotential, setTotalRevPotential] = useState(0);
  const [sortBy, setSortBy]         = useState<"match"|"revenue"|"trending"|"commission">("match");

  // Load matched programs (AI-ranked)
  useEffect(() => {
    fetch("/api/affiliates/match")
      .then(r => r.ok ? r.json() as Promise<{ programs: Program[] }> : Promise.resolve({ programs: [] }))
      .then(d => {
        setPrograms(d.programs ?? []);
        const total = (d.programs ?? []).reduce((s, p) => s + (p.estimated_monthly_revenue_usd ?? 0), 0);
        setTotalRevPotential(total);
        setLoadingP(false);
      })
      .catch(() => setLoadingP(false));
  }, []);

  // Load trending products when tab changes
  useEffect(() => {
    if (tab !== "trending") return;
    const url = niche === "all" ? "/api/affiliates/trending" : `/api/affiliates/trending?niche=${niche}`;
    fetch(url)
      .then(r => r.ok ? r.json() as Promise<{ products: TrendingProduct[] }> : Promise.resolve({ products: [] }))
      .then(d => { setTrending(d.products ?? []); setLoadingT(false); })
      .catch(() => setLoadingT(false));
  }, [tab, niche]);

  const filteredPrograms = useMemo(() => {
    let list = programs;
    if (niche !== "all") list = list.filter(p => p.niches.includes(niche));
    if (search) list = list.filter(p => p.brand_name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) => {
      if (sortBy === "match")     return (b.match_score ?? 0) - (a.match_score ?? 0);
      if (sortBy === "revenue")   return (b.estimated_monthly_revenue_usd ?? 0) - (a.estimated_monthly_revenue_usd ?? 0);
      if (sortBy === "trending")  return (b.trending_score ?? 0) - (a.trending_score ?? 0);
      if (sortBy === "commission") return (b.epc_usd ?? 0) - (a.epc_usd ?? 0);
      return 0;
    });
  }, [programs, niche, search, sortBy]);

  const viralPrograms = programs.filter(p => p.demand_level === "viral" || p.trending_score >= 88).slice(0, 6);

  return (
    <div className="aff-root">
      <style>{`
        *{box-sizing:border-box}
        .aff-root{min-height:100vh;background:#020203;padding:40px;font-family:var(--font-body,'Outfit',sans-serif);color:rgba(255,255,255,0.88);position:relative}
        .aff-root::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.038'/%3E%3C/svg%3E");pointer-events:none;z-index:0}
        .z1{position:relative;z-index:1}
        .eyebrow{font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7a6030;display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .eyebrow::before{content:'';width:20px;height:1px;background:#7a6030}
        .page-title{font-family:var(--font-display,'Cormorant Garamond',serif);font-size:clamp(28px,3.5vw,52px);font-weight:300;letter-spacing:-0.02em;margin:0}
        .page-sub{color:rgba(255,255,255,0.35);font-size:13px;margin-top:5px;font-weight:300}
        .header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:32px}
        .rev-badge{background:rgba(200,169,110,0.08);border:1px solid rgba(200,169,110,0.2);border-radius:8px;padding:14px 20px;text-align:right}
        .rev-val{font-family:var(--font-mono,'DM Mono',monospace);font-size:28px;font-weight:500;color:#c8a96e;letter-spacing:-0.03em}
        .rev-lbl{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.25);margin-top:3px}
        .tabs{display:flex;gap:2px;margin-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .tab{font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;padding:11px 18px;border:none;background:transparent;color:rgba(255,255,255,0.3);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s;white-space:nowrap}
        .tab:hover{color:rgba(255,255,255,0.6)} .tab.active{color:#c8a96e;border-bottom-color:#c8a96e}
        .controls{display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap;align-items:center}
        .search-input{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.09);border-radius:3px;color:rgba(255,255,255,0.8);font-family:var(--font-body,'Outfit',sans-serif);font-size:13px;font-weight:300;padding:9px 14px;outline:none;width:220px;transition:border-color 0.2s}
        .search-input:focus{border-color:rgba(200,169,110,0.4)} .search-input::placeholder{color:rgba(255,255,255,0.2)}
        .niche-btn{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.15em;text-transform:uppercase;padding:6px 12px;border-radius:100px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:rgba(255,255,255,0.3);cursor:pointer;transition:all 0.2s;white-space:nowrap}
        .niche-btn:hover{color:rgba(255,255,255,0.6)} .niche-btn.active{color:#c8a96e;background:rgba(200,169,110,0.07);border-color:rgba(200,169,110,0.25)}
        .sort-select{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.12em;text-transform:uppercase;padding:6px 12px;border-radius:3px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.5);cursor:pointer;outline:none}
        .count-tag{font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;color:rgba(255,255,255,0.2);letter-spacing:0.1em;margin-left:auto}
        /* Viral strip */
        .viral-strip{margin-bottom:28px}
        .strip-label{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#50d48a;margin-bottom:12px;display:flex;align-items:center;gap:8px}
        .strip-label::before{content:'';width:6px;height:6px;border-radius:50%;background:#50d48a;animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .viral-row{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
        .viral-row::-webkit-scrollbar{display:none}
        .viral-chip{background:#0f0f1e;border:1px solid rgba(80,212,138,0.15);border-radius:8px;padding:14px 16px;min-width:180px;flex-shrink:0;cursor:pointer;transition:border-color 0.2s,transform 0.2s;text-decoration:none;display:block}
        .viral-chip:hover{border-color:rgba(80,212,138,0.35);transform:translateY(-2px)}
        .vc-name{font-size:13px;font-weight:500;color:rgba(255,255,255,0.85);margin-bottom:4px}
        .vc-rate{font-family:var(--font-mono,'DM Mono',monospace);font-size:12px;color:#c8a96e}
        .vc-badge{font-family:var(--font-mono,'DM Mono',monospace);font-size:8px;letter-spacing:0.15em;text-transform:uppercase;color:#50d48a;margin-top:6px}
        /* Program grid */
        .prog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
        @media(max-width:700px){.prog-grid{grid-template-columns:1fr}}
        .prog-card{background:#0f0f1e;border:1px solid rgba(255,255,255,0.055);border-radius:10px;padding:22px;display:flex;flex-direction:column;gap:14px;transition:border-color 0.2s,transform 0.2s;position:relative;overflow:hidden}
        .prog-card:hover{border-color:rgba(255,255,255,0.1);transform:translateY(-1px)}
        .prog-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--card-color,#c8a96e),transparent);opacity:0;transition:opacity 0.3s}
        .prog-card:hover::before{opacity:0.5}
        .prog-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
        .prog-name{font-family:var(--font-display,'Cormorant Garamond',serif);font-size:22px;font-weight:300;color:rgba(255,255,255,0.9)}
        .prog-desc{font-size:12px;color:rgba(255,255,255,0.35);font-weight:300;line-height:1.6}
        .prog-commission{font-family:var(--font-mono,'DM Mono',monospace);font-size:26px;font-weight:500;color:#c8a96e;letter-spacing:-0.02em}
        .prog-commission-type{font-family:var(--font-mono,'DM Mono',monospace);font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.22);margin-top:2px}
        .meta-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .meta-val{font-family:var(--font-mono,'DM Mono',monospace);font-size:12px;color:rgba(255,255,255,0.65)}
        .meta-lbl{font-family:var(--font-mono,'DM Mono',monospace);font-size:8px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.2);margin-top:2px}
        .match-row{display:flex;align-items:center;justify-content:space-between}
        .match-score{font-family:var(--font-mono,'DM Mono',monospace);font-size:11px;letter-spacing:0.1em}
        .match-bar{flex:1;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;margin:0 10px;overflow:hidden}
        .match-fill{height:100%;border-radius:2px;transition:width 1s ease}
        .est-rev{font-family:var(--font-mono,'DM Mono',monospace);font-size:13px;color:#50d48a;font-weight:500}
        .match-reasons{display:flex;flex-direction:column;gap:4px}
        .reason{font-size:11px;color:rgba(255,255,255,0.35);font-weight:300;line-height:1.5}
        .reason::before{content:'✓ ';color:rgba(200,169,110,0.6)}
        .tag-row{display:flex;flex-wrap:wrap;gap:4px}
        .tag{font-family:var(--font-mono,'DM Mono',monospace);font-size:7px;letter-spacing:0.15em;text-transform:uppercase;padding:2px 7px;border-radius:100px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.3)}
        .tag.trending{color:#c8a96e;background:rgba(200,169,110,0.06);border-color:rgba(200,169,110,0.15)}
        .tag.viral{color:#50d48a;background:rgba(80,212,138,0.06);border-color:rgba(80,212,138,0.15)}
        .cta-btn{display:block;text-align:center;font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;background:#c8a96e;color:#0a0800;border-radius:3px;padding:11px;text-decoration:none;transition:opacity 0.2s;margin-top:auto}
        .cta-btn:hover{opacity:0.85}
        .ghost-btn{display:block;text-align:center;font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;background:transparent;color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:3px;padding:10px;text-decoration:none;transition:all 0.2s;margin-top:auto}
        .ghost-btn:hover{color:rgba(255,255,255,0.7);border-color:rgba(255,255,255,0.2)}
        /* Trending products */
        .trend-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
        .trend-card{background:#0f0f1e;border:1px solid rgba(255,255,255,0.055);border-radius:8px;padding:18px;display:flex;flex-direction:column;gap:12px;transition:border-color 0.2s,transform 0.2s}
        .trend-card:hover{border-color:rgba(255,255,255,0.1);transform:translateY(-1px)}
        .trend-src{font-family:var(--font-mono,'DM Mono',monospace);font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.3)}
        .trend-title{font-size:13px;color:rgba(255,255,255,0.78);font-weight:400;line-height:1.5}
        .trend-price{font-family:var(--font-mono,'DM Mono',monospace);font-size:18px;font-weight:500;color:#c8a96e;letter-spacing:-0.02em}
        .velocity-badge{display:inline-flex;align-items:center;gap:4px;font-family:var(--font-mono,'DM Mono',monospace);font-size:8px;letter-spacing:0.15em;text-transform:uppercase;padding:2px 8px;border-radius:100px;border:1px solid}
        .skel{background:linear-gradient(90deg,#111122 25%,#1a1a30 50%,#111122 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:4px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        /* Tier badge */
        .tier-badge{font-family:var(--font-mono,'DM Mono',monospace);font-size:7px;letter-spacing:0.2em;text-transform:uppercase;padding:3px 8px;border-radius:100px;border:1px solid;white-space:nowrap;flex-shrink:0}
        .divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent);margin:4px 0}
      `}</style>

      <div className="z1">
        {/* Header */}
        <div className="header">
          <div>
            <div className="eyebrow">Brand Intelligence</div>
            <h1 className="page-title">Affiliate Empire</h1>
            <p className="page-sub">100+ programs. AI-matched to your audience. Live trending products.</p>
          </div>
          {totalRevPotential > 0 && (
            <div className="rev-badge">
              <div className="rev-val">{fmtMoney(totalRevPotential)}</div>
              <div className="rev-lbl">Est. monthly revenue potential</div>
            </div>
          )}
        </div>

        {/* Viral strip */}
        {viralPrograms.length > 0 && tab === "matched" && (
          <div className="viral-strip">
            <div className="strip-label">Trending right now</div>
            <div className="viral-row">
              {viralPrograms.map(p => (
                <a key={p.id} href={p.program_url} target="_blank" rel="noopener noreferrer" className="viral-chip">
                  <div className="vc-name">{p.brand_name}</div>
                  <div className="vc-rate">{p.commission_rate}</div>
                  <div className="vc-badge">🔥 {p.demand_level}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "matched" ? "AI Matched" : t === "my-links" ? "My Links" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="controls">
          {(tab === "matched" || tab === "catalog") && (
            <input className="search-input" placeholder="Search brands..." value={search} onChange={e => setSearch(e.target.value)} />
          )}
          {NICHES.slice(0, 10).map(n => (
            <button key={n} className={`niche-btn ${niche === n ? "active" : ""}`} onClick={() => setNiche(n)}>{n}</button>
          ))}
          {tab === "matched" && (
            <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
              <option value="match">Sort: Match Score</option>
              <option value="revenue">Sort: Revenue</option>
              <option value="trending">Sort: Trending</option>
              <option value="commission">Sort: EPC</option>
            </select>
          )}
          <span className="count-tag">{filteredPrograms.length} programs</span>
        </div>

        {/* AI Matched Tab */}
        {tab === "matched" && (
          <div className="prog-grid">
            {loadingP
              ? Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} style={{ background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.055)", borderRadius: 10, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="skel" style={{ height: 26, width: "60%" }} />
                    <div className="skel" style={{ height: 14, width: "90%" }} />
                    <div className="skel" style={{ height: 32, width: "45%" }} />
                    <div className="skel" style={{ height: 40 }} />
                  </div>
                ))
              : filteredPrograms.map(p => {
                  const matchColor = (p.match_score ?? 0) >= 80 ? "#50d48a" : (p.match_score ?? 0) >= 60 ? "#c8a96e" : "rgba(255,255,255,0.25)";
                  const tierCol = TIER_COLOR[p.tier] ?? "rgba(255,255,255,0.3)";
                  return (
                    <div key={p.id} className="prog-card" style={{ "--card-color": tierCol } as React.CSSProperties}>
                      <div className="prog-top">
                        <div className="prog-name">{p.brand_name}</div>
                        <span className="tier-badge" style={{ color: tierCol, borderColor: `${tierCol}40` }}>{p.tier}</span>
                      </div>

                      {p.description && <div className="prog-desc">{p.description}</div>}

                      <div>
                        <div className="prog-commission">{p.commission_rate}</div>
                        <div className="prog-commission-type">{p.commission_type}</div>
                      </div>

                      {/* Match score */}
                      {p.match_score !== undefined && (
                        <div>
                          <div className="match-row">
                            <span style={{ fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Match</span>
                            <div className="match-bar"><div className="match-fill" style={{ width: `${p.match_score}%`, background: matchColor }} /></div>
                            <span className="match-score" style={{ color: matchColor }}>{p.match_score}</span>
                          </div>
                          {(p.estimated_monthly_revenue_usd ?? 0) > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                              <span className="est-rev">{fmtMoney(p.estimated_monthly_revenue_usd)}/mo</span>
                              {p.revenue_range && <span style={{ fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: 9, color: "rgba(255,255,255,0.2)" }}>est. range {fmtMoney(p.revenue_range.low)}–{fmtMoney(p.revenue_range.high)}</span>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Match reasons */}
                      {p.match_reasons && p.match_reasons.length > 0 && (
                        <div className="match-reasons">
                          {p.match_reasons.map((r, i) => <div key={i} className="reason">{r}</div>)}
                        </div>
                      )}

                      <div className="divider" />

                      <div className="meta-row">
                        <div><div className="meta-val">{p.cookie_duration_days}d</div><div className="meta-lbl">Cookie</div></div>
                        <div><div className="meta-val">{p.epc_usd ? `$${p.epc_usd}` : "—"}</div><div className="meta-lbl">EPC</div></div>
                        <div><div className="meta-val">{p.avg_conversion_rate ? `${p.avg_conversion_rate}%` : "—"}</div><div className="meta-lbl">CVR</div></div>
                      </div>

                      <div className="tag-row">
                        {p.tags?.slice(0, 4).map(t => (
                          <span key={t} className={`tag ${t.includes("viral") || t.includes("trending") ? t.includes("viral") ? "viral" : "trending" : ""}`}>{t}</span>
                        ))}
                        {p.demand_level === "viral" && <span className="tag viral">🔥 viral</span>}
                      </div>

                      <a href={p.program_url} target="_blank" rel="noopener noreferrer" className={p.requires_approval ? "ghost-btn" : "cta-btn"}>
                        {p.requires_approval ? "Apply for Program →" : "Join Program →"}
                      </a>
                    </div>
                  );
                })
            }
          </div>
        )}

        {/* Trending Products Tab */}
        {tab === "trending" && (
          <div>
            <div style={{ marginBottom: 20, display: "flex", gap: 10, alignItems: "center" }}>
              {["all","instagram","tiktok","amazon"].map(src => (
                <button key={src} style={{ fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", padding: "6px 12px", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                  {src === "all" ? "All Sources" : SOURCE_LABEL[src] ?? src}
                </button>
              ))}
            </div>
            <div className="trend-grid">
              {loadingT
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{ background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.055)", borderRadius: 8, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div className="skel" style={{ height: 12, width: "40%" }} />
                      <div className="skel" style={{ height: 18, width: "85%" }} />
                      <div className="skel" style={{ height: 24, width: "35%" }} />
                    </div>
                  ))
                : trending.length === 0
                  ? (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
                      Connect your Instagram or TikTok to see live trending products.<br />
                      <a href="/dashboard/integrations" style={{ color: "#c8a96e", textDecoration: "none", fontSize: 12, display: "inline-block", marginTop: 12 }}>Connect platforms →</a>
                    </div>
                  )
                  : trending.map(p => (
                      <div key={p.id} className="trend-card">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div className="trend-src">{SOURCE_LABEL[p.source] ?? p.source}</div>
                          <span className="velocity-badge" style={{ color: VELOCITY_COLOR[p.sales_velocity] ?? "rgba(255,255,255,0.4)", borderColor: `${VELOCITY_COLOR[p.sales_velocity] ?? "rgba(255,255,255,0.2)"}40` }}>
                            {p.sales_velocity}
                          </span>
                        </div>
                        <div className="trend-title">{p.title}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {p.price_usd && <div className="trend-price">${p.price_usd}</div>}
                          {p.commission_rate && <div style={{ fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: 11, color: "#c8a96e" }}>{p.commission_rate} comm.</div>}
                        </div>
                        <div className="tag-row">
                          {p.tags.slice(0, 3).map(t => <span key={t} className={`tag ${t.includes("viral") || t.includes("trending") ? "viral" : ""}`}>{t}</span>)}
                        </div>
                        <a href={p.affiliate_url ?? p.product_url} target="_blank" rel="noopener noreferrer" className="cta-btn">
                          Get Affiliate Link →
                        </a>
                      </div>
                    ))
              }
            </div>
          </div>
        )}

        {/* Catalog Tab — all programs unfiltered */}
        {tab === "catalog" && (
          <div className="prog-grid">
            {loadingP
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel" style={{ height: 200, borderRadius: 10 }} />)
              : filteredPrograms.map(p => (
                  <div key={p.id} className="prog-card">
                    <div className="prog-top">
                      <div className="prog-name">{p.brand_name}</div>
                      <span className="tier-badge" style={{ color: TIER_COLOR[p.tier] ?? "rgba(255,255,255,0.3)", borderColor: `${TIER_COLOR[p.tier] ?? "rgba(255,255,255,0.08)"}40` }}>{p.tier}</span>
                    </div>
                    {p.description && <div className="prog-desc">{p.description}</div>}
                    <div><div className="prog-commission">{p.commission_rate}</div><div className="prog-commission-type">{p.commission_type}</div></div>
                    <div className="meta-row">
                      <div><div className="meta-val">{p.cookie_duration_days}d</div><div className="meta-lbl">Cookie</div></div>
                      <div><div className="meta-val">${p.payout_threshold_usd}</div><div className="meta-lbl">Min Pay</div></div>
                      <div><div className="meta-val" style={{ color: DEMAND_COLOR[p.demand_level] ?? "rgba(255,255,255,0.4)" }}>{p.demand_level}</div><div className="meta-lbl">Demand</div></div>
                    </div>
                    <div className="tag-row">{p.tags?.slice(0, 4).map(t => <span key={t} className="tag">{t}</span>)}</div>
                    <a href={p.program_url} target="_blank" rel="noopener noreferrer" className={p.requires_approval ? "ghost-btn" : "cta-btn"}>
                      {p.requires_approval ? "Apply →" : "Join →"}
                    </a>
                  </div>
                ))
            }
          </div>
        )}

        {/* My Links Tab */}
        {tab === "my-links" && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
            <div style={{ fontFamily: "var(--font-display,'Cormorant Garamond',serif)", fontSize: 28, fontWeight: 300, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
              Your affiliate links
            </div>
            Link tracking dashboard coming soon.<br />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>Click tracking, conversion attribution, and revenue splits will appear here.</span>
          </div>
        )}
      </div>
    </div>
  );
}
