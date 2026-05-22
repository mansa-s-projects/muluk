"use client";

import { useState, useEffect, useCallback } from "react";
import {
  calculateRateCardPrices,
  formatPrice,
  formatFollowers,
  NICHES,
  CONTENT_TYPES,
  type RateCardInputs,
  type RateCardPrices,
  type NicheValue,
  type ContentTypeValue,
} from "@/lib/rate-card-pricing";

// ── Types ──────────────────────────────────────────────────────────────────

interface SavedCard {
  id:         string;
  slug:       string | null;
  title:      string | null;
  is_public:  boolean;
  view_count: number;
  created_at: string;
}

interface Props {
  savedCard:   SavedCard | null;
  savedPrices: RateCardPrices | null;
  savedStats:  RateCardInputs | null;
}

type EditablePriceKey = keyof RateCardPrices;

const PRICE_LABELS: Record<EditablePriceKey, string> = {
  brandDealPrice:    "Brand Deal",
  storyPostPrice:    "Story / Reel Post",
  sessionPrice:      "1:1 Session",
  subscriptionPrice: "Monthly Subscription",
};

const PRICE_DESCRIPTIONS: Record<EditablePriceKey, string> = {
  brandDealPrice:    "Sponsored feed post or integration",
  storyPostPrice:    "24-hour story or short reel mention",
  sessionPrice:      "One-hour coaching or strategy call",
  subscriptionPrice: "Recurring fan membership per month",
};

const PRICE_ICONS: Record<EditablePriceKey, string> = {
  brandDealPrice:    "◈",
  storyPostPrice:    "◉",
  sessionPrice:      "◎",
  subscriptionPrice: "◌",
};

const FOLLOWER_PRESETS = [
  { label: "1K",   value: 1_000 },
  { label: "5K",   value: 5_000 },
  { label: "10K",  value: 10_000 },
  { label: "50K",  value: 50_000 },
  { label: "100K", value: 100_000 },
  { label: "500K", value: 500_000 },
  { label: "1M",   value: 1_000_000 },
];

const DEFAULT_INPUTS: RateCardInputs = {
  followers:      50_000,
  engagementRate: 3.5,
  niche:          "lifestyle",
  contentType:    "video",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function RateCardClient({ savedCard, savedPrices, savedStats }: Props) {
  const [inputs, setInputs] = useState<RateCardInputs>(savedStats ?? DEFAULT_INPUTS);
  const [livePrice, setLivePrice] = useState<RateCardPrices>(
    savedPrices ?? calculateRateCardPrices(savedStats ?? DEFAULT_INPUTS)
  );

  // Published card state
  const [card, setCard]         = useState<SavedCard | null>(savedCard);
  const [prices, setPrices]     = useState<RateCardPrices | null>(savedPrices);

  // UI states
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const [editingKey, setEditingKey]     = useState<EditablePriceKey | null>(null);
  const [editValue, setEditValue]       = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Live calculation as inputs change
  useEffect(() => {
    setLivePrice(calculateRateCardPrices(inputs));
  }, [inputs]);

  const publicUrl = card?.slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${card.slug}`
    : null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/rate-card/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          followers:      inputs.followers,
          engagementRate: inputs.engagementRate,
          niche:          inputs.niche,
          contentType:    inputs.contentType,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");

      const rc = json.rateCard;
      setCard({
        id:         rc.id,
        slug:       rc.slug,
        title:      rc.title,
        is_public:  rc.is_public,
        view_count: rc.view_count,
        created_at: rc.created_at,
      });
      setPrices({
        brandDealPrice:    rc.brand_deal_price    / 100,
        storyPostPrice:    rc.story_post_price    / 100,
        sessionPrice:      rc.session_price       / 100,
        subscriptionPrice: rc.subscription_price  / 100,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }, [inputs]);

  const handleCopyLink = useCallback(async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      console.error("[rate-card] clipboard copy failed", error);
      setError("Unable to copy link. Please copy it manually.");
    }
  }, [publicUrl]);

  const startEdit = (key: EditablePriceKey) => {
    if (!prices) return;
    setEditingKey(key);
    const current = prices[key];
    setEditValue(
      key === "subscriptionPrice"
        ? current.toFixed(2)
        : String(Math.round(current))
    );
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const saveEdit = useCallback(async () => {
    if (!editingKey || !card?.slug || !prices) return;
    const newVal = parseFloat(editValue);
    if (isNaN(newVal) || newVal < 0) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/rate-card/${card.slug}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ [editingKey]: newVal }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");

      const rc = json.rateCard;
      setPrices({
        brandDealPrice:    rc.brand_deal_price    / 100,
        storyPostPrice:    rc.story_post_price    / 100,
        sessionPrice:      rc.session_price       / 100,
        subscriptionPrice: rc.subscription_price  / 100,
      });
      setEditingKey(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingKey, editValue, card?.slug, prices]);

  // ── Render helpers ─────────────────────────────────────────────────────
  const priceDecimals = (key: EditablePriceKey) =>
    key === "subscriptionPrice" ? 2 : 0;

  const displayPrice = (key: EditablePriceKey, val: number) =>
    formatPrice(val, priceDecimals(key));

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight:       "100vh",
        background:      "#020203",
        fontFamily:      "var(--font-body, 'Outfit', sans-serif)",
        color:           "rgba(255,255,255,0.92)",
        padding:         "0",
        position:        "relative",
      }}
    >
      {/* Noise overlay */}
      <div
        style={{
          position:    "fixed",
          inset:       0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.038'/%3E%3C/svg%3E\")",
          pointerEvents: "none",
          zIndex:        0,
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
              display:        "flex",
              alignItems:     "center",
              gap:            10,
              marginBottom:   8,
              fontFamily:     "var(--font-mono, 'DM Mono', monospace)",
              fontSize:       10,
              letterSpacing:  "0.28em",
              textTransform:  "uppercase",
              color:          "#7a6030",
            }}
          >
            <span style={{ display: "block", width: 24, height: 1, background: "#7a6030" }} />
            Rate Card Generator
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
            <div>
              <h1
                style={{
                  fontFamily:   "var(--font-display, 'Cormorant Garamond', serif)",
                  fontSize:     "clamp(28px, 4vw, 42px)",
                  fontWeight:   300,
                  letterSpacing: "-0.02em",
                  margin:       0,
                  lineHeight:   1.1,
                }}
              >
                Your Rate Card
              </h1>
              <p
                style={{
                  fontSize:  13,
                  color:     "rgba(255,255,255,0.42)",
                  margin:    "6px 0 0",
                  fontWeight: 300,
                }}
              >
                Auto-calculated from your audience data. Edit any price after generation.
              </p>
            </div>

            {card?.view_count !== undefined && card.view_count > 0 && (
              <div
                style={{
                  background:   "rgba(200,169,110,0.08)",
                  border:       "1px solid rgba(200,169,110,0.18)",
                  borderRadius: 100,
                  padding:      "6px 14px",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          8,
                  flexShrink:   0,
                }}
              >
                <span
                  style={{
                    fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                    fontSize:      10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color:         "#c8a96e",
                  }}
                >
                  {card.view_count} views
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Two-panel body ── */}
        <div
          style={{
            display:            "grid",
            gridTemplateColumns: "minmax(320px, 440px) 1fr",
            gap:                0,
            minHeight:          "calc(100vh - 130px)",
          }}
        >
          {/* ── LEFT: Input form ── */}
          <div
            style={{
              borderRight: "1px solid rgba(255,255,255,0.055)",
              padding:     "36px 40px",
              overflowY:   "auto",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {/* Followers */}
              <div>
                <label style={labelStyle}>Followers</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {FOLLOWER_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setInputs((s) => ({ ...s, followers: p.value }))}
                      style={{
                        ...presetBtnStyle,
                        ...(inputs.followers === p.value ? presetBtnActive : {}),
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={0}
                  max={500_000_000}
                  value={inputs.followers}
                  onChange={(e) =>
                    setInputs((s) => ({
                      ...s,
                      followers: Math.max(0, parseInt(e.target.value, 10) || 0),
                    }))
                  }
                  style={inputStyle}
                  placeholder="e.g. 150000"
                />
                <div style={hintStyle}>
                  {formatFollowers(inputs.followers)} followers
                </div>
              </div>

              {/* Engagement rate */}
              <div>
                <label style={labelStyle}>
                  Engagement Rate
                  <span
                    style={{
                      marginLeft:    8,
                      fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                      fontSize:      11,
                      color:         engRateColor(inputs.engagementRate),
                      letterSpacing: "0.1em",
                    }}
                  >
                    {inputs.engagementRate.toFixed(1)}% — {engRateLabel(inputs.engagementRate)}
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={0.1}
                  value={inputs.engagementRate}
                  onChange={(e) =>
                    setInputs((s) => ({ ...s, engagementRate: parseFloat(e.target.value) }))
                  }
                  style={sliderStyle}
                />
                <div
                  style={{
                    display:        "flex",
                    justifyContent: "space-between",
                    fontFamily:     "var(--font-mono, 'DM Mono', monospace)",
                    fontSize:       10,
                    color:          "rgba(255,255,255,0.22)",
                    letterSpacing:  "0.1em",
                    marginTop:      6,
                  }}
                >
                  <span>0%</span>
                  <span>5%</span>
                  <span>10%</span>
                  <span>20%</span>
                </div>
              </div>

              {/* Niche */}
              <div>
                <label style={labelStyle}>Niche</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {NICHES.map((n) => (
                    <button
                      key={n.value}
                      onClick={() => setInputs((s) => ({ ...s, niche: n.value as NicheValue }))}
                      style={{
                        ...nicheBtnStyle,
                        ...(inputs.niche === n.value ? nicheBtnActive : {}),
                      }}
                    >
                      <span style={{ fontWeight: 400 }}>{n.label}</span>
                      <span
                        style={{
                          fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                          fontSize:      9,
                          color:         inputs.niche === n.value ? "#a88848" : "rgba(255,255,255,0.22)",
                          letterSpacing: "0.12em",
                        }}
                      >
                        {n.multiplier >= 1.2 ? "premium" : n.multiplier >= 1.0 ? "standard" : "value"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content type */}
              <div>
                <label style={labelStyle}>Content Format</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {CONTENT_TYPES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setInputs((s) => ({ ...s, contentType: c.value as ContentTypeValue }))}
                      style={{
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "space-between",
                        padding:        "12px 16px",
                        background:     inputs.contentType === c.value
                          ? "rgba(200,169,110,0.07)"
                          : "rgba(255,255,255,0.02)",
                        border:         `1px solid ${inputs.contentType === c.value ? "rgba(200,169,110,0.3)" : "rgba(255,255,255,0.07)"}`,
                        borderRadius:   4,
                        cursor:         "pointer",
                        transition:     "all 0.15s",
                        color:          inputs.contentType === c.value ? "#c8a96e" : "rgba(255,255,255,0.6)",
                        fontSize:       13,
                        textAlign:      "left",
                        width:          "100%",
                      }}
                    >
                      <span>{c.label}</span>
                      <span
                        style={{
                          fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                          fontSize:      9,
                          letterSpacing: "0.12em",
                          color:         inputs.contentType === c.value ? "#7a6030" : "rgba(255,255,255,0.2)",
                        }}
                      >
                        ×{c.multiplier.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  style={{
                    background:   "rgba(224,85,85,0.08)",
                    border:       "1px solid rgba(224,85,85,0.22)",
                    borderRadius: 4,
                    padding:      "12px 16px",
                    fontSize:     13,
                    color:        "#e05555",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                style={{
                  background:    isGenerating ? "rgba(200,169,110,0.4)" : "#c8a96e",
                  color:         "#0a0800",
                  fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                  fontSize:      11,
                  fontWeight:    500,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  padding:       "16px 28px",
                  border:        "none",
                  borderRadius:  3,
                  cursor:        isGenerating ? "not-allowed" : "pointer",
                  transition:    "opacity 0.2s, transform 0.15s",
                  width:         "100%",
                  transform:     isGenerating ? "scale(0.99)" : "scale(1)",
                }}
              >
                {isGenerating
                  ? "Calculating…"
                  : card
                  ? "Regenerate Rate Card"
                  : "Generate Rate Card"}
              </button>
            </div>
          </div>

          {/* ── RIGHT: Live preview & published card ── */}
          <div style={{ padding: "36px 48px", overflowY: "auto" }}>
            {/* Live preview header */}
            <div
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                marginBottom:   28,
              }}
            >
              <div>
                <div style={eyebrowStyle}>Live Preview</div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: 0, fontWeight: 300 }}>
                  Updates in real-time as you adjust inputs
                </p>
              </div>
              {prices && (
                <div
                  style={{
                    fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                    fontSize:      9,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color:         "#50d48a",
                    background:    "rgba(80,212,138,0.08)",
                    border:        "1px solid rgba(80,212,138,0.2)",
                    borderRadius:  100,
                    padding:       "5px 12px",
                  }}
                >
                  Published
                </div>
              )}
            </div>

            {/* Pricing cards grid */}
            <div
              style={{
                display:             "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap:                 16,
                marginBottom:        32,
              }}
            >
              {(Object.keys(PRICE_LABELS) as EditablePriceKey[]).map((key, i) => {
                const liveVal      = livePrice[key];
                const publishedVal = prices?.[key];
                const isEditing    = editingKey === key;
                const delays       = ["0s", "0.06s", "0.12s", "0.18s"];

                return (
                  <div
                    key={key}
                    style={{
                      background:    "#0f0f1e",
                      border:        "1px solid rgba(255,255,255,0.055)",
                      borderRadius:  10,
                      padding:       "22px 24px",
                      position:      "relative",
                      overflow:      "hidden",
                      animation:     `fadeIn 0.4s ease ${delays[i]} both`,
                      transition:    "border-color 0.2s",
                    }}
                  >
                    {/* Top gold line */}
                    <div
                      style={{
                        position:   "absolute",
                        top:        0,
                        left:       "20%",
                        right:      "20%",
                        height:     1,
                        background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.4), transparent)",
                      }}
                    />

                    {/* Icon + label */}
                    <div
                      style={{
                        display:       "flex",
                        alignItems:    "center",
                        gap:           10,
                        marginBottom:  14,
                      }}
                    >
                      <span style={{ fontSize: 16, color: "#7a6030" }}>{PRICE_ICONS[key]}</span>
                      <div>
                        <div
                          style={{
                            fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                            fontSize:      9,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            color:         "rgba(255,255,255,0.45)",
                          }}
                        >
                          {PRICE_LABELS[key]}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 2, fontWeight: 300 }}>
                          {PRICE_DESCRIPTIONS[key]}
                        </div>
                      </div>
                    </div>

                    {/* Price display */}
                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <input
                          type="number"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          style={{
                            background:   "rgba(255,255,255,0.04)",
                            border:       "1px solid rgba(200,169,110,0.4)",
                            borderRadius: 4,
                            color:        "rgba(255,255,255,0.92)",
                            fontFamily:   "var(--font-mono, 'DM Mono', monospace)",
                            fontSize:     22,
                            fontWeight:   400,
                            padding:      "8px 12px",
                            outline:      "none",
                            width:        "100%",
                            boxSizing:    "border-box",
                          }}
                          placeholder="0"
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={saveEdit}
                            disabled={isSavingEdit}
                            style={{
                              flex:          1,
                              background:    "#c8a96e",
                              color:         "#0a0800",
                              border:        "none",
                              borderRadius:  3,
                              fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                              fontSize:      10,
                              letterSpacing: "0.15em",
                              textTransform: "uppercase",
                              padding:       "9px",
                              cursor:        "pointer",
                            }}
                          >
                            {isSavingEdit ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{
                              flex:          1,
                              background:    "transparent",
                              color:         "rgba(255,255,255,0.45)",
                              border:        "1px solid rgba(255,255,255,0.07)",
                              borderRadius:  3,
                              fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                              fontSize:      10,
                              letterSpacing: "0.15em",
                              textTransform: "uppercase",
                              padding:       "9px",
                              cursor:        "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {/* Published price (if exists) */}
                        {publishedVal !== undefined ? (
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                            <span
                              style={{
                                fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                                fontSize:      30,
                                fontWeight:    400,
                                color:         "rgba(255,255,255,0.92)",
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {displayPrice(key, publishedVal)}
                            </span>
                            {key === "subscriptionPrice" && (
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>/mo</span>
                            )}
                          </div>
                        ) : (
                          // Live preview (not published yet)
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                            <span
                              style={{
                                fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                                fontSize:      30,
                                fontWeight:    400,
                                color:         "rgba(200,169,110,0.6)",
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {displayPrice(key, liveVal)}
                            </span>
                            {key === "subscriptionPrice" && (
                              <span style={{ fontSize: 11, color: "rgba(200,169,110,0.3)" }}>/mo</span>
                            )}
                          </div>
                        )}

                        {/* Show live vs published diff */}
                        {publishedVal !== undefined && Math.abs(liveVal - publishedVal) > 0.01 && (
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginBottom: 8 }}>
                            Live calc:{" "}
                            <span style={{ color: "rgba(200,169,110,0.55)" }}>
                              {displayPrice(key, liveVal)}
                            </span>
                          </div>
                        )}

                        {/* Edit button (only if card published) */}
                        {prices && (
                          <button
                            onClick={() => startEdit(key)}
                            style={{
                              background:    "transparent",
                              border:        "1px solid rgba(255,255,255,0.07)",
                              borderRadius:  3,
                              color:         "rgba(255,255,255,0.38)",
                              fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                              fontSize:      9,
                              letterSpacing: "0.15em",
                              textTransform: "uppercase",
                              padding:       "5px 10px",
                              cursor:        "pointer",
                              transition:    "color 0.15s, border-color 0.15s",
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Share panel */}
            {card && publicUrl && (
              <div
                style={{
                  background:   "#0f0f1e",
                  border:       "1px solid rgba(200,169,110,0.15)",
                  borderRadius: 10,
                  padding:      "24px 28px",
                  position:     "relative",
                  overflow:     "hidden",
                }}
              >
                <div
                  style={{
                    position:   "absolute",
                    top:        0,
                    left:       0,
                    right:      0,
                    height:     1,
                    background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.3), transparent)",
                  }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div
                    style={{
                      width:          8,
                      height:         8,
                      borderRadius:   "50%",
                      background:     "#50d48a",
                      boxShadow:      "0 0 8px rgba(80,212,138,0.5)",
                      flexShrink:     0,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                        fontSize:      10,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color:         "#50d48a",
                      }}
                    >
                      Public Rate Card
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2, fontWeight: 300 }}>
                      Share this link with brands and partners
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display:      "flex",
                    gap:          10,
                    alignItems:   "center",
                  }}
                >
                  <div
                    style={{
                      flex:         1,
                      background:   "rgba(255,255,255,0.03)",
                      border:       "1px solid rgba(255,255,255,0.09)",
                      borderRadius: 3,
                      padding:      "11px 14px",
                      fontFamily:   "var(--font-mono, 'DM Mono', monospace)",
                      fontSize:     12,
                      color:        "rgba(255,255,255,0.55)",
                      overflow:     "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace:   "nowrap",
                    }}
                  >
                    {publicUrl}
                  </div>

                  <button
                    onClick={handleCopyLink}
                    style={{
                      background:    copied ? "rgba(80,212,138,0.12)" : "#c8a96e",
                      color:         copied ? "#50d48a" : "#0a0800",
                      border:        copied ? "1px solid rgba(80,212,138,0.3)" : "none",
                      borderRadius:  3,
                      fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                      fontSize:      10,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      padding:       "12px 18px",
                      cursor:        "pointer",
                      transition:    "all 0.2s",
                      flexShrink:    0,
                      whiteSpace:    "nowrap",
                    }}
                  >
                    {copied ? "Copied!" : "Copy Link"}
                  </button>

                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background:    "transparent",
                      color:         "rgba(255,255,255,0.45)",
                      border:        "1px solid rgba(255,255,255,0.09)",
                      borderRadius:  3,
                      fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
                      fontSize:      10,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      padding:       "12px 18px",
                      cursor:        "pointer",
                      textDecoration: "none",
                      flexShrink:    0,
                      transition:    "color 0.2s, border-color 0.2s",
                    }}
                  >
                    Preview
                  </a>
                </div>
              </div>
            )}

            {!card && (
              <div
                style={{
                  textAlign:    "center",
                  padding:      "48px 24px",
                  background:   "rgba(255,255,255,0.015)",
                  border:       "1px dashed rgba(255,255,255,0.07)",
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    fontFamily:   "var(--font-display, 'Cormorant Garamond', serif)",
                    fontSize:     20,
                    fontWeight:   300,
                    color:        "rgba(255,255,255,0.3)",
                    marginBottom: 8,
                  }}
                >
                  Configure your inputs
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", fontWeight: 300 }}>
                  Click <em>Generate Rate Card</em> to publish and get your shareable link
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 3px;
          background: rgba(255,255,255,0.07);
          border-radius: 100px;
          outline: none;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #c8a96e;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(200,169,110,0.4);
          transition: transform 0.15s;
        }
        input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.2); }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  );
}

// ── Inline styles ──────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display:       "block",
  fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
  fontSize:      10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color:         "rgba(255,255,255,0.45)",
  marginBottom:  10,
};

const hintStyle: React.CSSProperties = {
  fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
  fontSize:      11,
  color:         "rgba(255,255,255,0.28)",
  marginTop:     8,
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width:          "100%",
  background:     "rgba(255,255,255,0.03)",
  border:         "1px solid rgba(255,255,255,0.09)",
  borderRadius:   3,
  color:          "rgba(255,255,255,0.92)",
  fontFamily:     "var(--font-mono, 'DM Mono', monospace)",
  fontSize:       15,
  fontWeight:     400,
  padding:        "13px 16px",
  outline:        "none",
  boxSizing:      "border-box",
  transition:     "border-color 0.2s",
};

const sliderStyle: React.CSSProperties = {
  width:      "100%",
  margin:     0,
  background: "transparent",
};

const presetBtnStyle: React.CSSProperties = {
  background:    "rgba(255,255,255,0.03)",
  border:        "1px solid rgba(255,255,255,0.07)",
  borderRadius:  3,
  color:         "rgba(255,255,255,0.45)",
  fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
  fontSize:      10,
  letterSpacing: "0.1em",
  padding:       "5px 10px",
  cursor:        "pointer",
  transition:    "all 0.15s",
};

const presetBtnActive: React.CSSProperties = {
  background:    "rgba(200,169,110,0.1)",
  border:        "1px solid rgba(200,169,110,0.35)",
  color:         "#c8a96e",
};

const nicheBtnStyle: React.CSSProperties = {
  display:        "flex",
  flexDirection:  "column",
  alignItems:     "flex-start",
  gap:            3,
  padding:        "10px 12px",
  background:     "rgba(255,255,255,0.02)",
  border:         "1px solid rgba(255,255,255,0.06)",
  borderRadius:   4,
  cursor:         "pointer",
  transition:     "all 0.15s",
  color:          "rgba(255,255,255,0.55)",
  fontSize:       12,
  textAlign:      "left",
  width:          "100%",
};

const nicheBtnActive: React.CSSProperties = {
  background: "rgba(200,169,110,0.06)",
  border:     "1px solid rgba(200,169,110,0.25)",
  color:      "#c8a96e",
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
  fontSize:      10,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color:         "#7a6030",
  marginBottom:  4,
};

// ── Utility ────────────────────────────────────────────────────────────────

function engRateLabel(r: number): string {
  if (r >= 6)  return "Excellent";
  if (r >= 4)  return "Strong";
  if (r >= 2)  return "Average";
  if (r >= 1)  return "Low";
  return "Very Low";
}

function engRateColor(r: number): string {
  if (r >= 6)  return "#50d48a";
  if (r >= 4)  return "#c8a96e";
  if (r >= 2)  return "rgba(255,255,255,0.55)";
  return "#e05555";
}
