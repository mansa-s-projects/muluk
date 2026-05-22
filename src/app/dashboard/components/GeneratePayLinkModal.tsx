"use client";

import { useState, useEffect, useId } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;
type Currency = "USD" | "EUR" | "GBP";
type ContentType = "text" | "file";
type PriceMode = "fixed" | "tip";

interface GeneratedLink {
  id: string;
  url: string;
  whop_url: string | null;
  title: string;
  price: number;
  currency: string;
}

interface Props {
  onClose: () => void;
}

// ─── Tokens ───────────────────────────────────────────────────────────────────
const G     = "#c8a96e";
const MONO  = `'DM Mono','Courier New',monospace`;
const BODY  = `'Outfit','Inter',sans-serif`;

function fmtMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
}

const SITE = typeof window !== "undefined" ? window.location.origin : "";

// ─── Step labels ─────────────────────────────────────────────────────────────
const STEP_LABELS: Record<Step, { title: string; sub: string }> = {
  1: { title: "Name & Price",  sub: "What are you selling and for how much?" },
  2: { title: "What's inside", sub: "The content your buyer receives after payment." },
  3: { title: "Your link is live", sub: "" },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function GeneratePayLinkModal({ onClose }: Props) {
  const labelId = useId();

  // form state
  const [step, setStep]               = useState<Step>(1);
  const [title, setTitle]             = useState("");
  const [price, setPrice]             = useState("");
  const [currency, setCurrency]       = useState<Currency>("USD");
  const [mode, setMode]               = useState<PriceMode>("fixed");
  const [contentType, setContentType] = useState<ContentType>("text");
  const [contentValue, setContentValue] = useState("");
  const [fileUrl, setFileUrl]         = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [link, setLink]               = useState<GeneratedLink | null>(null);
  const [copied, setCopied]           = useState(false);

  const priceCents = Math.round(parseFloat(price) * 100) || 0;
  const youEarn    = priceCents > 0 ? Math.round(priceCents * 0.88) : 0;

  // ESC to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // ── Back / close ──────────────────────────────────────────────────────────
  function handleBack() {
    setError(null);
    if (step === 1) { onClose(); return; }
    setStep((s) => (s - 1) as Step);
  }

  // ── Step 1 → 2 ───────────────────────────────────────────────────────────
  function handleStep1Next() {
    if (!title.trim())              { setError("Title is required"); return; }
    if (isNaN(priceCents) || priceCents < 50) { setError("Minimum price is $0.50"); return; }
    setError(null);
    setStep(2);
  }

  // ── Step 2 → 3 (submit) ──────────────────────────────────────────────────
  async function handleStep2Submit() {
    if (contentType === "text" && !contentValue.trim()) { setError("Add the content your buyer receives"); return; }
    if (contentType === "file" && !fileUrl.trim())      { setError("Add a file URL"); return; }
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(), price: priceCents, currency,
        content_type: contentType,
        content_value: contentType === "text" ? contentValue.trim() : undefined,
        file_url:      contentType === "file" ? fileUrl.trim() : undefined,
        description: mode === "tip" ? "Support my work — unlock exclusive content" : undefined,
      };
      const res = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json() as { id?: string; slug?: string; whop_checkout_url?: string; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to create link");
      const slug = j.slug ?? j.id ?? "";
      setLink({
        id: j.id ?? slug,
        url: `${SITE}/pay/${slug}`,
        title: title.trim(),
        price: priceCents,
        currency,
        whop_url: j.whop_checkout_url ?? null,
      });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link.whop_url ?? link.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  function createAnother() {
    setTitle(""); setPrice(""); setCurrency("USD"); setMode("fixed");
    setContentType("text"); setContentValue(""); setFileUrl("");
    setLink(null); setCopied(false); setError(null);
    setStep(1);
  }

  const SYM: Record<Currency, string> = { USD: "$", EUR: "€", GBP: "£" };
  const PRESETS = [9, 19, 29, 49, 99];

  // ── Shared input style ────────────────────────────────────────────────────
  const input: React.CSSProperties = {
    width: "100%", padding: "11px 14px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8, color: "#fff", fontSize: 14,
    fontFamily: BODY, outline: "none", boxSizing: "border-box",
    transition: "border-color .15s",
  };

  return (
    // Backdrop
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        animation: "glModalIn .2s cubic-bezier(.4,0,.2,1) both",
      }}
    >
      <style>{`
        @keyframes glModalIn { from { opacity:0; transform:scale(.96) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
        .gl-input:focus { border-color: rgba(200,169,110,0.55) !important; }
        .gl-back:hover { color: ${G} !important; background: rgba(200,169,110,0.08) !important; }
        .gl-close:hover { color: rgba(255,255,255,0.8) !important; }
        .gl-preset:hover { border-color: rgba(200,169,110,0.55) !important; color: ${G} !important; }
        .gl-tab:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      {/* Card */}
      <div
        style={{
          width: "100%", maxWidth: 520,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          background: "linear-gradient(160deg,#0d0d1a,#0a0a14)",
          border: `1px solid rgba(200,169,110,0.3)`,
          borderRadius: 16,
          position: "relative",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,169,110,0.1)",
        }}
      >
        {/* Gold top line */}
        <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${G},transparent)`, borderRadius: "16px 16px 0 0" }} />

        {/* Header row */}
        <div style={{ padding: "18px 20px 0", position: "relative", display: "flex", alignItems: "center", minHeight: 44 }}>

          {/* Back / close arrow — always visible, top-left */}
          <button
            aria-label={step === 1 ? "Close" : "Back"}
            onClick={handleBack}
            className="gl-back"
            style={{
              position: "absolute", top: 14, left: 16,
              width: 34, height: 34, borderRadius: 8,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", transition: "all .15s", flexShrink: 0,
            }}
          >
            {/* Chevron-left SVG */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Step indicator */}
          <div style={{ flex: 1, textAlign: "center", paddingLeft: 42, paddingRight: 42 }}>
            {step < 3 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {([1, 2] as const).map((s) => (
                  <div key={s} style={{
                    width: s === step ? 20 : 6, height: 6,
                    borderRadius: 3,
                    background: s === step ? G : s < step ? "rgba(200,169,110,0.4)" : "rgba(255,255,255,0.12)",
                    transition: "all .25s",
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Close X */}
          <button
            aria-label="Close"
            onClick={onClose}
            className="gl-close"
            style={{
              position: "absolute", top: 14, right: 16,
              width: 34, height: 34, borderRadius: 8,
              background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.3)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, lineHeight: 1, transition: "color .15s",
            }}
          >×</button>
        </div>

        {/* Title block */}
        <div style={{ padding: "14px 24px 20px" }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(200,169,110,0.5)", letterSpacing: "0.22em", marginBottom: 6 }}>
            {step < 3 ? `STEP ${step} OF 2` : "COMPLETE"}
          </div>
          <div id={labelId} style={{ fontFamily: `'Cormorant Garamond',Georgia,serif`, fontSize: 26, fontWeight: 400, color: "#fff", lineHeight: 1.1 }}>
            {STEP_LABELS[step].title}
          </div>
          {STEP_LABELS[step].sub && (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", marginTop: 5 }}>{STEP_LABELS[step].sub}</div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 24px" }} />

        {/* Content */}
        <div style={{ padding: "22px 24px 24px" }}>

          {/* ── STEP 1 ───────────────────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Mode toggle */}
              <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 3, gap: 3 }}>
                {(["fixed","tip"] as PriceMode[]).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer",
                      background: mode === m ? "rgba(200,169,110,0.18)" : "transparent",
                      color: mode === m ? G : "rgba(255,255,255,0.35)",
                      fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em",
                      outline: mode === m ? `1px solid rgba(200,169,110,0.3)` : "none",
                      transition: "all .15s",
                    }}>
                    {m === "fixed" ? "Fixed Price" : "Open Tip"}
                  </button>
                ))}
              </div>

              {/* Title */}
              <div>
                <label style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: "0.1em", display: "block", marginBottom: 7 }}>TITLE *</label>
                <input
                  className="gl-input"
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lightroom Preset Pack, 1-on-1 Call…"
                  style={input}
                  onKeyDown={(e) => { if (e.key === "Enter") handleStep1Next(); }}
                />
              </div>

              {/* Price + currency */}
              <div>
                <label style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: "0.1em", display: "block", marginBottom: 7 }}>PRICE *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 88px", gap: 10 }}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: G, fontFamily: MONO, fontSize: 16, fontWeight: 600, pointerEvents: "none" }}>
                      {SYM[currency]}
                    </span>
                    <input
                      className="gl-input"
                      type="number" min="0.50" step="0.01"
                      value={price} onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      style={{ ...input, paddingLeft: 30, fontSize: 18, fontFamily: MONO, fontWeight: 600 }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleStep1Next(); }}
                    />
                  </div>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}
                    style={{ ...input, padding: "11px 10px", cursor: "pointer" }}>
                    {(["USD","EUR","GBP"] as Currency[]).map(c => (
                      <option key={c} value={c} style={{ background: "#111" }}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price presets */}
              <div style={{ display: "flex", gap: 7 }}>
                {PRESETS.map((p) => (
                  <button key={p} onClick={() => setPrice(String(p))} className="gl-preset"
                    style={{
                      flex: 1, padding: "7px 0", fontFamily: MONO, fontSize: 12,
                      background: price === String(p) ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${price === String(p) ? "rgba(200,169,110,0.45)" : "rgba(255,255,255,0.08)"}`,
                      color: price === String(p) ? G : "rgba(255,255,255,0.3)",
                      borderRadius: 8, cursor: "pointer", transition: "all .13s",
                    }}>
                    {SYM[currency]}{p}
                  </button>
                ))}
              </div>

              {/* Fee preview */}
              {youEarn > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 9 }}>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                    Fan pays <strong style={{ color: "#fff" }}>{fmtMoney(priceCents, currency)}</strong>
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: "#4ade80", fontWeight: 600 }}>
                    → You earn {fmtMoney(youEarn, currency)}
                  </span>
                </div>
              )}

              {error && <ErrorBanner>{error}</ErrorBanner>}

              <button onClick={handleStep1Next}
                style={{ width: "100%", padding: 14, background: `linear-gradient(135deg,${G},rgba(200,169,110,0.75))`, border: "none", borderRadius: 10, color: "#080608", fontFamily: BODY, fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "all .18s", boxShadow: "0 4px 20px rgba(200,169,110,0.32)", letterSpacing: "0.02em" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(200,169,110,0.44)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(200,169,110,0.32)"; }}>
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 2 ───────────────────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Content type tabs */}
              <div>
                <label style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>DELIVERY TYPE</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["text","file"] as ContentType[]).map((t) => (
                    <button key={t} onClick={() => setContentType(t)} className="gl-tab"
                      style={{
                        flex: 1, padding: "11px 0", borderRadius: 9,
                        background: contentType === t ? "rgba(200,169,110,0.14)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${contentType === t ? "rgba(200,169,110,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: contentType === t ? G : "rgba(255,255,255,0.35)",
                        fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em",
                        cursor: "pointer", transition: "all .15s",
                      }}>
                      {t === "text" ? "TEXT / MESSAGE" : "FILE / LINK"}
                    </button>
                  ))}
                </div>
              </div>

              {contentType === "text" ? (
                <div>
                  <label style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: "0.1em", display: "block", marginBottom: 7 }}>CONTENT *</label>
                  <textarea
                    className="gl-input"
                    value={contentValue} onChange={(e) => setContentValue(e.target.value)}
                    placeholder="The message, code, instructions, or content delivered after payment…"
                    rows={5}
                    style={{ ...input, resize: "vertical", lineHeight: 1.6 }}
                  />
                  <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 7, letterSpacing: "0.04em" }}>
                    Shown to buyer immediately after payment is confirmed.
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: "0.1em", display: "block", marginBottom: 7 }}>FILE URL *</label>
                  <input
                    className="gl-input"
                    value={fileUrl} onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://your-file-url.com/file.pdf"
                    style={input}
                  />
                  <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 7, letterSpacing: "0.04em" }}>
                    A Dropbox, Google Drive, or CDN link. Unlocked after payment.
                  </div>
                </div>
              )}

              {/* Summary row */}
              <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{title}</span>
                <span style={{ fontFamily: MONO, fontSize: 14, color: G, fontWeight: 600, flexShrink: 0 }}>{fmtMoney(priceCents, currency)}</span>
              </div>

              {error && <ErrorBanner>{error}</ErrorBanner>}

              <button onClick={handleStep2Submit} disabled={saving}
                style={{ width: "100%", padding: 14, background: saving ? "rgba(200,169,110,0.18)" : `linear-gradient(135deg,${G},rgba(200,169,110,0.75))`, border: saving ? "1px solid rgba(200,169,110,0.3)" : "none", borderRadius: 10, color: saving ? G : "#080608", fontFamily: BODY, fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", transition: "all .18s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: saving ? "none" : "0 4px 20px rgba(200,169,110,0.32)", letterSpacing: "0.02em" }}
                onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(200,169,110,0.44)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = saving ? "none" : "0 4px 20px rgba(200,169,110,0.32)"; }}>
                {saving ? (
                  <>
                    <span style={{ width: 14, height: 14, border: `2px solid ${G}`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "glSpin .7s linear infinite" }} />
                    Creating link…
                  </>
                ) : "Mint Payment Link"}
                <style>{`@keyframes glSpin { to { transform: rotate(360deg) } }`}</style>
              </button>
            </div>
          )}

          {/* ── STEP 3 — SUCCESS ─────────────────────────────────────────── */}
          {step === 3 && link && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18, animation: "glModalIn .3s ease both" }}>
              {/* Live badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12 }}>
                <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", animation: "glRing 2s ease-out infinite" }} />
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", display: "grid", placeItems: "center", position: "relative" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-8" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
                <style>{`@keyframes glRing { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.2);opacity:0} }`}</style>
                <div>
                  <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
                    Link is live
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "glPulse 1.5s infinite" }} />
                  </div>
                  <style>{`@keyframes glPulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>{link.title} · {fmtMoney(link.price, link.currency)}</div>
                </div>
              </div>

              {/* URL row */}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {link.whop_url ?? link.url}
                </div>
                <button onClick={copyLink}
                  style={{ padding: "11px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: MONO, fontSize: 12, letterSpacing: "0.07em", fontWeight: 700, transition: "all .18s", whiteSpace: "nowrap",
                    background: copied ? "rgba(74,222,128,0.18)" : `linear-gradient(135deg,${G},rgba(200,169,110,0.7))`,
                    color: copied ? "#4ade80" : "#080608",
                    boxShadow: copied ? "none" : "0 3px 14px rgba(200,169,110,0.3)" }}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>

              {/* Earnings */}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9 }}>
                <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 12 }}>Your take (88%)</span>
                <span style={{ fontFamily: MONO, fontSize: 14, color: "#4ade80", fontWeight: 600 }}>{fmtMoney(Math.round(link.price * 0.88), link.currency)} per sale</span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10 }}>
                <a href={link.whop_url ?? link.url} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, padding: "11px 0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "rgba(255,255,255,0.5)", fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.5)"; }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 9L9 2M9 2H4M9 2v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Preview
                </a>
                <button onClick={createAnother}
                  style={{ flex: 1, padding: "11px 0", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: 9, color: G, fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em", cursor: "pointer", transition: "all .15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,169,110,0.15)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(200,169,110,0.08)"; }}>
                  + Create Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: "#f87171", fontSize: 13 }}>
      {children}
    </div>
  );
}
