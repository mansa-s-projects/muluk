"use client";

import { useState, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface GeneratedLink {
  id:  string;
  url: string;
}

interface Props {
  onClose: () => void;
}

// ── Design tokens ──────────────────────────────────────────────────────────

const GOLD  = "#c8a96e";
const DIM   = "rgba(255,255,255,0.38)";
const MONO  = { fontFamily: "'DM Mono', monospace" } as const;
const SERIF = { fontFamily: "'Cormorant Garamond', serif" } as const;
const SANS  = { fontFamily: "'Outfit', sans-serif" } as const;

const inputStyle: React.CSSProperties = {
  width:        "100%",
  background:   "rgba(255,255,255,0.04)",
  border:       "1px solid rgba(255,255,255,0.1)",
  borderRadius: 4,
  color:        "rgba(255,255,255,0.88)",
  ...MONO,
  fontSize:     14,
  padding:      "13px 14px",
  outline:      "none",
  boxSizing:    "border-box",
  transition:   "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  display:       "block",
  ...MONO,
  fontSize:      9,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color:         DIM,
  marginBottom:  8,
};

// ── Allowed file types ─────────────────────────────────────────────────────

const ACCEPT = [
  "image/*", "video/*", "audio/*",
  "application/pdf", "application/zip", "text/plain",
].join(",");

const MAX_MB = 100;

// ── Component ──────────────────────────────────────────────────────────────

export default function InstantLinkModal({ onClose }: Props) {
  const [file,         setFile]         = useState<File | null>(null);
  const [priceDollars, setPriceDollars] = useState("10");
  const [title,        setTitle]        = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [generated,    setGenerated]    = useState<GeneratedLink | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [copied,       setCopied]       = useState(false);
  const [dragging,     setDragging]     = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ────────────────────────────────────────────────────────

  const acceptFile = useCallback((f: File) => {
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_MB} MB`);
      return;
    }
    setFile(f);
    setError(null);
    // Auto-fill title from filename if empty
    setTitle(prev => prev || f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  }, [acceptFile]);

  // ── Generate ─────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!file) { setError("Please select a file"); return; }

    const price = parseFloat(priceDollars);
    if (!Number.isFinite(price) || price < 0.50) {
      setError("Minimum price is $0.50");
      return;
    }

    setGenerating(true);
    setError(null);

    const form = new FormData();
    form.append("file",  file);
    form.append("price", priceDollars);
    if (title.trim()) form.append("title", title.trim());

    try {
      const r = await fetch("/api/instant-links", { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Generation failed");
      setGenerated({ id: d.id, url: d.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate link");
    } finally {
      setGenerating(false);
    }
  };

  // ── Copy ─────────────────────────────────────────────────────────────────

  const handleCopy = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      setError("Copy failed — please copy manually");
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────

  const shareText = `Unlock my exclusive content: ${generated?.url ?? ""}`;
  const shares = generated ? [
    {
      label: "Telegram",
      icon:  "✈",
      href:  `https://t.me/share/url?url=${encodeURIComponent(generated.url)}&text=${encodeURIComponent("Unlock my exclusive content")}`,
    },
    {
      label: "WhatsApp",
      icon:  "●",
      href:  `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    {
      label: "Twitter",
      icon:  "𝕏",
      href:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    },
  ] : [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   "fixed",
          inset:      0,
          background: "rgba(2,2,3,0.85)",
          backdropFilter: "blur(6px)",
          zIndex:     1000,
        }}
      />

      {/* Modal */}
      <div style={{
        position:  "fixed",
        top:       "50%",
        left:      "50%",
        transform: "translate(-50%, -50%)",
        zIndex:    1001,
        width:     "min(520px, calc(100vw - 32px))",
        background: "#0c0c18",
        border:    "1px solid rgba(255,255,255,0.09)",
        borderRadius: 10,
        padding:   "36px 32px",
        ...SANS,
        color:     "rgba(255,255,255,0.88)",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div style={{ ...MONO, fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(200,169,110,0.55)", marginBottom: 6 }}>
              Instant Link
            </div>
            <h2 style={{ ...SERIF, fontSize: 26, fontWeight: 300, margin: 0, letterSpacing: "-0.01em" }}>
              Generate Pay Link
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border:     "none",
              color:      DIM,
              cursor:     "pointer",
              fontSize:   18,
              padding:    "2px 6px",
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── Generated state ── */}
        {generated ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Success */}
            <div style={{
              background:   "rgba(80,212,138,0.06)",
              border:       "1px solid rgba(80,212,138,0.18)",
              borderRadius: 6,
              padding:      "14px 16px",
              display:      "flex",
              alignItems:   "center",
              gap:          10,
            }}>
              <span style={{ color: "#50d48a", fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 300 }}>
                Link generated — share it to start earning
              </span>
            </div>

            {/* Link preview + copy */}
            <div>
              <label style={labelStyle}>Your Pay Link</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{
                  flex:         1,
                  ...inputStyle,
                  display:      "flex",
                  alignItems:   "center",
                  overflow:     "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace:   "nowrap",
                  cursor:       "text",
                  userSelect:   "all",
                  fontSize:     12,
                  color:        "rgba(255,255,255,0.6)",
                }}>
                  {generated.url}
                </div>
                <button
                  onClick={handleCopy}
                  style={{
                    padding:       "13px 18px",
                    background:    copied ? "rgba(80,212,138,0.1)" : "rgba(200,169,110,0.1)",
                    border:        `1px solid ${copied ? "rgba(80,212,138,0.3)" : "rgba(200,169,110,0.3)"}`,
                    borderRadius:  4,
                    color:         copied ? "#50d48a" : GOLD,
                    ...MONO,
                    fontSize:      10,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    cursor:        "pointer",
                    flexShrink:    0,
                    transition:    "all 0.15s",
                    whiteSpace:    "nowrap",
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Share buttons */}
            <div>
              <label style={labelStyle}>Share via</label>
              <div style={{ display: "flex", gap: 8 }}>
                {shares.map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex:          1,
                      padding:       "11px 12px",
                      background:    "rgba(255,255,255,0.03)",
                      border:        "1px solid rgba(255,255,255,0.08)",
                      borderRadius:  4,
                      color:         DIM,
                      ...MONO,
                      fontSize:      10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      textAlign:     "center",
                      textDecoration: "none",
                      transition:    "all 0.15s",
                      display:       "flex",
                      flexDirection: "column",
                      alignItems:    "center",
                      gap:           4,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "rgba(200,169,110,0.25)";
                      e.currentTarget.style.color = GOLD;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.color = DIM;
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{s.icon}</span>
                    {s.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Generate another */}
            <button
              onClick={() => { setGenerated(null); setFile(null); setTitle(""); setPriceDollars("10"); }}
              style={{
                background:    "none",
                border:        "1px solid rgba(255,255,255,0.08)",
                borderRadius:  4,
                color:         DIM,
                ...MONO,
                fontSize:      10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding:       "12px",
                cursor:        "pointer",
                width:         "100%",
                transition:    "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,169,110,0.25)"; e.currentTarget.style.color = GOLD; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = DIM; }}
            >
              + Generate Another
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* File upload */}
            <div>
              <label style={labelStyle}>File</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                style={{
                  border:        `1px dashed ${dragging ? GOLD : file ? "rgba(200,169,110,0.35)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius:  6,
                  padding:       "28px 20px",
                  textAlign:     "center",
                  cursor:        "pointer",
                  background:    dragging ? "rgba(200,169,110,0.04)" : file ? "rgba(200,169,110,0.02)" : "rgba(255,255,255,0.015)",
                  transition:    "all 0.15s",
                }}
              >
                {file ? (
                  <>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
                      {file.name}
                    </div>
                    <div style={{ ...MONO, fontSize: 10, color: DIM }}>
                      {(file.size / 1024 / 1024).toFixed(1)} MB · click to change
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 10, color: GOLD, opacity: 0.5 }}>↑</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 300, marginBottom: 4 }}>
                      Drop file here or click to browse
                    </div>
                    <div style={{ ...MONO, fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
                      Image · Video · Audio · PDF · Zip · up to 100 MB
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  onChange={e => { const f = e.target.files?.[0]; if (f) acceptFile(f); }}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {/* Price */}
            <div>
              <label style={labelStyle}>Price (USD)</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position:      "absolute",
                  left:          14,
                  top:           "50%",
                  transform:     "translateY(-50%)",
                  ...MONO,
                  fontSize:      14,
                  color:         DIM,
                  pointerEvents: "none",
                }}>$</span>
                <input
                  type="number"
                  min="0.50"
                  step="0.50"
                  value={priceDollars}
                  onChange={e => setPriceDollars(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 28 }}
                  placeholder="10.00"
                  onFocus={e  => { e.currentTarget.style.borderColor = "rgba(200,169,110,0.4)"; }}
                  onBlur={e   => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                />
              </div>
            </div>

            {/* Title (optional) */}
            <div>
              <label style={labelStyle}>
                Title <span style={{ opacity: 0.45 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Exclusive tutorial, Session recording…"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(200,169,110,0.4)"; }}
                onBlur={e  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background:   "rgba(224,85,85,0.08)",
                border:       "1px solid rgba(224,85,85,0.22)",
                borderRadius: 4,
                padding:      "12px 14px",
                fontSize:     13,
                color:        "#e05555",
              }}>
                {error}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                width:         "100%",
                padding:       "16px",
                background:    generating ? "rgba(200,169,110,0.4)" : GOLD,
                color:         "#0a0800",
                border:        "none",
                borderRadius:  5,
                ...MONO,
                fontSize:      11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight:    500,
                cursor:        generating ? "not-allowed" : "pointer",
                transition:    "opacity 0.15s",
              }}
            >
              {generating ? "Generating…" : "Generate Link"}
            </button>

            <p style={{ ...SANS, fontSize: 11, color: "rgba(255,255,255,0.18)", textAlign: "center", margin: 0, fontWeight: 300 }}>
              Link generates in &lt; 2 seconds · Fans pay, content unlocks instantly
            </p>
          </div>
        )}
      </div>

      <style>{`
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input:focus, textarea:focus { outline: none; }
      `}</style>
    </>
  );
}
