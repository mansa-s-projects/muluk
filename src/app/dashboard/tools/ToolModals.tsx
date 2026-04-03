"use client";

import { useState, useEffect, useRef, useId } from "react";
import { createClient } from "@/lib/supabase/client";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display)" };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// ─── Shared Modal Shell ────────────────────────────────────────────────────────
function Modal({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  const titleId = useId();

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
    >
      <div style={{ width: "100%", maxWidth: "580px", maxHeight: "80vh", overflowY: "auto", background: "#0d0d18", border: "1px solid rgba(200,169,110,0.3)", borderRadius: "12px", padding: "28px", position: "relative" }}>
        <button
          aria-label="Close"
          onClick={onClose}
          style={{ position: "absolute", top: "16px", right: "16px", background: "transparent", border: "none", color: "var(--dim)", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}
        >×</button>
        <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", color: "var(--gold-dim)", marginBottom: "4px" }}>CREATOR TOOL</div>
        <div id={titleId} style={{ ...disp, fontSize: "32px", color: "var(--gold)", marginBottom: sub ? "4px" : "20px" }}>{title}</div>
        {sub && <div style={{ fontSize: "13px", color: "var(--dim)", marginBottom: "20px" }}>{sub}</div>}
        {children}
      </div>
    </div>
  );
}

// ─── Bio Generator ─────────────────────────────────────────────────────────────
export function BioGeneratorModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("luxury");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [bios, setBios] = useState<string[]>([]);
  const [selectedBio, setSelectedBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const generationControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      generationControllerRef.current?.abort();
      generationControllerRef.current = null;
    };
  }, []);

  const generate = async () => {
    if (!keywords.trim()) { setMsg("Enter at least one keyword."); return; }
    generationControllerRef.current?.abort();
    const controller = new AbortController();
    generationControllerRef.current = controller;

    setLoading(true);
    setOutput("");
    setBios([]);
    setSelectedBio("");
    setMsg("");
    try {
      const res = await fetch("/api/tools/bio", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: keywords.trim(), category }),
      });
      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      while (true) {
        if (controller.signal.aborted) break;
        const { value, done } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) break;
        const chunk = dec.decode(value, { stream: true });
        full += chunk;
        setOutput(full);
      }
      if (controller.signal.aborted) return;
      // Parse the 3 bios
      const parsed: string[] = [];
      const linesArr = full.split("\n");
      for (const line of linesArr) {
        const m = line.match(/^BIO_\d+:\s*(.+)/);
        if (m) parsed.push(m[1].trim());
      }
      if (parsed.length === 0) parsed.push(full.trim());
      setBios(parsed);
      setSelectedBio(parsed[0] ?? "");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setMsg("Generation canceled.");
        return;
      }
      setMsg("Generation failed. Try again.");
    } finally {
      if (generationControllerRef.current === controller) {
        generationControllerRef.current = null;
      }
      setLoading(false);
    }
  };

  const saveBio = async () => {
    if (!selectedBio) return;
    setSaving(true);
    setMsg("");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("creator_applications")
        .upsert({ user_id: userId, bio: selectedBio }, { onConflict: "user_id" });
      if (error) throw error;
      setMsg("Bio saved to your profile.");
    } catch {
      setMsg("Could not save — check DB.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = { background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px", width: "100%", fontSize: "13px" };

  return (
    <Modal title="Bio Generator" sub="AI writes your creator bio from keywords" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", marginBottom: "10px" }}>
        <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="e.g. dark luxury, mystery, high fashion" style={inputStyle} onKeyDown={e => { if (e.key === "Enter") generate(); }} />
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="luxury">Luxury</option>
          <option value="fitness">Fitness</option>
          <option value="music">Music</option>
          <option value="fashion">Fashion</option>
          <option value="art">Art</option>
        </select>
      </div>
      <button onClick={generate} disabled={loading} style={{ border: "none", borderRadius: "6px", padding: "10px 16px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", marginBottom: "16px" }}>
        {loading ? "GENERATING..." : "GENERATE 3 BIOS"}
      </button>

      {bios.length > 0 && (
        <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
          {bios.map((bio, i) => (
            <div
              key={i}
              onClick={() => setSelectedBio(bio)}
              style={{ border: `1px solid ${selectedBio === bio ? "var(--gold)" : "rgba(255,255,255,0.08)"}`, borderRadius: "8px", padding: "12px", cursor: "pointer", background: selectedBio === bio ? "rgba(200,169,110,0.08)" : "rgba(255,255,255,0.02)", transition: "all 0.15s" }}
            >
              <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>VARIATION {i + 1}</div>
              <div style={{ fontSize: "13px", color: "var(--white)", lineHeight: 1.6 }}>{bio}</div>
            </div>
          ))}
        </div>
      )}

      {loading && !bios.length && (
        <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "12px", fontSize: "13px", color: "var(--dim)", lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: "60px" }}>
          {output || "Writing..."}
        </div>
      )}

      {bios.length > 0 && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={saveBio} disabled={saving || !selectedBio} style={{ border: "none", borderRadius: "6px", padding: "10px 16px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
            {saving ? "SAVING..." : "USE THIS BIO"}
          </button>
          <button onClick={generate} disabled={loading} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "10px 16px", background: "transparent", color: "var(--dim)", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
            REGENERATE
          </button>
        </div>
      )}

      {msg && <div style={{ marginTop: "10px", fontSize: "12px", color: msg.includes("saved") ? "var(--gold)" : "#ff6a6a" }}>{msg}</div>}
    </Modal>
  );
}

// ─── Caption Generator ─────────────────────────────────────────────────────────
export function CaptionGeneratorModal({ onClose }: { onClose: () => void }) {
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("photo");
  const [tone, setTone] = useState("mysterious");
  const [platform, setPlatform] = useState("general");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [captions, setCaptions] = useState<string[]>([]);
  const [selectedCaption, setSelectedCaption] = useState("");
  const generationControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      generationControllerRef.current?.abort();
      generationControllerRef.current = null;
    };
  }, []);

  const generate = async () => {
    if (!topic.trim()) return;
    generationControllerRef.current?.abort();
    const controller = new AbortController();
    generationControllerRef.current = controller;

    setLoading(true);
    setOutput("");
    setCaptions([]);
    setSelectedCaption("");
    try {
      const res = await fetch("/api/tools/caption", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), contentType, tone, platform }),
      });
      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      while (true) {
        if (controller.signal.aborted) break;
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        full += chunk;
        setOutput(full);
      }
      if (controller.signal.aborted) return;
      // Parse the 3 captions
      const parsed: string[] = [];
      const linesArr = full.split("\n");
      for (const line of linesArr) {
        const m = line.match(/^CAPTION_\d+:\s*(.+)/);
        if (m) parsed.push(m[1].trim());
      }
      if (parsed.length === 0) parsed.push(full.trim());
      setCaptions(parsed);
      setSelectedCaption(parsed[0] ?? "");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    } finally {
      if (generationControllerRef.current === controller) {
        generationControllerRef.current = null;
      }
      setLoading(false);
    }
  };

  const copyCaption = () => {
    if (selectedCaption) navigator.clipboard.writeText(selectedCaption);
  };

  const inputStyle: React.CSSProperties = { background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px", width: "100%", fontSize: "13px" };

  return (
    <Modal title="Caption Generator" sub="AI writes social media captions that convert" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", marginBottom: "10px" }}>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What is your content about? (e.g. 'new exclusive photo shoot')" style={inputStyle} onKeyDown={e => { if (e.key === "Enter") generate(); }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          <select value={contentType} onChange={e => setContentType(e.target.value)} style={inputStyle}>
            <option value="photo">Photo</option>
            <option value="video">Video</option>
            <option value="announcement">Announcement</option>
            <option value="teaser">Teaser</option>
            <option value="behind-scenes">Behind Scenes</option>
          </select>
          <select value={tone} onChange={e => setTone(e.target.value)} style={inputStyle}>
            <option value="mysterious">Mysterious</option>
            <option value="bold">Bold</option>
            <option value="playful">Playful</option>
            <option value="exclusive">Exclusive</option>
            <option value="seductive">Seductive</option>
          </select>
          <select value={platform} onChange={e => setPlatform(e.target.value)} style={inputStyle}>
            <option value="general">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter/X</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
      </div>
      <button onClick={generate} disabled={loading} style={{ border: "none", borderRadius: "6px", padding: "10px 16px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", marginBottom: "16px" }}>
        {loading ? "GENERATING..." : "GENERATE 3 CAPTIONS"}
      </button>

      {captions.length > 0 && (
        <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
          {captions.map((cap, i) => (
            <div
              key={i}
              onClick={() => setSelectedCaption(cap)}
              style={{ border: `1px solid ${selectedCaption === cap ? "var(--gold)" : "rgba(255,255,255,0.08)"}`, borderRadius: "8px", padding: "12px", cursor: "pointer", background: selectedCaption === cap ? "rgba(200,169,110,0.08)" : "rgba(255,255,255,0.02)", transition: "all 0.15s" }}
            >
              <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>OPTION {i + 1}</div>
              <div style={{ fontSize: "13px", color: "var(--white)", lineHeight: 1.6 }}>{cap}</div>
            </div>
          ))}
        </div>
      )}

      {loading && !captions.length && (
        <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "12px", fontSize: "13px", color: "var(--dim)", lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: "60px" }}>
          {output || "Writing..."}
        </div>
      )}

      {captions.length > 0 && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={copyCaption} disabled={!selectedCaption} style={{ border: "none", borderRadius: "6px", padding: "10px 16px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
            COPY TO CLIPBOARD
          </button>
          <button onClick={generate} disabled={loading} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "10px 16px", background: "transparent", color: "var(--dim)", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
            REGENERATE
          </button>
        </div>
      )}
    </Modal>
  );
}

// ─── Price Optimizer ───────────────────────────────────────────────────────────
export function PriceOptimizerModal({ onClose }: { onClose: () => void }) {
  const [currentPrice, setCurrentPrice] = useState("25");
  const [contentType, setContentType] = useState("subscription");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    recommendedPrice: string;
    confidence: string;
    reasoning: string;
    predictions: string[];
    stats: { totalRevenue: string; avgTransaction: string; uniqueFans: number; conversionRate: string };
  } | null>(null);
  const [err, setErr] = useState("");

  const analyze = async () => {
    const parsedPrice = Number.parseFloat(currentPrice.trim());
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setErr("Please enter a valid non-negative price.");
      return;
    }

    setLoading(true);
    setErr("");
    setResult(null);
    try {
      const res = await fetch("/api/tools/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPrice: parsedPrice, contentType }),
      });
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      setResult(json);
    } catch {
      setErr("Analysis failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = { background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px", fontSize: "13px" };

  return (
    <Modal title="Price Optimizer" sub="AI analyzes your real transaction data to find your ideal price" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
        <div>
          <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>CURRENT PRICE ($)</div>
          <input value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} type="number" min="0" style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div>
          <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>CONTENT TYPE</div>
          <select value={contentType} onChange={e => setContentType(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
            <option value="subscription">Subscription</option>
            <option value="tip">Tip / Donation</option>
            <option value="unlock">Content Unlock</option>
          </select>
        </div>
      </div>

      <button onClick={analyze} disabled={loading} style={{ border: "none", borderRadius: "6px", padding: "10px 16px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", marginBottom: "16px" }}>
        {loading ? "ANALYZING..." : "ANALYZE & OPTIMIZE"}
      </button>

      {result && (
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ border: "1px solid rgba(200,169,110,0.4)", borderRadius: "8px", padding: "14px", background: "rgba(200,169,110,0.06)" }}>
              <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>RECOMMENDED PRICE</div>
              <div style={{ ...disp, fontSize: "32px", color: "var(--gold)" }}>{result.recommendedPrice}</div>
              <div style={{ ...mono, fontSize: "10px", color: "var(--dim)", marginTop: "4px" }}>Confidence: {result.confidence}</div>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>YOUR STATS</div>
              <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.9 }}>
                Total: ${result.stats.totalRevenue}<br />
                Avg tx: ${result.stats.avgTransaction}<br />
                Unique fans: {result.stats.uniqueFans}<br />
                Conversion: {result.stats.conversionRate}%
              </div>
            </div>
          </div>
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>REASONING</div>
            <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.7 }}>{result.reasoning}</div>
          </div>
          {result.predictions.length > 0 && (
            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "8px" }}>PREDICTIONS</div>
              {result.predictions.map((p, i) => (
                <div key={i} style={{ fontSize: "13px", color: "var(--muted)", padding: "8px 0", borderBottom: i < result.predictions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", lineHeight: 1.5 }}>
                  {p}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {err && <div style={{ fontSize: "12px", color: "#ff6a6a" }}>{err}</div>}
    </Modal>
  );
}

// ─── Onboarding Beast AI ─────────────────────────────────────────────────────
export function OnboardingBeastModal({ onClose }: { onClose: () => void }) {
  const [interests, setInterests] = useState("");
  const [contentTypes, setContentTypes] = useState("");
  const [experience, setExperience] = useState("beginner");
  const [currentPlatforms, setCurrentPlatforms] = useState("");
  const [goals, setGoals] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<null | {
    niche?: string;
    confidence?: string;
    subNiches?: string[];
    handleSuggestions?: string[];
    pricing?: { recommendation?: string; rationale?: string };
    contentPillars?: Array<{ name?: string; description?: string }>;
    targetAudience?: { primary?: string; psychographics?: string[]; painPoints?: string };
    platformPriority?: string[];
    first30Days?: string[];
  }>(null);

  const listFromText = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

  const runAnalysis = async () => {
    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const res = await fetch("/api/ai/onboarding/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests: listFromText(interests),
          contentTypes: listFromText(contentTypes),
          experience,
          currentPlatforms: listFromText(currentPlatforms),
          followerCounts: {},
          goals: listFromText(goals),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = { background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px", width: "100%", fontSize: "13px" };

  return (
    <Modal title="Onboarding Beast AI" sub="Build your niche, pricing, pillars, and first 30-day plan from one strategy pass" onClose={onClose}>
      <div style={{ display: "grid", gap: "10px", marginBottom: "14px" }}>
        <input value={interests} onChange={e => setInterests(e.target.value)} placeholder="Interests: luxury, fashion, mystery" style={inputStyle} />
        <input value={contentTypes} onChange={e => setContentTypes(e.target.value)} placeholder="Content types: photos, reels, exclusive drops" style={inputStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <select value={experience} onChange={e => setExperience(e.target.value)} style={inputStyle}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <input value={currentPlatforms} onChange={e => setCurrentPlatforms(e.target.value)} placeholder="Platforms: instagram, x, tiktok" style={inputStyle} />
        </div>
        <textarea value={goals} onChange={e => setGoals(e.target.value)} placeholder="Goals: first 50 paying fans, premium brand, recurring revenue" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </div>

      <button onClick={runAnalysis} disabled={loading} style={{ border: "none", borderRadius: "6px", padding: "10px 16px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", marginBottom: "16px" }}>
        {loading ? "ANALYZING..." : "RUN ONBOARDING BEAST"}
      </button>

      {error && <div style={{ marginBottom: "12px", fontSize: "12px", color: "#ff6a6a" }}>{error}</div>}

      {analysis && (
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ border: "1px solid rgba(200,169,110,0.35)", borderRadius: "8px", padding: "12px", background: "rgba(200,169,110,0.06)" }}>
              <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>NICHE</div>
              <div style={{ ...disp, fontSize: "24px", color: "var(--gold)" }}>{analysis.niche || "Unknown"}</div>
              <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "4px" }}>{analysis.confidence || ""}</div>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>STARTING PRICE</div>
              <div style={{ ...disp, fontSize: "24px", color: "var(--gold)" }}>{analysis.pricing?.recommendation || "-"}</div>
              <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "4px" }}>{analysis.pricing?.rationale || ""}</div>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "8px" }}>CONTENT PILLARS</div>
            <div style={{ display: "grid", gap: "8px" }}>
              {(analysis.contentPillars || []).map((pillar, index) => (
                <div key={`${pillar.name}-${index}`} style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
                  <strong style={{ color: "var(--gold)" }}>{pillar.name || `Pillar ${index + 1}`}</strong>: {pillar.description || ""}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "8px" }}>HANDLE SUGGESTIONS</div>
              <div style={{ display: "grid", gap: "6px" }}>
                {(analysis.handleSuggestions || []).slice(0, 5).map((handle, index) => (
                  <div key={`${handle}-${index}`} style={{ fontSize: "12px", color: "var(--muted)" }}>{handle}</div>
                ))}
              </div>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "8px" }}>FIRST 30 DAYS</div>
              <div style={{ display: "grid", gap: "6px" }}>
                {(analysis.first30Days || []).map((step, index) => (
                  <div key={`${step}-${index}`} style={{ fontSize: "12px", color: "var(--muted)" }}>{step}</div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "8px" }}>TARGET AUDIENCE</div>
            <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.7 }}>
              <div><strong style={{ color: "var(--gold)" }}>Primary:</strong> {analysis.targetAudience?.primary || "-"}</div>
              <div><strong style={{ color: "var(--gold)" }}>Psychographics:</strong> {(analysis.targetAudience?.psychographics || []).join(", ") || "-"}</div>
              <div><strong style={{ color: "var(--gold)" }}>Pain points:</strong> {analysis.targetAudience?.painPoints || "-"}</div>
              <div><strong style={{ color: "var(--gold)" }}>Platform priority:</strong> {(analysis.platformPriority || []).join(", ") || "-"}</div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Content Calendar ──────────────────────────────────────────────────────────
export function ContentCalendarModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [slots, setSlots] = useState<Record<number, { title: string; type: string }>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftType, setDraftType] = useState("subscription");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [existingPlans, setExistingPlans] = useState<Array<{ id: string; title: string; planned_for: string | null; plan_type: string; status: string }>>([]);
  const [backlogIdeas, setBacklogIdeas] = useState<Array<{ id: string; title: string; plan_type: string; description: string | null }>>([]);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    const loadPlans = async () => {
      const supabase = createClient();
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);

      const { data } = await supabase
        .from("content_plans_v2")
        .select("id, title, planned_for, plan_type, status")
        .eq("creator_id", userId)
        .gte("planned_for", monday.toISOString())
        .lt("planned_for", sunday.toISOString())
        .order("planned_for", { ascending: true });

      const { data: backlog } = await supabase
        .from("content_plans_v2")
        .select("id, title, description, plan_type")
        .eq("creator_id", userId)
        .eq("status", "idea")
        .is("planned_for", null)
        .order("created_at", { ascending: false })
        .limit(6);

      setExistingPlans(data || []);
      setBacklogIdeas(backlog || []);
    };

    void loadPlans();
  }, [userId]);

  const selectDay = (i: number) => {
    setEditing(i);
    setDraftTitle(slots[i]?.title ?? "");
    setDraftType(slots[i]?.type ?? "subscription");
  };

  const saveSlot = () => {
    if (!draftTitle.trim()) return;
    setSlots(prev => ({ ...prev, [editing!]: { title: draftTitle.trim(), type: draftType } }));
    setEditing(null);
    setDraftTitle("");
  };

  const schedule = async () => {
    const entries = Object.entries(slots);
    if (entries.length === 0) { setMsg("Add at least one slot."); return; }
    setSaving(true);
    setMsg("");
    try {
      const supabase = createClient();
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);

      const rows = entries.map(([dayIdx, slot]) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + Number(dayIdx));
        return {
          creator_id: userId,
          title: slot.title,
          description: `Scheduled ${slot.type} content`,
          plan_type: slot.type,
          status: "scheduled",
          source: "manual",
          planned_for: date.toISOString(),
          metadata: {},
        };
      });

      const { error } = await supabase.from("content_plans_v2").insert(rows);
      if (error) throw error;
      setMsg(`Scheduled ${rows.length} content item(s) for this week.`);
      setSlots({});
      setExistingPlans((prev) => [
        ...prev,
        ...rows.map((row, index) => ({
          id: `local-${index}-${row.planned_for}`,
          title: row.title,
          planned_for: row.planned_for,
          plan_type: row.plan_type,
          status: row.status,
        })),
      ]);
    } catch {
      setMsg("Could not schedule — run SQL migration first.");
    } finally {
      setSaving(false);
    }
  };

  const typeColors: Record<string, string> = {
    subscription: "#c8a96e",
    tip: "#987a4c",
    unlock: "#5f5137",
  };

  return (
    <Modal title="Content Calendar" sub="Plan your week — click any day to schedule content" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "6px", marginBottom: "16px" }}>
        {days.map((day, i) => {
          const slot = slots[i];
          return (
            <div
              key={day}
              onClick={() => selectDay(i)}
              style={{ border: `1px solid ${slot ? typeColors[slot.type] ?? "var(--gold)" : "rgba(255,255,255,0.10)"}`, borderRadius: "8px", padding: "10px 6px", cursor: "pointer", background: slot ? "rgba(200,169,110,0.07)" : "rgba(255,255,255,0.02)", minHeight: "80px", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", letterSpacing: "0.1em" }}>{day}</div>
              {slot ? (
                <>
                  <div style={{ fontSize: "11px", color: "var(--white)", lineHeight: 1.3, wordBreak: "break-word" }}>{slot.title}</div>
                  <div style={{ ...mono, fontSize: "9px", color: typeColors[slot.type] ?? "var(--gold)", marginTop: "auto" }}>{slot.type}</div>
                </>
              ) : (
                <div style={{ fontSize: "20px", color: "rgba(255,255,255,0.12)", marginTop: "auto", textAlign: "center" }}>+</div>
              )}
            </div>
          );
        })}
      </div>

      {editing !== null && (
        <div style={{ border: "1px solid rgba(200,169,110,0.3)", borderRadius: "8px", padding: "14px", marginBottom: "16px", background: "rgba(200,169,110,0.04)" }}>
          <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "10px" }}>ADDING: {days[editing]}</div>
          <input
            value={draftTitle}
            onChange={e => setDraftTitle(e.target.value)}
            placeholder="Content title"
            autoFocus
            style={{ background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px", width: "100%", marginBottom: "8px", fontSize: "13px" }}
            onKeyDown={e => { if (e.key === "Enter") saveSlot(); }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <select value={draftType} onChange={e => setDraftType(e.target.value)} style={{ background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px", fontSize: "13px" }}>
              <option value="subscription">Subscription</option>
              <option value="tip">Tip</option>
              <option value="unlock">Unlock</option>
            </select>
            <button onClick={saveSlot} style={{ border: "none", borderRadius: "6px", padding: "10px 14px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>ADD</button>
            <button onClick={() => setEditing(null)} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "10px 14px", background: "transparent", color: "var(--dim)", ...mono, fontSize: "11px", cursor: "pointer" }}>CANCEL</button>
          </div>
        </div>
      )}

      <button onClick={schedule} disabled={saving || Object.keys(slots).length === 0} style={{ border: "none", borderRadius: "6px", padding: "10px 16px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
        {saving ? "SCHEDULING..." : `SCHEDULE ${Object.keys(slots).length} ITEM(S) TO DB`}
      </button>

      {existingPlans.length > 0 && (
        <div style={{ marginTop: "16px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "8px" }}>THIS WEEK&apos;S PLAN</div>
          <div style={{ display: "grid", gap: "8px" }}>
            {existingPlans.slice(0, 7).map((plan) => (
              <div key={plan.id} style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "12px", color: "var(--muted)" }}>
                <span>{plan.title}</span>
                <span style={{ ...mono, color: "var(--gold)" }}>{plan.planned_for ? new Date(plan.planned_for).toLocaleDateString("en-US", { weekday: "short" }) : plan.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {backlogIdeas.length > 0 && (
        <div style={{ marginTop: "16px", border: "1px solid rgba(200,169,110,0.18)", borderRadius: "8px", padding: "12px", background: "rgba(200,169,110,0.04)" }}>
          <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "8px" }}>AI IDEA BACKLOG</div>
          <div style={{ display: "grid", gap: "8px" }}>
            {backlogIdeas.map((idea) => (
              <button
                key={idea.id}
                type="button"
                onClick={() => {
                  setDraftTitle(idea.title);
                  setDraftType(idea.plan_type || "unlock");
                  setEditing(0);
                }}
                style={{ textAlign: "left", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", color: "var(--white)", cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", color: "var(--white)" }}>{idea.title}</span>
                  <span style={{ ...mono, fontSize: "8px", color: "var(--gold)" }}>{idea.plan_type}</span>
                </div>
                {idea.description && <div style={{ fontSize: "11px", color: "var(--dim)", lineHeight: 1.5 }}>{idea.description}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {msg && <div style={{ marginTop: "10px", fontSize: "12px", color: msg.includes("Could") ? "#ff6a6a" : "var(--gold)" }}>{msg}</div>}
    </Modal>
  );
}

// ─── Fan Message Blast ─────────────────────────────────────────────────────────
export function FanMessageBlastModal({ userId, fanCodeCount, onClose }: { userId: string; fanCodeCount: number; onClose: () => void }) {
  const [segment, setSegment] = useState("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const segmentOptions = [
    { value: "all", label: "All Fans", count: fanCodeCount },
    { value: "active", label: "Active Fans (30d)", count: Math.ceil(fanCodeCount * 0.6) },
    { value: "top", label: "Top Spenders", count: Math.ceil(fanCodeCount * 0.2) },
  ];

  const selectedSeg = segmentOptions.find(s => s.value === segment)!;

  const blast = async () => {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) { setMsg("Write a message first."); return; }
    if (normalizedMessage.length > 500) {
      setMsg("Message must be 500 characters or less.");
      setMessage(normalizedMessage.slice(0, 500));
      return;
    }

    setSending(true);
    setMsg("");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("creator_broadcasts_v2").insert({
        creator_id: userId,
        segment,
        recipient_count: selectedSeg.count,
        message: normalizedMessage,
        status: "queued",
        metadata: {},
      });
      if (error) throw error;
      setMsg(`Message blasted to ${selectedSeg.count} fans.`);
      setMessage("");
    } catch {
      setMsg("Could not send — run SQL migration first.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title="Fan Message Blast" sub="Broadcast a message to your fans instantly" onClose={onClose}>
      <div style={{ marginBottom: "12px" }}>
        <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "8px" }}>SELECT AUDIENCE</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
          {segmentOptions.map(opt => (
            <div
              key={opt.value}
              onClick={() => setSegment(opt.value)}
              style={{ border: `1px solid ${segment === opt.value ? "var(--gold)" : "rgba(255,255,255,0.08)"}`, borderRadius: "8px", padding: "12px", cursor: "pointer", background: segment === opt.value ? "rgba(200,169,110,0.08)" : "rgba(255,255,255,0.02)", transition: "all 0.15s", textAlign: "center" }}
            >
              <div style={{ fontSize: "12px", color: "var(--white)", marginBottom: "4px" }}>{opt.label}</div>
              <div style={{ ...disp, fontSize: "24px", color: "var(--gold)" }}>{opt.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>MESSAGE</div>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={500}
          placeholder="What do you want to tell your fans..."
          rows={4}
          style={{ background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px", width: "100%", fontSize: "13px", resize: "vertical", lineHeight: 1.6 }}
        />
        <div style={{ ...mono, fontSize: "10px", color: "var(--dim)", marginTop: "4px", textAlign: "right" }}>{message.length}/500</div>
      </div>

      <div style={{ border: "1px solid rgba(200,169,110,0.2)", borderRadius: "8px", padding: "12px", marginBottom: "16px", background: "rgba(200,169,110,0.04)" }}>
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
          This message will be sent to <strong style={{ color: "var(--gold)" }}>{selectedSeg.count} {selectedSeg.label}</strong> via CIPHER platform.
        </div>
      </div>

      <button onClick={blast} disabled={sending || !message.trim()} style={{ border: "none", borderRadius: "6px", padding: "10px 16px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
        {sending ? "BLASTING..." : `BLAST TO ${selectedSeg.count} FANS`}
      </button>

      {msg && <div style={{ marginTop: "10px", fontSize: "12px", color: msg.includes("blasted") ? "var(--gold)" : "#ff6a6a" }}>{msg}</div>}
    </Modal>
  );
}

// ─── Collaboration Finder ──────────────────────────────────────────────────────
const MOCK_CREATORS = [
  { handle: "@velvet.phantom", category: "luxury", fans: 1240, earnings: 18400 },
  { handle: "@nocturnalvox", category: "music", fans: 890, earnings: 12200 },
  { handle: "@abyssal.ink", category: "art", fans: 2100, earnings: 31000 },
  { handle: "@goldenmask.fit", category: "fitness", fans: 670, earnings: 9800 },
  { handle: "@silkthread.co", category: "fashion", fans: 1540, earnings: 22600 },
  { handle: "@darkchamber", category: "luxury", fans: 3200, earnings: 48000 },
];

export function CollabFinderModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [filter, setFilter] = useState("all");
  const [splitPct, setSplitPct] = useState(50);
  const [selectedHandle, setSelectedHandle] = useState("");
  const [propMsg, setPropMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState("");

  const creators = filter === "all" ? MOCK_CREATORS : MOCK_CREATORS.filter(c => c.category === filter);

  const propose = async () => {
    if (!selectedHandle || !propMsg.trim()) { setSentMsg("Select a creator and write a message."); return; }
    setSending(true);
    setSentMsg("");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("collab_proposals").insert({
        from_creator_id: userId,
        to_handle: selectedHandle,
        split_percentage: splitPct,
        message: propMsg.trim(),
        status: "pending",
      });
      if (error) throw error;
      setSentMsg(`Proposal sent to ${selectedHandle}. They'll be notified on CIPHER.`);
      setPropMsg("");
      setSelectedHandle("");
    } catch {
      setSentMsg("Could not send — run SQL migration first.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title="Collab Finder" sub="Connect with other CIPHER creators for revenue splits" onClose={onClose}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
        {["all", "luxury", "music", "art", "fitness", "fashion"].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{ ...mono, fontSize: "10px", letterSpacing: "0.1em", padding: "6px 12px", borderRadius: "999px", border: `1px solid ${filter === cat ? "var(--gold)" : "rgba(255,255,255,0.12)"}`, background: filter === cat ? "rgba(200,169,110,0.12)" : "transparent", color: filter === cat ? "var(--gold)" : "var(--dim)", cursor: "pointer", textTransform: "uppercase" }}
          >{cat}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "8px", marginBottom: "16px" }}>
        {creators.map(c => (
          <div
            key={c.handle}
            onClick={() => setSelectedHandle(c.handle)}
            style={{ border: `1px solid ${selectedHandle === c.handle ? "var(--gold)" : "rgba(255,255,255,0.08)"}`, borderRadius: "8px", padding: "12px", cursor: "pointer", background: selectedHandle === c.handle ? "rgba(200,169,110,0.08)" : "rgba(255,255,255,0.02)", transition: "all 0.15s" }}
          >
            <div style={{ ...mono, fontSize: "11px", color: "var(--gold)", marginBottom: "4px" }}>{c.handle}</div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>{c.category} · {c.fans.toLocaleString()} fans</div>
            <div style={{ ...disp, fontSize: "22px", color: "var(--white)", marginTop: "4px" }}>{money.format(c.earnings)}</div>
          </div>
        ))}
      </div>

      {selectedHandle && (
        <div style={{ border: "1px solid rgba(200,169,110,0.3)", borderRadius: "8px", padding: "14px", marginBottom: "12px", background: "rgba(200,169,110,0.04)" }}>
          <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "10px" }}>PROPOSE COLLAB WITH {selectedHandle}</div>
          <div style={{ marginBottom: "10px" }}>
            <div style={{ ...mono, fontSize: "9px", color: "var(--dim)", marginBottom: "6px" }}>SPLIT: {splitPct}% / {100 - splitPct}%</div>
            <input
              type="range"
              min="20"
              max="80"
              value={splitPct}
              onChange={e => setSplitPct(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#c8a96e" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", ...mono, fontSize: "9px", color: "var(--dim)" }}>
              <span>You {splitPct}%</span><span>Them {100 - splitPct}%</span>
            </div>
          </div>
          <textarea
            value={propMsg}
            onChange={e => setPropMsg(e.target.value)}
            placeholder="Your proposal message..."
            rows={3}
            style={{ background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px", width: "100%", fontSize: "13px", resize: "vertical" }}
          />
          <button onClick={propose} disabled={sending} style={{ marginTop: "8px", border: "none", borderRadius: "6px", padding: "10px 16px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
            {sending ? "SENDING..." : "SEND PROPOSAL"}
          </button>
        </div>
      )}

      {sentMsg && <div style={{ fontSize: "12px", color: sentMsg.includes("sent") ? "var(--gold)" : "#ff6a6a" }}>{sentMsg}</div>}
    </Modal>
  );
}

// ─── Tax Summary ───────────────────────────────────────────────────────────────
export function TaxSummaryModal({ transactions, onClose }: {
  transactions: Array<{ id: string; amount: number; type: string | null; status: string; created_at: string; fan_code: string | null }>;
  onClose: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));

  const yearTx = transactions.filter(t =>
    t.status === "success" && String(t.created_at).startsWith(year)
  );

  const grossRevenue = yearTx.reduce((s, t) => s + t.amount, 0) / 100;
  const platformFee = grossRevenue * 0.15;
  const netRevenue = grossRevenue - platformFee;
  const estimatedTax = netRevenue * 0.28;

  const byType = ["whop", "crypto", "unknown"].map(type => ({
    type,
    count: yearTx.filter(t => (t.type ?? "unknown") === type).length,
    total: yearTx.filter(t => (t.type ?? "unknown") === type).reduce((s, t) => s + t.amount, 0) / 100,
  }));

  const downloadCSV = () => {
    const escapeField = (value: unknown) => {
      const text = String(value ?? "");
      const escaped = text.replace(/"/g, '""');
      return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
    };

    const headers = ["Date", "Fan Code", "Type", "Amount", "Status", "Platform Fee (15%)", "Net"];
    const rows = yearTx.map(t => [
      String(t.created_at).slice(0, 10),
      t.fan_code ?? "UNKNOWN",
      t.type ?? "subscription",
      t.amount.toFixed(2),
      t.status,
      (t.amount * 0.15).toFixed(2),
      (t.amount * 0.85).toFixed(2),
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => escapeField(cell)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cipher_tax_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal title="Tax Summary" sub="Your earnings breakdown for tax reporting" onClose={onClose}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)" }}>TAX YEAR</div>
        <select value={year} onChange={e => setYear(e.target.value)} style={{ background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "8px 10px", fontSize: "13px" }}>
          {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y}>{y}</option>)}
        </select>
        <span style={{ ...mono, fontSize: "10px", color: "var(--dim)" }}>{yearTx.length} transactions</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
        {[
          { label: "GROSS REVENUE", value: money.format(grossRevenue), gold: true },
          { label: "PLATFORM FEE (15%)", value: money.format(platformFee), gold: false },
          { label: "NET REVENUE", value: money.format(netRevenue), gold: true },
          { label: "EST. TAX (28%)", value: money.format(estimatedTax), gold: false },
        ].map(item => (
          <div key={item.label} style={{ border: `1px solid ${item.gold ? "rgba(200,169,110,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: "8px", padding: "12px", background: item.gold ? "rgba(200,169,110,0.04)" : "rgba(255,255,255,0.02)" }}>
            <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>{item.label}</div>
            <div style={{ ...disp, fontSize: "26px", color: item.gold ? "var(--gold)" : "var(--muted)" }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", overflow: "hidden", marginBottom: "14px" }}>
        <div style={{ padding: "10px 12px", ...mono, fontSize: "9px", color: "var(--gold-dim)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>BY CONTENT TYPE</div>
        {byType.map(bt => (
          <div key={bt.type} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "capitalize" }}>{bt.type}</div>
            <div style={{ fontSize: "12px", color: "var(--dim)" }}>{bt.count} transactions</div>
            <div style={{ ...disp, fontSize: "20px", color: "var(--gold)", textAlign: "right" }}>{money.format(bt.total)}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "8px", padding: "12px", marginBottom: "14px", fontSize: "12px", color: "var(--dim)", lineHeight: 1.7 }}>
        <strong style={{ color: "var(--gold)" }}>Disclaimer:</strong> This is an estimate for reference only. Consult a tax professional for accurate tax advice. The 28% rate is an approximation for self-employment income in many jurisdictions.
      </div>

      <button onClick={downloadCSV} style={{ border: "none", borderRadius: "6px", padding: "10px 16px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
        EXPORT CSV ({year})
      </button>
    </Modal>
  );
}

// ─── Voice Clone Modal ─────────────────────────────────────────────────────────
type Voice = {
  id: string;
  voice_id: string;
  name: string;
  description?: string;
  is_default?: boolean;
};

export function VoiceCloneModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"clone" | "generate">("generate");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState("");
  
  // Clone form
  const [voiceName, setVoiceName] = useState("");
  const [voiceDesc, setVoiceDesc] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  
  // TTS form
  const [selectedVoice, setSelectedVoice] = useState("");
  const [text, setText] = useState("");
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [audioUrl, setAudioUrl] = useState("");

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      const res = await fetch("/api/ai/voice/tts");
      const data = await res.json();
      const allVoices = [
        ...(data.default_voices || []),
        ...(data.cloned_voices || []),
      ];
      setVoices(allVoices);
      if (allVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(allVoices[0].voice_id);
      }
    } catch (e) {
      setMsg("Failed to load voices");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => {
      const validTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/m4a"];
      return validTypes.includes(f.type) && f.size <= 10 * 1024 * 1024;
    });
    if (valid.length !== selected.length) {
      setMsg("Some files were skipped (max 10MB, MP3/WAV/M4A only)");
    }
    setFiles(valid);
  };

  const cloneVoice = async () => {
    if (!voiceName || files.length === 0) {
      setMsg("Enter a name and upload audio files");
      return;
    }
    
    setCloning(true);
    setMsg("");
    
    try {
      const formData = new FormData();
      formData.append("name", voiceName);
      formData.append("description", voiceDesc);
      files.forEach(f => formData.append("files", f));
      
      const res = await fetch("/api/ai/voice/clone", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMsg("Voice cloned successfully!");
      setVoiceName("");
      setVoiceDesc("");
      setFiles([]);
      fetchVoices();
      setActiveTab("generate");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Cloning failed");
    } finally {
      setCloning(false);
    }
  };

  const generateSpeech = async () => {
    if (!text || !selectedVoice) {
      setMsg("Enter text and select a voice");
      return;
    }
    
    setGenerating(true);
    setMsg("");
    setAudioUrl("");
    
    try {
      const res = await fetch("/api/ai/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice,
          stability,
          similarityBoost: similarity,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setMsg("Audio generated!");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const deleteVoice = async (voiceId: string) => {
    try {
      const res = await fetch(`/api/ai/voice/clone?voiceId=${voiceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchVoices();
      setMsg("Voice deleted");
    } catch {
      setMsg("Failed to delete voice");
    }
  };

  const inputStyle: React.CSSProperties = { 
    background: "#0a0a14", 
    border: "1px solid rgba(255,255,255,0.1)", 
    color: "var(--white)", 
    borderRadius: "6px", 
    padding: "10px", 
    fontSize: "13px",
    width: "100%"
  };

  return (
    <Modal title="Voice Studio" sub="Clone your voice or generate speech with AI" onClose={onClose}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("generate")}
          style={{
            flex: 1,
            padding: "10px",
            background: activeTab === "generate" ? "rgba(200,169,110,0.15)" : "transparent",
            border: `1px solid ${activeTab === "generate" ? "var(--gold)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "6px",
            color: activeTab === "generate" ? "var(--gold)" : "var(--dim)",
            ...mono,
            fontSize: "11px",
            cursor: "pointer",
          }}
        >
          GENERATE SPEECH
        </button>
        <button
          onClick={() => setActiveTab("clone")}
          style={{
            flex: 1,
            padding: "10px",
            background: activeTab === "clone" ? "rgba(200,169,110,0.15)" : "transparent",
            border: `1px solid ${activeTab === "clone" ? "var(--gold)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "6px",
            color: activeTab === "clone" ? "var(--gold)" : "var(--dim)",
            ...mono,
            fontSize: "11px",
            cursor: "pointer",
          }}
        >
          CLONE VOICE
        </button>
      </div>

      {/* Generate Tab */}
      {activeTab === "generate" && (
        <div>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>SELECT VOICE</div>
            <select 
              value={selectedVoice} 
              onChange={e => setSelectedVoice(e.target.value)}
              style={inputStyle}
            >
              <optgroup label="Default Voices">
                {voices.filter(v => v.is_default).map(v => (
                  <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                ))}
              </optgroup>
              <optgroup label="Your Cloned Voices">
                {voices.filter(v => !v.is_default).map(v => (
                  <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>TEXT TO SPEAK</div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              rows={4}
              maxLength={5000}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
            <div style={{ ...mono, fontSize: "9px", color: "var(--dim)", marginTop: "4px", textAlign: "right" }}>
              {text.length}/5000
            </div>
          </div>

          {/* Voice Settings */}
          <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
            <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "10px" }}>VOICE SETTINGS</div>
            <div style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", ...mono, fontSize: "9px", color: "var(--dim)", marginBottom: "4px" }}>
                <span>Stability</span>
                <span>{stability}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={stability}
                onChange={e => setStability(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#c8a96e" }}
              />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", ...mono, fontSize: "9px", color: "var(--dim)", marginBottom: "4px" }}>
                <span>Clarity + Similarity</span>
                <span>{similarity}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={similarity}
                onChange={e => setSimilarity(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#c8a96e" }}
              />
            </div>
          </div>

          <button
            onClick={generateSpeech}
            disabled={generating || !text}
            style={{
              width: "100%",
              padding: "12px",
              background: "var(--gold)",
              border: "none",
              borderRadius: "6px",
              color: "#120c00",
              ...mono,
              fontSize: "11px",
              letterSpacing: "0.1em",
              cursor: "pointer",
              opacity: generating || !text ? 0.6 : 1,
              marginBottom: "16px",
            }}
          >
            {generating ? "GENERATING..." : "GENERATE SPEECH"}
          </button>

          {audioUrl && (
            <div style={{ padding: "16px", background: "rgba(200,169,110,0.08)", borderRadius: "8px", border: "1px solid rgba(200,169,110,0.2)" }}>
              <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "10px" }}>GENERATED AUDIO</div>
              <audio controls style={{ width: "100%" }} src={audioUrl} />
              <a
                href={audioUrl}
                download="cipher-voice.mp3"
                style={{
                  display: "inline-block",
                  marginTop: "10px",
                  padding: "8px 16px",
                  background: "rgba(200,169,110,0.15)",
                  border: "1px solid rgba(200,169,110,0.3)",
                  borderRadius: "4px",
                  color: "var(--gold)",
                  ...mono,
                  fontSize: "10px",
                  textDecoration: "none",
                }}
              >
                DOWNLOAD MP3
              </a>
            </div>
          )}
        </div>
      )}

      {/* Clone Tab */}
      {activeTab === "clone" && (
        <div>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>VOICE NAME</div>
            <input
              value={voiceName}
              onChange={e => setVoiceName(e.target.value)}
              placeholder="e.g. My Voice"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>DESCRIPTION (OPTIONAL)</div>
            <input
              value={voiceDesc}
              onChange={e => setVoiceDesc(e.target.value)}
              placeholder="e.g. Calm, professional tone"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>AUDIO SAMPLES</div>
            <div
              style={{
                border: "2px dashed rgba(200,169,110,0.3)",
                borderRadius: "8px",
                padding: "24px",
                textAlign: "center",
                cursor: "pointer",
                background: files.length > 0 ? "rgba(200,169,110,0.05)" : "transparent",
              }}
              onClick={() => document.getElementById("voice-files")?.click()}
            >
              <input
                id="voice-files"
                type="file"
                multiple
                accept="audio/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🎙️</div>
              <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "4px" }}>
                {files.length > 0 ? `${files.length} file(s) selected` : "Click to upload audio files"}
              </div>
              <div style={{ ...mono, fontSize: "9px", color: "var(--dim)" }}>
                MP3, WAV, or M4A • Max 10MB each
              </div>
            </div>
            {files.length > 0 && (
              <div style={{ marginTop: "8px" }}>
                {files.map((f, i) => (
                  <div key={i} style={{ ...mono, fontSize: "10px", color: "var(--dim)", padding: "4px 0" }}>
                    • {f.name} ({(f.size / 1024 / 1024).toFixed(2)}MB)
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={cloneVoice}
            disabled={cloning || !voiceName || files.length === 0}
            style={{
              width: "100%",
              padding: "12px",
              background: "var(--gold)",
              border: "none",
              borderRadius: "6px",
              color: "#120c00",
              ...mono,
              fontSize: "11px",
              letterSpacing: "0.1em",
              cursor: "pointer",
              opacity: cloning || !voiceName || files.length === 0 ? 0.6 : 1,
            }}
          >
            {cloning ? "CLONING... (this may take a minute)" : "CLONE VOICE"}
          </button>

          {/* Your Cloned Voices */}
          {!loading && voices.filter(v => !v.is_default).length > 0 && (
            <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "12px" }}>YOUR CLONED VOICES</div>
              {voices.filter(v => !v.is_default).map(voice => (
                <div
                  key={voice.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "6px",
                    marginBottom: "8px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", color: "var(--white)" }}>{voice.name}</div>
                    {voice.description && (
                      <div style={{ ...mono, fontSize: "9px", color: "var(--dim)" }}>{voice.description}</div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteVoice(voice.id)}
                    style={{
                      padding: "6px 12px",
                      background: "rgba(200,76,76,0.1)",
                      border: "1px solid rgba(200,76,76,0.2)",
                      borderRadius: "4px",
                      color: "#ff6a6a",
                      ...mono,
                      fontSize: "9px",
                      cursor: "pointer",
                    }}
                  >
                    DELETE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {msg && (
        <div style={{ marginTop: "12px", fontSize: "12px", color: msg.includes("success") || msg.includes("Audio") ? "var(--gold)" : "#ff6a6a" }}>
          {msg}
        </div>
      )}
    </Modal>
  );
}
