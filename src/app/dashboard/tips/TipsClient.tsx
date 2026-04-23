"use client";

import {
  useState, useRef, useCallback, useEffect,
  type DragEvent, type ChangeEvent,
} from "react";
import type { Tip } from "@/lib/tips";
import { formatTip } from "@/lib/tips";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedAsset {
  name: string; mimeType: string; size: number;
  preview: string | null; url: string; category: FileCategory;
}
interface GeneratedLink {
  id: string; url: string; slug: string;
  title: string; price: number; currency: string; whop_url: string | null;
}
type FileCategory = "image" | "pdf" | "video" | "audio" | "zip" | "doc" | "other";
type Currency = "USD" | "EUR" | "GBP";
type PriceMode = "fixed" | "tip";
type FeedTab = "wall" | "all";
interface Props {
  initialTips: Tip[];
  monthlyEarnings: { month: number; total_cents: number; tip_count: number }[];
  handle: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const SITE = typeof window !== "undefined" ? window.location.origin : "";

function getCat(mime: string): FileCategory {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.includes("zip")) return "zip";
  if (mime.includes("word") || mime.startsWith("text/")) return "doc";
  return "other";
}
function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}
function fmtMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
}
function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

const CAT_COLOR: Record<FileCategory, string> = {
  image:"#818cf8", pdf:"#f87171", video:"#fb923c",
  audio:"#a78bfa", zip:"#fbbf24", doc:"#34d399", other:"#94a3b8",
};
const CAT_LABEL: Record<FileCategory, string> = {
  image:"IMAGE", pdf:"PDF", video:"VIDEO",
  audio:"AUDIO", zip:"ZIP", doc:"DOC", other:"FILE",
};

// ─── Tokens ───────────────────────────────────────────────────────────────────

const G      = "#c8a96e";
const G2     = "rgba(200,169,110,0.7)";
const GB     = "rgba(200,169,110,0.08)";
const GB2    = "rgba(200,169,110,0.15)";
const GB3    = "rgba(200,169,110,0.26)";
const GLine  = "rgba(200,169,110,0.28)";
const GLine2 = "rgba(200,169,110,0.5)";
const CARD   = "rgba(255,255,255,0.03)";
const CARD2  = "rgba(255,255,255,0.055)";
const CARD3  = "rgba(255,255,255,0.09)";
const BDR    = "rgba(255,255,255,0.07)";
const BDR2   = "rgba(255,255,255,0.12)";
const W      = "rgba(255,255,255,0.95)";
const SUB    = "rgba(255,255,255,0.55)";
const MUT    = "rgba(255,255,255,0.35)";
const DIM    = "rgba(255,255,255,0.2)";
const MONO   = `'DM Mono','Courier New',monospace`;
const BODY   = `'Outfit','Inter',sans-serif`;
const DISP   = `'Cormorant Garamond',Georgia,serif`;

const CSS = `
@keyframes spin      { to { transform:rotate(360deg); } }
@keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.35} }
@keyframes ring      { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.4);opacity:0} }
@keyframes shimmer   { 0%{background-position:-200% center} 100%{background-position:200% center} }
@keyframes slideUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes confetti  { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
@keyframes floatIn   { from{opacity:0;transform:scale(.94) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
@keyframes borderGlow{ 0%,100%{opacity:.5} 50%{opacity:1} }
input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);outline:none}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:${G};cursor:pointer;box-shadow:0 0 10px rgba(200,169,110,.5)}
input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:${G};cursor:pointer;border:none}
input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
`;

// ─── useCountUp ───────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1300): number {
  const [v, setV] = useState(target);
  useEffect(() => {
    if (target === 0) {
      // Animate to zero from current value via the rAF loop below.
    }
    let t0: number | null = null;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return v;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TipsClient({ initialTips, monthlyEarnings, handle }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging]     = useState(false);
  const [asset, setAsset]           = useState<UploadedAsset | null>(null);
  const [uploadPct, setUploadPct]   = useState(0);
  const [uploading, setUploading]   = useState(false);
  const [uploadErr, setUploadErr]   = useState<string | null>(null);
  const [title, setTitle]           = useState("");
  const [price, setPrice]           = useState("");
  const [currency, setCurrency]     = useState<Currency>("USD");
  const [mode, setMode]             = useState<PriceMode>("fixed");
  const [lockToFile, setLockToFile] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genErr, setGenErr]         = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [copied, setCopied]         = useState(false);
  const [confetti, setConfetti]     = useState(false);
  const [tab, setTab]               = useState<FeedTab>("wall");

  const paidTips    = initialTips.filter(t => t.status === "paid");
  const totalEarned = paidTips.reduce((s, t) => s + t.amount_cents, 0);
  const curMonth    = new Date().getMonth() + 1;
  const maxMonth    = Math.max(...monthlyEarnings.map(m => m.total_cents), 1);
  const tipLink     = handle ? `${SITE}/tips/${handle}` : null;
  const avgTipCents = paidTips.length ? Math.round(totalEarned / paidTips.length) : 2500;

  const processFile = useCallback(async (file: File) => {
    setUploadErr(null); setUploading(true); setUploadPct(0);
    const cat = getCat(file.type);
    let preview: string | null = null;
    if (cat === "image") {
      preview = await new Promise<string>(res => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result as string);
        fr.readAsDataURL(file);
      });
    }
    const tick = setInterval(() => setUploadPct(p => Math.min(p + 7, 88)), 140);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "unlockable");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      clearInterval(tick);
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Upload failed");
      }
      const j = await res.json() as { url?: string; path?: string };
      setUploadPct(100);
      setTimeout(() => {
        setAsset({ name: file.name, mimeType: file.type, size: file.size, preview, url: j.url ?? j.path ?? "", category: cat });
        setUploading(false);
      }, 400);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      clearInterval(tick);
      setUploadErr(e instanceof Error ? e.message : "Upload failed");
      setUploading(false); setUploadPct(0);
    }
  }, [title]);

  const onDrop       = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }, [processFile]);
  const onFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); }, [processFile]);

  async function generateLink() {
    const pc = Math.round(parseFloat(price) * 100);
    if (!title.trim()) { setGenErr("Add a title for your link"); return; }
    if (isNaN(pc) || pc < 50) { setGenErr("Minimum price is $0.50"); return; }
    setGenErr(null); setGenerating(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(), price: pc, currency,
        content_type: asset && lockToFile ? "file" : "text",
        content_value: asset && lockToFile ? undefined : "Thank you for your support! ❤️",
        file_url: asset && lockToFile ? asset.url : undefined,
        description: mode === "tip" ? "Support my work — unlock exclusive content" : undefined,
      };
      const res = await fetch("/api/payment-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json() as { id?: string; slug?: string; whop_checkout_url?: string; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to create link");
      const slug = j.slug ?? j.id ?? "";
      setGeneratedLink({ id: j.id ?? slug, slug, url: `${SITE}/pay/${slug}`, title: title.trim(), price: pc, currency, whop_url: j.whop_checkout_url ?? null });
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3200);
    } catch (e) {
      setGenErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(false);
    }
  }

  function copyLink() {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink.whop_url ?? generatedLink.url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2200);
    });
  }

  const scrollToMint = () => document.getElementById("mint-studio")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#060612 0%,#08080f 50%,#09070e 100%)", fontFamily: BODY, position: "relative" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {confetti && <ConfettiLayer />}

      {/* ambient */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-300px", left: "15%",  width: "800px", height: "800px", borderRadius: "50%", background: "radial-gradient(circle,rgba(200,169,110,.04) 0%,transparent 70%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", top: "30%",   right: "-200px", width: "700px", height: "700px", borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.03) 0%,transparent 70%)",  filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: "-100px", left: "5%",  width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle,rgba(200,169,110,.025) 0%,transparent 70%)", filter: "blur(60px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1340, margin: "0 auto", padding: "0 24px 100px" }}>
        <HeroSection handle={handle} tipLink={tipLink} totalEarned={totalEarned} tipsCount={paidTips.length}
          recentTips={paidTips.slice(0,3)} onGenerate={scrollToMint} onUpload={() => fileRef.current?.click()} />

        <StatsStrip tips={paidTips} monthlyEarnings={monthlyEarnings} curMonth={curMonth} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, marginTop: 24, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <VaultCard dragging={dragging} uploading={uploading} uploadPct={uploadPct} uploadErr={uploadErr}
              asset={asset} fileRef={fileRef}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)} onDrop={onDrop} onFileChange={onFileChange}
              onBrowse={() => fileRef.current?.click()}
              onRemove={() => { setAsset(null); setUploadPct(0); }} onGenerate={scrollToMint} />
            <MintStudio id="mint-studio" title={title} setTitle={setTitle} price={price} setPrice={setPrice}
              currency={currency} setCurrency={setCurrency} mode={mode} setMode={setMode}
              lockToFile={lockToFile} setLockToFile={setLockToFile} hasAsset={!!asset}
              generating={generating} error={genErr} onGenerate={generateLink} />
            {generatedLink && (
              <LiveLinkCard link={generatedLink} copied={copied} onCopy={copyLink}
                onReset={() => { setGeneratedLink(null); setTitle(""); setPrice(""); setAsset(null); }} />
            )}
            <RevenueFeed tips={initialTips} monthlyEarnings={monthlyEarnings} handle={handle}
              maxMonth={maxMonth} curMonth={curMonth} tab={tab} setTab={setTab} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <RevenueSim avgTipCents={avgTipCents} onGenerate={scrollToMint} />
            <FanPreviewCard handle={handle} />
            <PlaybookCard onGenerate={scrollToMint} />
          </div>
        </div>
      </div>

      <FloatingFAB onGenerate={scrollToMint} />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ handle, tipLink, totalEarned, tipsCount, recentTips, onGenerate, onUpload }: {
  handle: string; tipLink: string | null; totalEarned: number; tipsCount: number;
  recentTips: Tip[]; onGenerate: () => void; onUpload: () => void;
}) {
  const [linkCopied, setLinkCopied] = useState(false);

  function copyTipLink() {
    if (!tipLink) return;
    navigator.clipboard.writeText(tipLink).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); });
  }

  return (
    <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", marginTop: 28,
      background: "linear-gradient(135deg,rgba(200,169,110,.09) 0%,rgba(99,102,241,.05) 50%,rgba(200,169,110,.05) 100%)",
      border: `1px solid ${GLine}` }}>
      {/* animated top line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,transparent 0%,${G} 40%,rgba(200,169,110,.4) 60%,transparent 100%)`,
        animation: "borderGlow 3s ease-in-out infinite" }} />
      {/* corner glow */}
      <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%",
        background: `radial-gradient(circle,rgba(200,169,110,.1),transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ padding: "48px 52px 44px", display: "grid", gridTemplateColumns: "1fr auto", gap: 48, alignItems: "center" }}>
        {/* Left */}
        <div style={{ maxWidth: 560 }}>
          {/* Eyebrow */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GB2, border: `1px solid ${GLine}`,
            borderRadius: 100, padding: "5px 16px", marginBottom: 22 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: G, display: "inline-block",
              boxShadow: `0 0 10px ${G}`, animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontFamily: MONO, fontSize: 11, color: G, letterSpacing: "0.1em" }}>MONETIZE · MULUK CREATOR</span>
          </div>

          <h1 style={{ fontFamily: DISP, fontSize: "clamp(2.2rem,4vw,3.5rem)", fontWeight: 400, color: W,
            lineHeight: 1.08, margin: "0 0 16px", letterSpacing: "-0.015em" }}>
            Your audience is ready<br />
            <span style={{ background: `linear-gradient(90deg,${G},rgba(200,169,110,.7))`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>to pay you.</span>
          </h1>

          <p style={{ color: SUB, fontSize: 15, lineHeight: 1.7, margin: "0 0 8px", maxWidth: 460 }}>
            Upload a file, set a price, and accept Apple Pay, cards, and crypto — all in under 60 seconds.
            No code. No waiting.
          </p>

          {/* Trust strip */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", margin: "18px 0 28px" }}>
            {[
              { icon: "⚡", text: "88% payout rate" },
              { icon: "◎", text: "Apple Pay ready" },
              { icon: "◈", text: "190 countries" },
              { icon: "▲", text: "Instant delivery" },
            ].map(t => (
              <div key={t.text} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: G, fontSize: 11 }}>{t.icon}</span>
                <span style={{ color: MUT, fontSize: 12, fontFamily: MONO, letterSpacing: "0.04em" }}>{t.text}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
            <button onClick={onGenerate} style={{ display: "flex", alignItems: "center", gap: 9,
              background: G, border: "none", borderRadius: 12, padding: "14px 28px",
              color: "#080608", fontFamily: BODY, fontWeight: 700, fontSize: 14, cursor: "pointer",
              letterSpacing: "0.02em", boxShadow: `0 6px 28px rgba(200,169,110,.4)`, transition: "all .18s" }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.transform = "translateY(-2px)"; b.style.boxShadow = `0 12px 36px rgba(200,169,110,.52)`; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.transform = "none"; b.style.boxShadow = `0 6px 28px rgba(200,169,110,.4)`; }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1l1.5 4.5H13l-3.7 2.7 1.4 4.3-3.7-2.7-3.7 2.7 1.4-4.3L1 5.5h4L7.5 1z" fill="currentColor"/></svg>
              Generate Link
            </button>
            <button onClick={onUpload} style={{ display: "flex", alignItems: "center", gap: 8,
              background: CARD2, border: `1px solid ${BDR2}`, borderRadius: 12, padding: "13px 24px",
              color: W, fontFamily: BODY, fontWeight: 500, fontSize: 14, cursor: "pointer", transition: "all .18s" }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = GLine; b.style.color = G; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = BDR2; b.style.color = W; }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2v9M3.5 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1.5 12.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Upload File
            </button>
          </div>

          {/* Tip link pill */}
          {tipLink && (
            <div style={{ display: "flex", alignItems: "center", gap: 0, background: "rgba(255,255,255,.03)",
              border: `1px solid ${BDR}`, borderRadius: 10, overflow: "hidden", maxWidth: 420 }}>
              <div style={{ flex: 1, padding: "10px 14px", fontFamily: MONO, fontSize: 12, color: G2,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tipLink}
              </div>
              <button onClick={copyTipLink} style={{ padding: "10px 16px", background: linkCopied ? "rgba(74,222,128,.15)" : GB2,
                border: "none", borderLeft: `1px solid ${BDR}`, color: linkCopied ? "#4ade80" : G,
                fontFamily: MONO, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", transition: "all .18s",
                letterSpacing: "0.06em" }}>
                {linkCopied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>

        {/* Right — stats widget */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 220 }}>
          {/* Total earned */}
          <div style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${GLine}`, borderRadius: 16, padding: "20px 22px", animation: "floatIn .6s ease both" }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: MUT, letterSpacing: "0.12em", marginBottom: 8 }}>TOTAL EARNED</div>
            <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 600, color: G, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {formatTip(totalEarned)}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: DIM, marginTop: 6 }}>all time · @{handle}</div>
          </div>

          {/* Mini stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "TIPS", value: String(tipsCount), color: "#818cf8" },
              { label: "LINK", value: "LIVE", color: "#4ade80" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,.025)", border: `1px solid ${BDR}`,
                borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: MUT, letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 18, color: s.color, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  {s.label === "LINK" && (
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80",
                      display: "inline-block", animation: "pulse 2s infinite", flexShrink: 0 }} />
                  )}
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          {recentTips.length > 0 && (
            <div style={{ background: "rgba(255,255,255,.025)", border: `1px solid ${BDR}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: MUT, letterSpacing: "0.1em", marginBottom: 10 }}>RECENT TIPS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentTips.map(t => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: SUB, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                      {t.is_anonymous ? "Anonymous" : (t.display_name ?? "Fan")}
                    </span>
                    <span style={{ color: G, fontFamily: MONO, fontSize: 12, fontWeight: 600 }}>{formatTip(t.amount_cents)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stats strip ──────────────────────────────────────────────────────────────

function StatsStrip({ tips, monthlyEarnings, curMonth }: {
  tips: Tip[]; monthlyEarnings: { month: number; total_cents: number; tip_count: number }[]; curMonth: number;
}) {
  const total      = tips.reduce((s, t) => s + t.amount_cents, 0);
  const thisMonth  = monthlyEarnings.find(m => m.month === curMonth)?.total_cents ?? 0;
  const lastMonth  = monthlyEarnings.find(m => m.month === curMonth - 1)?.total_cents ?? 0;
  const topTip     = tips.reduce<number>((top, t) => Math.max(top, t.amount_cents), 0);
  const avgTip     = tips.length ? Math.round(total / tips.length) : 0;
  const trend      = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

  const totalAnimated    = useCountUp(total);
  const thisMonthAnimated = useCountUp(thisMonth);
  const topTipAnimated   = useCountUp(topTip);
  const avgTipAnimated   = useCountUp(avgTip);
  const countAnimated    = useCountUp(tips.length);

  const stats = [
    { label: "TOTAL REVENUE", raw: totalAnimated, display: formatTip(totalAnimated), sub: "all time", accent: G },
    { label: "THIS MONTH",    raw: thisMonthAnimated, display: formatTip(thisMonthAnimated),
      sub: trend !== 0 ? `${trend > 0 ? "+" : ""}${trend}% vs last month` : MONTHS[curMonth-1], accent: "#818cf8",
      trend: trend !== 0 ? trend : null },
    { label: "TOP TIP",       raw: topTipAnimated, display: topTip ? formatTip(topTipAnimated) : "—", sub: "single payment", accent: "#fb923c" },
    { label: "AVG TIP",       raw: avgTipAnimated, display: avgTip ? formatTip(avgTipAnimated) : "—", sub: "per transaction", accent: "#4ade80" },
    { label: "SUPPORTERS",    raw: countAnimated,  display: String(countAnimated), sub: "unique fans", accent: "#f472b6" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginTop: 18 }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 14,
          padding: "16px 18px", transition: "all .2s", cursor: "default", animation: `slideUp .5s ${i*0.06}s both` }}
          onMouseEnter={e => { const d = e.currentTarget; d.style.background = CARD2; d.style.borderColor = BDR2; d.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { const d = e.currentTarget; d.style.background = CARD; d.style.borderColor = BDR; d.style.transform = "none"; }}>
          {/* top accent line */}
          <div style={{ height: 2, borderRadius: 1, background: s.accent, opacity: .45, marginBottom: 12,
            width: `${Math.max(20, Math.min(100, (s.raw / Math.max(total || 1, topTip || 1)) * 100))}%`,
            minWidth: 24, transition: "width 1s ease" }} />
          <div style={{ fontFamily: MONO, fontSize: 9, color: MUT, letterSpacing: "0.12em", marginBottom: 6 }}>{s.label}</div>
          <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: s.accent, lineHeight: 1, marginBottom: 5 }}>{s.display}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {s.trend != null && (
              <span style={{ color: s.trend > 0 ? "#4ade80" : "#f87171", fontSize: 10, fontFamily: MONO }}>
                {s.trend > 0 ? "↑" : "↓"}
              </span>
            )}
            <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: "0.05em" }}>{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Vault card ───────────────────────────────────────────────────────────────

interface VaultCardProps {
  dragging: boolean; uploading: boolean; uploadPct: number; uploadErr: string | null;
  asset: UploadedAsset | null; fileRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void; onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void; onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBrowse: () => void; onRemove: () => void; onGenerate: () => void;
}

function VaultCard(p: VaultCardProps) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 20, overflow: "hidden" }}>
      {/* header */}
      <div style={{ padding: "22px 26px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: GB2, border: `1px solid ${GLine}`,
            display: "grid", placeItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="7" width="12" height="8" rx="2" stroke={G} strokeWidth="1.3"/>
              <path d="M5 7V5a3 3 0 016 0v2" stroke={G} strokeWidth="1.3"/>
              <circle cx="8" cy="11" r="1.5" fill={G}/>
            </svg>
          </div>
          <div>
            <div style={{ color: W, fontWeight: 600, fontSize: 15 }}>Content Vault</div>
            <div style={{ color: MUT, fontSize: 12 }}>Buyers unlock your file automatically after payment</div>
          </div>
        </div>
        {p.asset && (
          <button onClick={p.onGenerate} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em",
            padding: "8px 18px", background: GB2, border: `1px solid ${GLine}`, color: G,
            borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = GB3; }}
            onMouseLeave={e => { e.currentTarget.style.background = GB2; }}>
            Attach to Link →
          </button>
        )}
      </div>

      <div style={{ padding: "16px 26px 26px" }}>
        {!p.asset && !p.uploading ? (
          <div onDragOver={p.onDragOver} onDragLeave={p.onDragLeave} onDrop={p.onDrop} onClick={p.onBrowse}
            style={{ border: `2px dashed ${p.dragging ? G : BDR2}`, borderRadius: 16, padding: "44px 28px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 16, cursor: "pointer",
              background: p.dragging ? GB : "rgba(255,255,255,.012)", transition: "all .2s", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, display: "grid", placeItems: "center",
              background: p.dragging ? GB2 : CARD2, border: `1px solid ${p.dragging ? GLine : BDR}`,
              transition: "all .2s" }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M13 3v14M7 9l6-6 6 6" stroke={p.dragging ? G : SUB} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 22h20" stroke={p.dragging ? G : SUB} strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p style={{ color: p.dragging ? G : W, fontWeight: 600, margin: "0 0 5px", fontSize: 15 }}>
                {p.dragging ? "Drop to secure in vault" : "Drag & drop your file"}
              </p>
              <p style={{ color: MUT, fontSize: 13, margin: 0 }}>
                or <span style={{ color: G, textDecoration: "underline" }}>browse to upload</span>
              </p>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {["PDF","MP4","MP3","ZIP","PNG","DOCX","PSD","AI"].map(t => (
                <span key={t} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em",
                  color: MUT, background: "rgba(255,255,255,.04)", border: `1px solid ${BDR}`,
                  borderRadius: 4, padding: "3px 8px" }}>{t}</span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="5.5" width="10" height="6" rx="1.5" stroke={DIM} strokeWidth="1"/>
                <path d="M3.5 5.5V3.5a2.5 2.5 0 015 0v2" stroke={DIM} strokeWidth="1"/>
              </svg>
              <span style={{ color: DIM, fontSize: 11 }}>Stored securely · Never exposed before payment · 100MB max</span>
            </div>
          </div>
        ) : p.uploading ? (
          <div style={{ border: `1px solid ${BDR}`, borderRadius: 14, padding: "28px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: GB, border: `1px solid ${GLine}`,
                display: "grid", placeItems: "center" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "spin 1.2s linear infinite" }}>
                  <path d="M10 2a8 8 0 0 1 8 8" stroke={G} strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: W, fontSize: 14, fontWeight: 500, marginBottom: 3 }}>Encrypting & uploading…</div>
                <div style={{ color: MUT, fontSize: 12, fontFamily: MONO }}>{p.uploadPct}% complete</div>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${p.uploadPct}%`, borderRadius: 3, transition: "width .25s",
                background: `linear-gradient(90deg,${G},rgba(200,169,110,.6))` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ color: DIM, fontSize: 11, fontFamily: MONO }}>Vault-encrypting your file</span>
              <span style={{ color: G, fontSize: 11, fontFamily: MONO }}>{p.uploadPct}%</span>
            </div>
          </div>
        ) : p.asset ? (
          <div style={{ border: `1px solid ${GLine}`, borderRadius: 14, padding: "18px 20px", background: GB,
            display: "flex", gap: 16, alignItems: "flex-start" }}>
            {p.asset.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.asset.preview} alt={p.asset.name}
                style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover",
                  border: `1px solid ${BDR}`, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 10, background: CARD3, border: `1px solid ${BDR}`,
                display: "grid", placeItems: "center", flexShrink: 0,
                fontSize: 22, color: CAT_COLOR[p.asset.category] }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 12h8M8 8h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ color: "#4ade80", fontSize: 10, fontFamily: MONO, letterSpacing: "0.08em" }}>✓ SECURED IN VAULT</span>
                <span style={{ width: 1, height: 10, background: BDR }} />
                <span style={{ color: MUT, fontSize: 10, fontFamily: MONO }}>{fmtBytes(p.asset.size)}</span>
              </div>
              <div style={{ color: W, fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 8 }}>
                {p.asset.name}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em",
                  color: CAT_COLOR[p.asset.category],
                  background: `${CAT_COLOR[p.asset.category]}18`,
                  border: `1px solid ${CAT_COLOR[p.asset.category]}35`,
                  borderRadius: 4, padding: "2px 8px" }}>
                  {CAT_LABEL[p.asset.category]}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: G2, fontSize: 11, fontFamily: MONO }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <rect x=".5" y="5.5" width="10" height="5" rx="1.5" stroke="currentColor" strokeWidth="1"/>
                    <path d="M3 5.5V3.5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1"/>
                  </svg>
                  Unlocks on payment
                </span>
              </div>
            </div>
            <button onClick={p.onRemove} style={{ background: "transparent", border: "none",
              color: MUT, cursor: "pointer", padding: 4, fontSize: 18, lineHeight: 1, flexShrink: 0,
              transition: "color .15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; }}
              onMouseLeave={e => { e.currentTarget.style.color = MUT; }} title="Remove">✕</button>
          </div>
        ) : null}

        {p.uploadErr && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,68,68,.08)",
            border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, color: "#f87171", fontSize: 12 }}>
            {p.uploadErr}
          </div>
        )}
        {/* eslint-disable-next-line react-hooks/refs -- ref forwarded from parent, not dereferenced here */}
        <input ref={p.fileRef} type="file" onChange={p.onFileChange} style={{ display: "none" }} />
      </div>
    </div>
  );
}

// ─── Mint Studio ──────────────────────────────────────────────────────────────

interface MintProps {
  id?: string;
  title: string; setTitle: (v: string) => void;
  price: string; setPrice: (v: string) => void;
  currency: Currency; setCurrency: (v: Currency) => void;
  mode: PriceMode; setMode: (v: PriceMode) => void;
  lockToFile: boolean; setLockToFile: (v: boolean) => void;
  hasAsset: boolean; generating: boolean; error: string | null; onGenerate: () => void;
}

function MintStudio({ id, title, setTitle, price, setPrice, currency, setCurrency, mode, setMode,
  lockToFile, setLockToFile, hasAsset, generating, error, onGenerate }: MintProps) {

  const priceCents  = Math.round(parseFloat(price) * 100) || 0;
  const youEarn     = priceCents > 0 ? Math.round(priceCents * 0.88) : 0;
  const CURRENCIES: Currency[] = ["USD", "EUR", "GBP"];
  const PRESETS     = [9, 19, 29, 49, 99];
  const SYM: Record<Currency, string> = { USD: "$", EUR: "€", GBP: "£" };

  return (
    <div id={id} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 20, overflow: "hidden" }}>
      {/* gradient header bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg,transparent,${G} 30%,rgba(200,169,110,.5) 70%,transparent)` }} />

      <div style={{ padding: "26px 26px 28px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: GB2, border: `1px solid ${GLine}`,
              display: "grid", placeItems: "center" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l1.5 4.5H14l-3.7 2.7 1.4 4.3L8 9.7 4.3 12.5l1.4-4.3L2 5.5h4.5L8 1z" fill={G}/>
              </svg>
            </div>
            <div>
              <div style={{ color: W, fontWeight: 600, fontSize: 16 }}>Link Mint Studio</div>
              <div style={{ color: MUT, fontSize: 12 }}>Generate a checkout link in seconds</div>
            </div>
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: "rgba(255,255,255,.04)", border: `1px solid ${BDR}`, borderRadius: 10, padding: 3, gap: 3 }}>
            {(["fixed","tip"] as PriceMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: "7px 14px", borderRadius: 7,
                border: "none", background: mode === m ? GB3 : "transparent",
                color: mode === m ? G : MUT, fontSize: 12, fontFamily: MONO, letterSpacing: "0.07em",
                cursor: "pointer", transition: "all .15s", outline: mode === m ? `1px solid ${GLine}` : "none" }}>
                {m === "fixed" ? "Fixed" : "Open Tip"}
              </button>
            ))}
          </div>
        </div>

        {/* Step 01 — Name */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: G2, letterSpacing: "0.1em" }}>01</span>
            <label style={{ fontFamily: MONO, fontSize: 10, color: MUT, letterSpacing: "0.1em" }}>NAME YOUR OFFER *</label>
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Lightroom Preset Pack, 1-on-1 Strategy Call…"
            style={{ width: "100%", padding: "13px 16px", background: "rgba(255,255,255,.04)",
              border: `1px solid ${BDR2}`, borderRadius: 10, color: W, fontSize: 14, fontFamily: BODY,
              outline: "none", boxSizing: "border-box", transition: "border-color .15s" }}
            onFocus={e => { e.target.style.borderColor = GLine2; }}
            onBlur={e => { e.target.style.borderColor = BDR2; }} />
        </div>

        {/* Step 02 — Price */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: G2, letterSpacing: "0.1em" }}>02</span>
            <label style={{ fontFamily: MONO, fontSize: 10, color: MUT, letterSpacing: "0.1em" }}>SET YOUR PRICE *</label>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "#4ade80", letterSpacing: "0.06em" }}>Best: $19–$49</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 96px", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                color: G, fontFamily: MONO, fontSize: 20, fontWeight: 600, pointerEvents: "none" }}>
                {SYM[currency]}
              </span>
              <input type="number" min="0.50" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
                style={{ width: "100%", padding: "13px 16px 13px 34px", background: "rgba(255,255,255,.04)",
                  border: `1px solid ${BDR2}`, borderRadius: 10, color: W, fontSize: 20,
                  fontFamily: MONO, fontWeight: 600, outline: "none", boxSizing: "border-box",
                  transition: "border-color .15s", letterSpacing: "-0.01em" }}
                onFocus={e => { e.target.style.borderColor = GLine2; }}
                onBlur={e => { e.target.style.borderColor = BDR2; }} />
            </div>
            <select value={currency} onChange={e => setCurrency(e.target.value as Currency)}
              style={{ padding: "13px 10px", background: "rgba(255,255,255,.04)", border: `1px solid ${BDR2}`,
                borderRadius: 10, color: W, fontSize: 13, fontFamily: MONO, outline: "none", cursor: "pointer" }}>
              {CURRENCIES.map(c => <option key={c} value={c} style={{ background: "#111" }}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Presets */}
        <div style={{ display: "flex", gap: 7, marginBottom: 18 }}>
          {PRESETS.map(p => (
            <button key={p} onClick={() => setPrice(String(p))}
              style={{ flex: 1, padding: "7px 0", fontFamily: MONO, fontSize: 12,
                background: price === String(p) ? GB3 : "rgba(255,255,255,.03)",
                border: `1px solid ${price === String(p) ? GLine2 : BDR}`,
                color: price === String(p) ? G : MUT, borderRadius: 8, cursor: "pointer", transition: "all .13s" }}>
              {SYM[currency]}{p}
            </button>
          ))}
        </div>

        {/* Live fee breakdown */}
        {youEarn > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", background: "rgba(74,222,128,.05)", border: "1px solid rgba(74,222,128,.18)",
            borderRadius: 10, marginBottom: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: MUT, fontSize: 10, fontFamily: MONO, letterSpacing: "0.08em", marginBottom: 3 }}>FAN PAYS</div>
              <div style={{ color: W, fontSize: 16, fontFamily: MONO, fontWeight: 600 }}>{fmtMoney(priceCents, currency)}</div>
            </div>
            <div style={{ color: G2, fontSize: 18 }}>→</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: MUT, fontSize: 10, fontFamily: MONO, letterSpacing: "0.08em", marginBottom: 3 }}>YOU EARN</div>
              <div style={{ color: "#4ade80", fontSize: 16, fontFamily: MONO, fontWeight: 600 }}>{fmtMoney(youEarn, currency)}</div>
            </div>
            <div style={{ color: DIM, fontSize: 11, fontFamily: MONO }}>88% payout</div>
          </div>
        )}

        {/* Step 03 — File lock */}
        {hasAsset && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: G2, letterSpacing: "0.1em" }}>03</span>
              <label style={{ fontFamily: MONO, fontSize: 10, color: MUT, letterSpacing: "0.1em" }}>VAULT LOCK</label>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", background: GB, border: `1px solid ${GLine}`, borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="6" width="10" height="7" rx="2" stroke={G} strokeWidth="1.2"/>
                  <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke={G} strokeWidth="1.2"/>
                </svg>
                <span style={{ color: W, fontSize: 13, fontWeight: 500 }}>Lock vault file to this link</span>
              </div>
              <Toggle checked={lockToFile} onChange={setLockToFile} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 16, padding: "11px 15px", background: "rgba(239,68,68,.08)",
            border: "1px solid rgba(239,68,68,.25)", borderRadius: 9, color: "#f87171", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Mint CTA */}
        <button onClick={onGenerate} disabled={generating} style={{
          width: "100%", padding: "16px", borderRadius: 12, border: "none", cursor: generating ? "not-allowed" : "pointer",
          background: generating ? "rgba(200,169,110,.18)" : `linear-gradient(135deg,${G},rgba(200,169,110,.75))`,
          color: generating ? G : "#080608", fontFamily: BODY, fontWeight: 800, fontSize: 15,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all .2s",
          boxShadow: generating ? "none" : `0 6px 28px rgba(200,169,110,.36)`, letterSpacing: "0.03em" }}
          onMouseEnter={e => { if (!generating) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 38px rgba(200,169,110,.48)`; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = generating ? "none" : `0 6px 28px rgba(200,169,110,.36)`; }}>
          {generating ? (
            <>
              <span style={{ width: 16, height: 16, border: `2.5px solid ${G}`, borderTopColor: "transparent",
                borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
              Minting your link…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l1.5 4.5H14l-3.7 2.7 1.4 4.3L8 9.7 4.3 12.5l1.4-4.3L2 5.5h4.5L8 1z" fill="currentColor"/>
              </svg>
              Mint Payment Link
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Live link card ───────────────────────────────────────────────────────────

function LiveLinkCard({ link, copied, onCopy, onReset }: {
  link: GeneratedLink; copied: boolean; onCopy: () => void; onReset: () => void;
}) {
  const displayUrl = link.whop_url ?? link.url;
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", animation: "floatIn .5s ease both",
      background: "linear-gradient(135deg,rgba(74,222,128,.07),rgba(200,169,110,.07))",
      border: "1px solid rgba(74,222,128,.25)" }}>
      {/* shimmer top line */}
      <div style={{ height: 2, background: "linear-gradient(90deg,transparent,#4ade80,#c8a96e,transparent)",
        backgroundSize: "200% 100%", animation: "shimmer 2.5s linear infinite" }} />

      <div style={{ padding: "26px 28px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
              background: "rgba(74,222,128,.15)", border: "1px solid rgba(74,222,128,.3)",
              animation: "ring 2s ease-out infinite" }} />
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(74,222,128,.15)",
              border: "1px solid rgba(74,222,128,.3)", display: "grid", placeItems: "center", position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8l5 5 8-8" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 15 }}>Your link is LIVE</span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80",
                display: "inline-block", animation: "pulse 1.5s infinite" }} />
            </div>
            <div style={{ color: MUT, fontSize: 12 }}>{link.title} · {fmtMoney(link.price, link.currency)}</div>
          </div>
          <button onClick={onReset} style={{ background: "transparent", border: "none",
            color: MUT, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4, transition: "color .15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.color = MUT; }}>✕</button>
        </div>

        {/* URL row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, padding: "12px 16px", background: "rgba(255,255,255,.04)",
            border: `1px solid ${BDR}`, borderRadius: 10, color: W, fontSize: 13,
            fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            backgroundImage: `linear-gradient(90deg,transparent 80%,rgba(255,255,255,.02))` }}>
            {displayUrl}
          </div>
          <button onClick={onCopy} style={{ padding: "12px 20px", borderRadius: 10, border: "none", cursor: "pointer",
            background: copied ? "rgba(74,222,128,.2)" : `linear-gradient(135deg,${G},rgba(200,169,110,.7))`,
            color: copied ? "#4ade80" : "#080608", fontFamily: MONO, fontSize: 12,
            letterSpacing: "0.08em", fontWeight: 700, transition: "all .2s",
            boxShadow: copied ? "none" : `0 4px 16px rgba(200,169,110,.3)`, whiteSpace: "nowrap" }}>
            {copied ? "✓ Copied!" : "Copy Link"}
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginBottom: shareOpen ? 14 : 0 }}>
          <a href={displayUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
              background: CARD2, border: `1px solid ${BDR}`, borderRadius: 8,
              color: SUB, fontSize: 12, fontFamily: MONO, textDecoration: "none",
              letterSpacing: "0.06em", transition: "all .15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = BDR2; (e.currentTarget as HTMLAnchorElement).style.color = W; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = BDR; (e.currentTarget as HTMLAnchorElement).style.color = SUB; }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 9L9 2M9 2H4M9 2v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Preview
          </a>
          <button onClick={() => setShareOpen(!shareOpen)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
              background: shareOpen ? GB2 : CARD2, border: `1px solid ${shareOpen ? GLine : BDR}`,
              borderRadius: 8, color: shareOpen ? G : SUB, fontSize: 12, fontFamily: MONO,
              letterSpacing: "0.06em", cursor: "pointer", transition: "all .15s" }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="9" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="2" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="9" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M3.5 6.2l4.2 2.1M7.6 2.8L3.4 4.9" stroke="currentColor" strokeWidth="1"/></svg>
            Share
          </button>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
            fontFamily: MONO, fontSize: 11, color: MUT }}>
            <span style={{ color: G2 }}>88%</span> payout · {fmtMoney(Math.round(link.price * 0.88), link.currency)} yours
          </div>
        </div>

        {shareOpen && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{ k: "Twitter/X", c: "#1a8cd8" }, { k: "Instagram", c: "#e1306c" }, { k: "Telegram", c: "#229ed9" }, { k: "TikTok", c: "#69c9d0" }].map(s => (
              <button key={s.k} style={{ padding: "7px 14px", background: CARD, border: `1px solid ${BDR}`,
                borderRadius: 7, color: MUT, fontSize: 11, fontFamily: MONO, cursor: "pointer",
                transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = s.c; e.currentTarget.style.borderColor = `${s.c}50`; }}
                onMouseLeave={e => { e.currentTarget.style.color = MUT; e.currentTarget.style.borderColor = BDR; }}>
                {s.k}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Revenue feed ─────────────────────────────────────────────────────────────

function RevenueFeed({ tips, monthlyEarnings, handle, maxMonth, curMonth, tab, setTab }: {
  tips: Tip[]; monthlyEarnings: { month: number; total_cents: number; tip_count: number }[];
  handle: string; maxMonth: number; curMonth: number; tab: FeedTab; setTab: (t: FeedTab) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = setTimeout(() => setMounted(true), 100); return () => clearTimeout(id); }, []);

  const paidTips     = tips.filter(t => t.status === "paid");
  const displayedTips = tab === "wall" ? paidTips.slice(0, 20) : tips.slice(0, 50);

  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 20, overflow: "hidden" }}>
      {/* Chart */}
      <div style={{ padding: "22px 26px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <span style={{ fontFamily: MONO, fontSize: 10, color: MUT, letterSpacing: "0.12em" }}>
              MONTHLY REVENUE — {new Date().getFullYear()}
            </span>
          </div>
          <span style={{ color: DIM, fontSize: 11, fontFamily: MONO }}>
            {monthlyEarnings.reduce((s, m) => s + m.tip_count, 0)} tips this year
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 64 }}>
          {MONTHS.map((m, i) => {
            const entry    = monthlyEarnings.find(e => e.month === i + 1);
            const isCur    = i + 1 === curMonth;
            const pct      = entry?.total_cents ? Math.max(4, (entry.total_cents / maxMonth) * 64) : 3;
            const barH     = mounted ? pct : 3;
            return (
              <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} title={`${m}: ${formatTip(entry?.total_cents ?? 0)}`}>
                <div style={{ width: "100%", height: barH, borderRadius: 2,
                  background: isCur ? G : (entry?.total_cents ? "rgba(200,169,110,.4)" : "rgba(255,255,255,.06)"),
                  transition: "height .6s cubic-bezier(.4,0,.2,1)",
                  boxShadow: isCur ? `0 0 8px rgba(200,169,110,.4)` : "none" }} />
                <span style={{ color: isCur ? G2 : DIM, fontSize: 7, fontFamily: MONO }}>{m[0]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "14px 26px 0", display: "flex", gap: 0, borderBottom: `1px solid ${BDR}` }}>
        {([ ["wall","Wall of Love"], ["all","All Tips"] ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "9px 18px", background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === t ? G : "transparent"}`,
              color: tab === t ? G : MUT, fontSize: 12, fontFamily: MONO, letterSpacing: "0.08em",
              cursor: "pointer", marginBottom: -1, transition: "all .15s" }}>
            {label}
          </button>
        ))}
      </div>

      {displayedTips.length === 0 ? (
        <EmptyTips handle={handle} />
      ) : tab === "wall" ? (
        <div style={{ padding: "22px 26px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
          {displayedTips.map(tip => <TipWallCard key={tip.id} tip={tip} />)}
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["From","Amount","Message","Status","When"].map(h => (
                <th key={h} style={{ padding: "11px 22px", textAlign: "left", color: MUT,
                  fontSize: 10, fontFamily: MONO, letterSpacing: "0.1em",
                  borderBottom: `1px solid ${BDR}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedTips.map((tip, i) => (
              <tr key={tip.id} style={{ borderBottom: i < displayedTips.length-1 ? `1px solid ${BDR}` : "none", transition: "background .15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,.02)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}>
                <td style={{ padding: "12px 22px", color: W, fontSize: 13 }}>
                  {tip.is_anonymous ? <span style={{ color: DIM }}>Anonymous</span> : (tip.display_name ?? "Fan")}
                </td>
                <td style={{ padding: "12px 22px", color: G, fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>{formatTip(tip.amount_cents)}</td>
                <td style={{ padding: "12px 22px", color: MUT, fontSize: 12, maxWidth: 200 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tip.message ?? <span style={{ color: DIM }}>—</span>}
                  </span>
                </td>
                <td style={{ padding: "12px 22px" }}><StatusPill status={tip.status} /></td>
                <td style={{ padding: "12px 22px", color: DIM, fontSize: 11, fontFamily: MONO }}>{timeAgo(tip.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TipWallCard({ tip }: { tip: Tip }) {
  const tier = tip.amount_cents >= 5000 ? "high" : tip.amount_cents >= 1000 ? "mid" : "base";
  const glow = tier === "high" ? "rgba(200,169,110,.18)" : tier === "mid" ? "rgba(129,140,248,.12)" : "transparent";
  const amtColor = tier === "high" ? G : tier === "mid" ? "#818cf8" : W;

  return (
    <div style={{ background: CARD2, border: `1px solid ${BDR}`, borderRadius: 14, padding: "18px",
      position: "relative", overflow: "hidden", transition: "all .2s" }}
      onMouseEnter={e => { const d = e.currentTarget; d.style.borderColor = GLine; d.style.background = `rgba(255,255,255,.07)`; d.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { const d = e.currentTarget; d.style.borderColor = BDR; d.style.background = CARD2; d.style.transform = "none"; }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80,
        background: `radial-gradient(circle at top right,${glow},transparent)`, pointerEvents: "none" }} />
      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: amtColor, marginBottom: 10,
        letterSpacing: "-0.02em" }}>{formatTip(tip.amount_cents)}</div>
      {tip.message && (
        <p style={{ color: SUB, fontSize: 12, lineHeight: 1.6, margin: "0 0 12px", fontStyle: "italic" }}>
          &ldquo;{tip.message}&rdquo;
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: tip.is_anonymous ? DIM : MUT, fontSize: 11 }}>
          {tip.is_anonymous ? "Anonymous" : (tip.display_name ?? "Fan")}
        </span>
        {tip.paid_at && <span style={{ color: DIM, fontSize: 10, fontFamily: MONO }}>{timeAgo(tip.paid_at)}</span>}
      </div>
    </div>
  );
}

function EmptyTips({ handle }: { handle: string }) {
  return (
    <div style={{ padding: "56px 28px", textAlign: "center", animation: "slideUp .5s ease both" }}>
      <div style={{ width: 72, height: 72, borderRadius: 18, background: GB, border: `1px solid ${GLine}`,
        display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M15 5l2 6h6l-5 3.5 2 6L15 17l-5 3.5 2-6L7 11h6L15 5z" stroke={G} strokeWidth="1.4" fill="none"/>
        </svg>
      </div>
      <h3 style={{ color: W, fontFamily: DISP, fontSize: "1.5rem", fontWeight: 400, margin: "0 0 10px" }}>No tips yet</h3>
      <p style={{ color: MUT, fontSize: 13, margin: "0 0 24px", maxWidth: 360, marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 }}>
        Generate a payment link above and share it. Every link is a new income stream.
        Your first tip is closer than you think.
      </p>
      <button onClick={() => navigator.clipboard.writeText(`${SITE}/tips/${handle}`)}
        style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.08em", padding: "11px 24px",
          background: GB2, border: `1px solid ${GLine}`, color: G, borderRadius: 9, cursor: "pointer",
          transition: "all .15s" }}
        onMouseEnter={e => { e.currentTarget.style.background = GB3; }}
        onMouseLeave={e => { e.currentTarget.style.background = GB2; }}>
        Copy Tip Link
      </button>
    </div>
  );
}

// ─── Revenue simulator ────────────────────────────────────────────────────────

function RevenueSim({ avgTipCents, onGenerate }: { avgTipCents: number; onGenerate: () => void }) {
  const [audience, setAudience] = useState(5000);
  const [cvr, setCvr]           = useState(2.3);

  const monthly = Math.round(audience * (cvr / 100) * avgTipCents * 0.88);
  const annual  = monthly * 12;

  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 18, overflow: "hidden" }}>
      <div style={{ height: 2, background: `linear-gradient(90deg,transparent,#818cf8,transparent)` }} />
      <div style={{ padding: "22px 22px 24px" }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: MUT, letterSpacing: "0.12em", marginBottom: 16 }}>REVENUE SIMULATOR</div>

        {/* Big number */}
        <div style={{ textAlign: "center", marginBottom: 22, padding: "18px", background: "rgba(255,255,255,.025)", borderRadius: 12, border: `1px solid ${BDR}` }}>
          <div style={{ color: DIM, fontSize: 11, fontFamily: MONO, marginBottom: 6 }}>EST. MONTHLY</div>
          <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: G, letterSpacing: "-0.02em" }}>
            {fmtMoney(monthly)}
          </div>
          <div style={{ color: DIM, fontSize: 10, fontFamily: MONO, marginTop: 4 }}>
            {fmtMoney(annual)} / year
          </div>
        </div>

        {/* Audience slider */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <label style={{ fontFamily: MONO, fontSize: 10, color: MUT, letterSpacing: "0.09em" }}>AUDIENCE SIZE</label>
            <span style={{ fontFamily: MONO, fontSize: 12, color: W }}>{audience.toLocaleString("en-US")}</span>
          </div>
          <input type="range" min={500} max={100000} step={500} value={audience}
            onChange={e => setAudience(Number(e.target.value))}
            style={{ accentColor: G }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ color: DIM, fontSize: 10, fontFamily: MONO }}>500</span>
            <span style={{ color: DIM, fontSize: 10, fontFamily: MONO }}>100k</span>
          </div>
        </div>

        {/* CVR slider */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <label style={{ fontFamily: MONO, fontSize: 10, color: MUT, letterSpacing: "0.09em" }}>CONVERSION RATE</label>
            <span style={{ fontFamily: MONO, fontSize: 12, color: W }}>{cvr.toFixed(1)}%</span>
          </div>
          <input type="range" min={0.5} max={10} step={0.1} value={cvr}
            onChange={e => setCvr(Number(e.target.value))}
            style={{ accentColor: G }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ color: DIM, fontSize: 10, fontFamily: MONO }}>0.5%</span>
            <span style={{ color: G2, fontSize: 10, fontFamily: MONO }}>avg 2.3%</span>
            <span style={{ color: DIM, fontSize: 10, fontFamily: MONO }}>10%</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Conversions", value: Math.round(audience * cvr / 100) },
            { label: "Avg Tip", value: null },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: "10px 12px", background: "rgba(255,255,255,.025)", borderRadius: 9, border: `1px solid ${BDR}` }}>
              <div style={{ color: DIM, fontSize: 9, fontFamily: MONO, letterSpacing: "0.08em", marginBottom: 4 }}>{s.label.toUpperCase()}</div>
              <div style={{ color: W, fontSize: 13, fontFamily: MONO }}>
                {s.value !== null ? s.value.toLocaleString("en-US") : fmtMoney(avgTipCents)}
              </div>
            </div>
          ))}
        </div>

        <button onClick={onGenerate}
          style={{ width: "100%", padding: "11px", background: GB2, border: `1px solid ${GLine}`,
            borderRadius: 9, color: G, fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em",
            cursor: "pointer", transition: "all .15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = GB3; }}
          onMouseLeave={e => { e.currentTarget.style.background = GB2; }}>
          Start Earning →
        </button>
      </div>
    </div>
  );
}

// ─── Fan preview card ─────────────────────────────────────────────────────────

function FanPreviewCard({ handle }: { handle: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 18, overflow: "hidden" }}>
      <div style={{ padding: "22px 22px 24px" }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: MUT, letterSpacing: "0.12em", marginBottom: 16 }}>WHAT YOUR FAN SEES</div>

        {/* Mini checkout card */}
        <div style={{ background: "linear-gradient(135deg,#111118,#0d0d16)", border: `1px solid ${BDR2}`,
          borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
          {/* top bar */}
          <div style={{ height: 3, background: `linear-gradient(90deg,${G},rgba(200,169,110,.5))` }} />
          <div style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: GB2, border: `1px solid ${GLine}`,
                display: "grid", placeItems: "center", fontFamily: MONO, fontSize: 13, color: G, fontWeight: 700 }}>
                {handle.slice(0,1).toUpperCase()}
              </div>
              <div>
                <div style={{ color: W, fontSize: 12, fontWeight: 600 }}>@{handle}</div>
                <div style={{ color: MUT, fontSize: 10 }}>Exclusive Content</div>
              </div>
            </div>
            <div style={{ color: W, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Premium Access Pack</div>
            <div style={{ color: MUT, fontSize: 12, marginBottom: 14 }}>Unlock after payment</div>
            {/* Apple Pay btn */}
            <div style={{ background: "#000", borderRadius: 8, padding: "10px 0", textAlign: "center",
              border: "1px solid rgba(255,255,255,.15)", marginBottom: 8 }}>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}> Pay</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ flex: 1, height: 1, background: BDR }} />
              <span style={{ color: DIM, fontSize: 10, fontFamily: MONO }}>or pay with card</span>
              <div style={{ flex: 1, height: 1, background: BDR }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Apple Pay","Google Pay","Card","Crypto"].map(t => (
            <span key={t} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.06em",
              color: G2, background: GB, border: `1px solid ${GLine}`, borderRadius: 4, padding: "3px 8px" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Playbook ─────────────────────────────────────────────────────────────────

function PlaybookCard({ onGenerate }: { onGenerate: () => void }) {
  const plays = [
    { n: "01", head: "Price between $19–$49", body: "Highest conversion for first-time buyers. $9 feels cheap; $99 creates friction." },
    { n: "02", head: "Bundle for value", body: "3–5 files in a ZIP feels 10× more valuable than a single file at the same price." },
    { n: "03", head: "Enable Apple Pay", body: "Mobile fans convert 3× better with one-touch checkout. Don't make them type a card." },
    { n: "04", head: "Add urgency to titles", body: `"Limited — 50 spots" or "Closing Friday" triples impulse buys.` },
    { n: "05", head: "Share in bio and stories", body: "Post 24h after you generate. First 2 hours drive 60% of total sales." },
  ];

  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 18, overflow: "hidden" }}>
      <div style={{ padding: "22px 22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: MUT, letterSpacing: "0.12em" }}>CONVERSION PLAYBOOK</div>
          <span style={{ fontFamily: MONO, fontSize: 9, color: G2, background: GB, border: `1px solid ${GLine}`,
            borderRadius: 4, padding: "3px 8px" }}>5 PLAYS</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          {plays.map(p => (
            <div key={p.n} style={{ display: "flex", gap: 12 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: G2, flexShrink: 0, marginTop: 1,
                minWidth: 22, letterSpacing: "0.04em" }}>{p.n}</span>
              <div>
                <div style={{ color: W, fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{p.head}</div>
                <div style={{ color: MUT, fontSize: 12, lineHeight: 1.55 }}>{p.body}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onGenerate}
          style={{ width: "100%", padding: "12px", background: GB2, border: `1px solid ${GLine}`,
            borderRadius: 9, color: G, fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em",
            cursor: "pointer", transition: "all .15s", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8 }}
          onMouseEnter={e => { e.currentTarget.style.background = GB3; }}
          onMouseLeave={e => { e.currentTarget.style.background = GB2; }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1l1.2 3.6H11L8.1 6.8l1.1 3.4L6 8.1 2.9 10.2 4 6.8 1 4.6h3.8L6 1z" fill={G}/></svg>
          Run Play #1 Now
        </button>
      </div>
    </div>
  );
}

// ─── Floating FAB ─────────────────────────────────────────────────────────────

function FloatingFAB({ onGenerate }: { onGenerate: () => void }) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const h = () => setVis(window.scrollY > 280);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <button onClick={onGenerate} style={{
      position: "fixed", bottom: 30, right: 30, zIndex: 100,
      display: "flex", alignItems: "center", gap: 9, padding: "14px 24px",
      background: `linear-gradient(135deg,${G},rgba(200,169,110,.75))`,
      border: "none", borderRadius: 50, color: "#080608",
      fontFamily: BODY, fontWeight: 800, fontSize: 13, cursor: "pointer",
      boxShadow: `0 8px 36px rgba(200,169,110,.45)`,
      transform: vis ? "translateY(0) scale(1)" : "translateY(90px) scale(.9)",
      opacity: vis ? 1 : 0, transition: "transform .3s cubic-bezier(.4,0,.2,1),opacity .3s",
      pointerEvents: vis ? "auto" : "none", letterSpacing: "0.02em" }}
      onMouseEnter={e => { if (vis) { e.currentTarget.style.transform = "translateY(-3px) scale(1.04)"; e.currentTarget.style.boxShadow = `0 16px 44px rgba(200,169,110,.58)`; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = vis ? "translateY(0) scale(1)" : "translateY(90px) scale(.9)"; e.currentTarget.style.boxShadow = `0 8px 36px rgba(200,169,110,.45)`; }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 4.5H13l-3.7 2.7 1.4 4.3L7 10 3.3 12.5l1.4-4.3L1 5.5h4.5L7 1z" fill="currentColor"/></svg>
      Mint Link
    </button>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function ConfettiLayer() {
  const cols = [G, "#818cf8", "#4ade80", "#fb923c", "#f472b6", "#34d399"];
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }}>
      {Array.from({ length: 44 }, (_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${(i * 2.3) % 100}%`,
          top: -20,
          width: `${6 + (i % 4) * 2}px`,
          height: `${6 + (i % 5) * 2}px`,
          background: cols[i % cols.length],
          borderRadius: i % 3 === 0 ? "50%" : "2px",
          animation: `confetti ${1.8 + (i % 7) * 0.18}s ${(i % 8) * 0.08}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{ width: 42, height: 24, borderRadius: 12, flexShrink: 0, cursor: "pointer", transition: "all .2s",
        background: checked ? G : "rgba(255,255,255,.1)", border: `1px solid ${checked ? G : BDR}`,
        position: "relative" }}>
      <div style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%",
        left: checked ? 22 : 3, transition: "left .2s",
        background: checked ? "#080608" : SUB, boxShadow: "0 1px 4px rgba(0,0,0,.3)" }} />
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    paid:     { bg: "rgba(74,222,128,.1)",  color: "#4ade80" },
    pending:  { bg: "rgba(251,191,36,.1)",  color: "#fbbf24" },
    refunded: { bg: "rgba(148,163,184,.1)", color: "#94a3b8" },
  };
  const s = map[status] ?? map.refunded;
  return (
    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.1em", padding: "3px 9px",
      borderRadius: 5, background: s.bg, color: s.color, border: `1px solid ${s.color}35` }}>
      {status.toUpperCase()}
    </span>
  );
}
