"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface PaymentLink {
  id:                string;
  title:             string;
  description:       string | null;
  price:             number; // cents
  content_type:      "text" | "file";
  content_value:     string | null;
  file_url:          string | null;
  is_active:         boolean;
  view_count:        number;
  purchase_count:    number;
  slug:              string | null;
  whop_checkout_url: string | null;
  is_live:           boolean;
  created_at:        string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style:                 "currency",
    currency:              "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Inline styles ──────────────────────────────────────────────────────────

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" };

const labelStyle: React.CSSProperties = {
  display:       "block",
  ...mono,
  fontSize:      10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color:         "rgba(255,255,255,0.45)",
  marginBottom:  8,
};

const inputStyle: React.CSSProperties = {
  width:        "100%",
  background:   "rgba(255,255,255,0.03)",
  border:       "1px solid rgba(255,255,255,0.09)",
  borderRadius: 3,
  color:        "rgba(255,255,255,0.92)",
  ...mono,
  fontSize:     14,
  padding:      "12px 14px",
  outline:      "none",
  boxSizing:    "border-box",
  transition:   "border-color 0.2s",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize:     "vertical",
  minHeight:  80,
  lineHeight: 1.6,
};

// ── Component ──────────────────────────────────────────────────────────────

export default function PayLinksClient() {
  const [links, setLinks]       = useState<PaymentLink[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [priceDollars, setPriceDollars] = useState("10");
  const [contentType,  setContentType]  = useState<"text" | "file">("text");
  const [contentValue, setContentValue] = useState("");
  const [fileUrl,      setFileUrl]      = useState("");

  // ── Data ────────────────────────────────────────────────────────────────

  const loadLinks = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/payment-links");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setLinks(d.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payment links");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const resetForm = () => {
    setTitle(""); setDescription(""); setPriceDollars("10");
    setContentType("text"); setContentValue(""); setFileUrl("");
    setError(null);
  };

  const handleCreate = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    const priceCents = Math.round(parseFloat(priceDollars) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 50) {
      setError("Minimum price is $0.50");
      return;
    }
    if (contentType === "text" && !contentValue.trim()) {
      setError("Content text is required");
      return;
    }
    if (contentType === "file" && !fileUrl.trim()) {
      setError("File URL is required");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/payment-links", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title:         title.trim(),
          description:   description.trim() || undefined,
          price:         priceCents,
          content_type:  contentType,
          content_value: contentType === "text" ? contentValue.trim() : undefined,
          file_url:      contentType === "file" ? fileUrl.trim()      : undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to create");
      resetForm();
      setShowForm(false);
      await loadLinks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create payment link");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (link: PaymentLink) => {
    const url =
      link.whop_checkout_url ??
      (link.slug ? `${window.location.origin}/pay/${link.slug}` : null);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2200);
    } catch {
      setError("Unable to copy. Please copy manually.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment link? This cannot be undone.")) return;
    try {
      const r = await fetch(`/api/payment-links/${id}`, { method: "DELETE" });
      if (r.ok) setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setError("Failed to delete");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight:  "100vh",
        background: "#020203",
        color:      "rgba(255,255,255,0.92)",
        fontFamily: "var(--font-body, 'Outfit', sans-serif)",
      }}
    >
      {/* Noise overlay */}
      <div
        aria-hidden
        style={{
          position:        "fixed",
          inset:           0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.038'/%3E%3C/svg%3E\")",
          pointerEvents:   "none",
          zIndex:          0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Page Header ── */}
        <div
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.055)",
            padding:      "32px 48px 24px",
          }}
        >
          <div
            style={{
              display:       "flex",
              alignItems:    "center",
              gap:           10,
              marginBottom:  8,
              ...mono,
              fontSize:      10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color:         "#7a6030",
            }}
          >
            <span style={{ display: "block", width: 24, height: 1, background: "#7a6030" }} />
            Monetization
          </div>
          <div
            style={{
              display:        "flex",
              alignItems:     "flex-end",
              justifyContent: "space-between",
              gap:            16,
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily:    "var(--font-display, 'Cormorant Garamond', serif)",
                  fontSize:      "clamp(28px, 4vw, 42px)",
                  fontWeight:    300,
                  letterSpacing: "-0.02em",
                  margin:        0,
                  lineHeight:    1.1,
                }}
              >
                Pay Links
              </h1>
              <p
                style={{
                  fontSize:   13,
                  color:      "rgba(255,255,255,0.42)",
                  margin:     "6px 0 0",
                  fontWeight: 300,
                }}
              >
                Create gated payment links. Fan pays, fan gets the content.
              </p>
            </div>

            <button
              onClick={() => { resetForm(); setShowForm((v) => !v); }}
              style={{
                ...mono,
                fontSize:      10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding:       "12px 20px",
                background:    showForm ? "rgba(200,169,110,0.08)" : "#c8a96e",
                color:         showForm ? "#c8a96e" : "#0a0800",
                border:        showForm ? "1px solid rgba(200,169,110,0.3)" : "none",
                borderRadius:  3,
                cursor:        "pointer",
                flexShrink:    0,
                transition:    "all 0.2s",
              }}
            >
              {showForm ? "Cancel" : "+ New Link"}
            </button>
          </div>
        </div>

        {/* ── Create Form ── */}
        {showForm && (
          <div
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.055)",
              padding:      "32px 48px",
              background:   "rgba(200,169,110,0.025)",
            }}
          >
            <div
              style={{
                maxWidth: 640,
                display:  "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* Title */}
              <div>
                <label style={labelStyle}>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Exclusive tutorial, 1:1 session recording…"
                  style={inputStyle}
                />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description <span style={{ opacity: 0.45 }}>(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What the fan receives after payment…"
                  style={textareaStyle}
                />
              </div>

              {/* Price */}
              <div>
                <label style={labelStyle}>Price (USD)</label>
                <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                  <span
                    style={{
                      position:   "absolute",
                      left:       14,
                      top:        "50%",
                      transform:  "translateY(-50%)",
                      ...mono,
                      fontSize:   14,
                      color:      "rgba(255,255,255,0.35)",
                      pointerEvents: "none",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    min="0.50"
                    step="0.50"
                    value={priceDollars}
                    onChange={(e) => setPriceDollars(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 28 }}
                    placeholder="10.00"
                  />
                </div>
              </div>

              {/* Content type toggle */}
              <div>
                <label style={labelStyle}>Content Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["text", "file"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setContentType(type)}
                      style={{
                        flex:          1,
                        padding:       "11px 16px",
                        background:    contentType === type ? "rgba(200,169,110,0.08)" : "rgba(255,255,255,0.02)",
                        border:        `1px solid ${contentType === type ? "rgba(200,169,110,0.3)" : "rgba(255,255,255,0.07)"}`,
                        borderRadius:  3,
                        color:         contentType === type ? "#c8a96e" : "rgba(255,255,255,0.45)",
                        ...mono,
                        fontSize:      10,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        cursor:        "pointer",
                        transition:    "all 0.15s",
                      }}
                    >
                      {type === "text" ? "◈ Text / Video URL" : "◪ File Upload"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content value */}
              {contentType === "text" ? (
                <div>
                  <label style={labelStyle}>Content</label>
                  <textarea
                    value={contentValue}
                    onChange={(e) => setContentValue(e.target.value)}
                    placeholder="Paste text, video URL, or any content the fan will unlock…"
                    style={{ ...textareaStyle, minHeight: 100 }}
                  />
                </div>
              ) : (
                <div>
                  <label style={labelStyle}>File URL</label>
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://…"
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  style={{
                    background:   "rgba(224,85,85,0.08)",
                    border:       "1px solid rgba(224,85,85,0.22)",
                    borderRadius: 4,
                    padding:      "12px 14px",
                    fontSize:     13,
                    color:        "#e05555",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  background:    creating ? "rgba(200,169,110,0.4)" : "#c8a96e",
                  color:         "#0a0800",
                  ...mono,
                  fontSize:      11,
                  fontWeight:    500,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  padding:       "15px 28px",
                  border:        "none",
                  borderRadius:  3,
                  cursor:        creating ? "not-allowed" : "pointer",
                  transition:    "opacity 0.2s",
                  alignSelf:     "flex-start",
                }}
              >
                {creating ? "Creating…" : "Create Payment Link"}
              </button>
            </div>
          </div>
        )}

        {/* ── Links List ── */}
        <div style={{ padding: "32px 48px" }}>
          {loading ? (
            <div
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                height:         200,
                ...mono,
                fontSize:       11,
                color:          "#7a6030",
                letterSpacing:  "0.2em",
              }}
            >
              Loading…
            </div>
          ) : links.length === 0 ? (
            <div
              style={{
                textAlign:    "center",
                padding:      "64px 24px",
                background:   "rgba(255,255,255,0.015)",
                border:       "1px dashed rgba(255,255,255,0.07)",
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  fontFamily:   "var(--font-display, 'Cormorant Garamond', serif)",
                  fontSize:     22,
                  fontWeight:   300,
                  color:        "rgba(255,255,255,0.28)",
                  marginBottom: 8,
                }}
              >
                No payment links yet
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.18)", fontWeight: 300 }}>
                Click <em>+ New Link</em> to create your first gated pay link
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Table header */}
              <div
                style={{
                  display:             "grid",
                  gridTemplateColumns: "1fr 100px 80px 80px 200px 80px",
                  gap:                 16,
                  padding:             "0 20px 10px",
                  ...mono,
                  fontSize:            9,
                  letterSpacing:       "0.2em",
                  textTransform:       "uppercase",
                  color:               "rgba(255,255,255,0.25)",
                }}
              >
                <span>Title</span>
                <span>Price</span>
                <span>Views</span>
                <span>Sales</span>
                <span>Link</span>
                <span></span>
              </div>

              {links.map((link) => {
                const payUrl =
                  link.whop_checkout_url ??
                  (link.slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${link.slug}` : null);
                const isCopied = copiedId === link.id;

                return (
                  <div
                    key={link.id}
                    style={{
                      display:             "grid",
                      gridTemplateColumns: "1fr 100px 80px 80px 200px 80px",
                      gap:                 16,
                      alignItems:          "center",
                      background:          "#0f0f1e",
                      border:              "1px solid rgba(255,255,255,0.055)",
                      borderRadius:        8,
                      padding:             "18px 20px",
                      position:            "relative",
                      overflow:            "hidden",
                    }}
                  >
                    {/* Top accent line */}
                    <div
                      aria-hidden
                      style={{
                        position:   "absolute",
                        top:        0,
                        left:       "15%",
                        right:      "15%",
                        height:     1,
                        background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.2), transparent)",
                      }}
                    />

                    {/* Title + meta */}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize:     13,
                          fontWeight:   400,
                          color:        "rgba(255,255,255,0.88)",
                          overflow:     "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace:   "nowrap",
                          marginBottom: 4,
                        }}
                      >
                        {link.title}
                      </div>
                      <div
                        style={{
                          display:    "flex",
                          alignItems: "center",
                          gap:        8,
                          ...mono,
                          fontSize:   9,
                          color:      "rgba(255,255,255,0.25)",
                        }}
                      >
                        <span
                          style={{
                            padding:      "2px 6px",
                            border:       "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 2,
                          }}
                        >
                          {link.content_type}
                        </span>
                        <span>{ago(link.created_at)}</span>
                        {link.is_live && (
                          <span style={{ color: "#50d48a" }}>● live</span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div
                      style={{
                        ...mono,
                        fontSize:      13,
                        color:         "#c8a96e",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {fmtCents(link.price)}
                    </div>

                    {/* Views */}
                    <div
                      style={{
                        ...mono,
                        fontSize: 13,
                        color:    "rgba(255,255,255,0.5)",
                      }}
                    >
                      {link.view_count}
                    </div>

                    {/* Sales */}
                    <div
                      style={{
                        ...mono,
                        fontSize: 13,
                        color:    link.purchase_count > 0 ? "#50d48a" : "rgba(255,255,255,0.35)",
                      }}
                    >
                      {link.purchase_count}
                    </div>

                    {/* Pay URL */}
                    <div style={{ minWidth: 0 }}>
                      {payUrl ? (
                        <div
                          style={{
                            ...mono,
                            fontSize:     11,
                            color:        "rgba(255,255,255,0.32)",
                            overflow:     "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace:   "nowrap",
                          }}
                        >
                          {payUrl.replace(/^https?:\/\//, "")}
                        </div>
                      ) : (
                        <span style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                          provisioning…
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {payUrl && (
                        <button
                          onClick={() => handleCopy(link)}
                          style={{
                            background:    isCopied ? "rgba(80,212,138,0.1)" : "rgba(200,169,110,0.1)",
                            border:        `1px solid ${isCopied ? "rgba(80,212,138,0.25)" : "rgba(200,169,110,0.25)"}`,
                            borderRadius:  3,
                            color:         isCopied ? "#50d48a" : "#c8a96e",
                            ...mono,
                            fontSize:      9,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            padding:       "6px 10px",
                            cursor:        "pointer",
                            transition:    "all 0.2s",
                            whiteSpace:    "nowrap",
                          }}
                        >
                          {isCopied ? "Copied!" : "Copy"}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(link.id)}
                        style={{
                          background:    "transparent",
                          border:        "1px solid rgba(255,255,255,0.07)",
                          borderRadius:  3,
                          color:         "rgba(255,255,255,0.22)",
                          ...mono,
                          fontSize:      9,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          padding:       "6px 8px",
                          cursor:        "pointer",
                          transition:    "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color       = "#e05555";
                          e.currentTarget.style.borderColor = "rgba(224,85,85,0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color       = "rgba(255,255,255,0.22)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input:focus, textarea:focus { border-color: rgba(200,169,110,0.4) !important; }
      `}</style>
    </div>
  );
}
