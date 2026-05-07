"use client";

import { useState, useEffect, useCallback } from "react";
import type { PublicTip } from "@/lib/tips";
import { formatTip, TIP_PRESETS } from "@/lib/tips";

interface Props {
  handle: string;
}

interface TipWallData {
  tips:    PublicTip[];
  total:   number;
  page:    number;
  pages:   number;
}

type TipStep = "wall" | "amount" | "info" | "done";

// ─── Design Tokens ───────────────────────────────────────────────────────────

const GOLD   = "#c8a96e";
const WHITE  = "rgba(255,255,255,0.95)";
const SUB    = "rgba(255,255,255,0.55)";
const MUTED  = "rgba(255,255,255,0.35)";
const DIM    = "rgba(255,255,255,0.18)";
const BDR    = "rgba(255,255,255,0.08)";
const BDR2   = "rgba(255,255,255,0.14)";
const CARD   = "rgba(10,10,18,0.7)";
const SURFACE = "rgba(255,255,255,0.03)";

const MONO = "var(--font-mono, 'DM Mono', monospace)";
const BODY = "var(--font-body, 'Outfit', sans-serif)";
const DISP = "var(--font-display, 'Cormorant Garamond', serif)";

const CSS = `
@keyframes floatIn { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
@keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
@keyframes spin { to { transform: rotate(360deg); } }
.glass { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
`;

export default function TipsPageClient({ handle }: Props) {
  const [data, setData]       = useState<TipWallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep]       = useState<TipStep>("wall");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState("");

  const [amount, setAmount]         = useState(0);
  const [customAmount, setCustom]   = useState("");
  const [message, setMessage]       = useState("");
  const [displayName, setName]      = useState("");
  const [isAnon, setAnon]           = useState(false);
  const [fanEmail, setEmail]        = useState("");

  const parsedCustomAmount = Number.parseFloat(customAmount);
  const customCents = Number.isFinite(parsedCustomAmount) ? Math.round(parsedCustomAmount * 100) : 0;
  const effectiveAmount = amount || customCents;

  const fetchWall = useCallback(async (page = 1) => {
    try {
      const res  = await fetch(`/api/tips/${handle}?page=${page}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {/* ignore */} finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => { void fetchWall(); }, [fetchWall]);

  async function submitTip() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tips/${handle}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_cents:  effectiveAmount,
          message:       message.trim() || undefined,
          display_name:  !isAnon && displayName.trim() ? displayName.trim() : undefined,
          is_anonymous:  isAnon,
          fan_email:     fanEmail.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      if (json.checkout_url) {
        window.location.href = json.checkout_url;
      } else {
        setStep("done");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020203", position: "relative", overflowX: "hidden", padding: "80px 24px" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      
      {/* Ambient backgrounds */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: "1000px", height: "600px", background: "radial-gradient(circle, rgba(200,169,110,0.06) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto" }}>
        
        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: 60, animation: "floatIn 0.8s ease out" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: 100, padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, boxShadow: `0 0 10px ${GOLD}`, animation: "pulse 2s infinite" }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: GOLD, letterSpacing: "0.14em", fontWeight: 600 }}>WALL OF LOVE</span>
          </div>
          
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(2.5rem, 6vw, 4rem)", fontWeight: 400, color: WHITE, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
            @{handle}
          </h1>
          <p style={{ fontFamily: BODY, color: SUB, fontSize: 16, lineHeight: 1.6, maxWidth: 440, margin: "0 auto 32px" }}>
            Support my work and leave a message on the wall. Your contributions keep the creativity flowing.
          </p>

          {step === "wall" && (
            <button 
              onClick={() => setStep("amount")}
              style={{ 
                background: GOLD, border: "none", borderRadius: 12, padding: "16px 40px", 
                color: "#0a0800", fontWeight: 700, fontSize: 15, cursor: "pointer", 
                letterSpacing: "0.02em", boxShadow: `0 8px 32px rgba(200,169,110,0.35)`,
                transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 40px rgba(200,169,110,0.45)`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 8px 32px rgba(200,169,110,0.35)`; }}
            >
              Send a Tip ✦
            </button>
          )}
        </div>

        {/* ── Modal Step ── */}
        {step !== "wall" && (
          <div className="glass" style={{ background: CARD, border: `1px solid ${BDR2}`, borderRadius: 24, padding: "40px", marginBottom: 60, animation: "floatIn 0.5s ease both", boxShadow: "0 20px 80px rgba(0,0,0,0.5)" }}>
            
            {step === "amount" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontFamily: DISP, fontSize: "1.75rem", color: WHITE, margin: 0 }}>Select amount</h3>
                  <button onClick={() => setStep("wall")} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 20 }}>✕</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {TIP_PRESETS.map((cents) => (
                    <button
                      key={cents}
                      onClick={() => { setAmount(cents); setCustom(""); }}
                      style={{ 
                        background: amount === cents ? "rgba(200,169,110,0.12)" : SURFACE, 
                        border: `1px solid ${amount === cents ? GOLD : BDR}`, 
                        borderRadius: 12, padding: "20px 0", color: amount === cents ? GOLD : SUB, 
                        cursor: "pointer", fontFamily: MONO, fontSize: 18, fontWeight: 600,
                        transition: "all 0.2s"
                      }}
                    >
                      {formatTip(cents)}
                    </button>
                  ))}
                </div>

                <div style={{ position: "relative" }}>
                  <label style={labelS}>Custom amount</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: GOLD, fontFamily: MONO, fontSize: 20, fontWeight: 600 }}>$</span>
                    <input
                      value={customAmount}
                      onChange={(e) => { setCustom(e.target.value); setAmount(0); }}
                      placeholder="0.00"
                      type="number"
                      style={{ ...inputS, paddingLeft: 34, fontSize: 20, fontFamily: MONO, fontWeight: 600 }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => setStep("wall")} style={btnG}>Cancel</button>
                  <button
                    disabled={effectiveAmount < 100}
                    onClick={() => setStep("info")}
                    style={{ ...btnP, opacity: effectiveAmount < 100 ? 0.4 : 1 }}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {step === "info" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontFamily: DISP, fontSize: "1.75rem", color: WHITE, margin: 0 }}>Final details</h3>
                  <div style={{ background: "rgba(200,169,110,0.1)", border: `1px solid ${GOLD}40`, borderRadius: 8, padding: "4px 12px", color: GOLD, fontFamily: MONO, fontWeight: 600 }}>
                    {formatTip(effectiveAmount)}
                  </div>
                </div>

                <div>
                  <label style={labelS}>Your message (optional)</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Write something nice for @${handle}...`}
                    rows={3}
                    maxLength={500}
                    style={{ ...inputS, resize: "none" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelS}>Display name</label>
                    <input
                      value={isAnon ? "" : displayName}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isAnon}
                      placeholder="Your name"
                      style={{ ...inputS, opacity: isAnon ? 0.4 : 1 }}
                    />
                  </div>
                  <div>
                    <label style={labelS}>Email receipt</label>
                    <input value={fanEmail} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" style={inputS} />
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "4px 0" }}>
                  <div 
                    onClick={() => setAnon(!isAnon)}
                    style={{ 
                      width: 40, height: 22, borderRadius: 100, background: isAnon ? GOLD : SURFACE, 
                      border: `1px solid ${isAnon ? GOLD : BDR2}`, position: "relative", transition: "all 0.2s" 
                    }}
                  >
                    <div style={{ position: "absolute", top: 3, left: isAnon ? 21 : 3, width: 14, height: 14, borderRadius: "50%", background: isAnon ? "#0a0800" : SUB, transition: "all 0.2s" }} />
                  </div>
                  <span style={{ color: SUB, fontSize: 13, fontFamily: MONO }}>Post anonymously</span>
                </label>

                {error && <div style={{ color: "#f87171", fontSize: 13, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px" }}>{error}</div>}

                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button onClick={() => setStep("amount")} style={btnG}>← Back</button>
                  <button disabled={submitting} onClick={submitTip} style={btnP}>
                    {submitting ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                        <span style={{ width: 14, height: 14, border: "2px solid rgba(10,8,0,0.2)", borderTopColor: "#0a0800", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        Processing...
                      </span>
                    ) : `Send ${formatTip(effectiveAmount)} Tip →`}
                  </button>
                </div>
              </div>
            )}

            {step === "done" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h3 style={{ fontFamily: DISP, fontSize: "2rem", color: WHITE, margin: "0 0 12px" }}>Thank You!</h3>
                <p style={{ color: SUB, fontSize: 16, marginBottom: 32 }}>Your tip has been sent to @{handle}. Your message will appear on the wall shortly.</p>
                <button onClick={() => { setStep("wall"); void fetchWall(); }} style={btnP}>Back to Wall</button>
              </div>
            )}
          </div>
        )}

        {/* ── Wall of Love ── */}
        <div style={{ animation: "floatIn 1s ease both 0.2s" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: DIM, padding: "60px", fontFamily: MONO, letterSpacing: "0.1em" }}>LOADING WALL...</div>
          ) : !data || data.tips.length === 0 ? (
            <div style={{ textAlign: "center", color: DIM, padding: "80px 40px", background: SURFACE, border: `1px dotted ${BDR}`, borderRadius: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>✦</div>
              <p style={{ fontFamily: MONO, fontSize: 13, letterSpacing: "0.05em" }}>Be the first to leave a tip for @{handle}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {data.tips.map((tip) => (
                <div key={tip.id} className="glass" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BDR}`, borderRadius: 20, padding: "24px", position: "relative", overflow: "hidden", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, background: "radial-gradient(circle at top right, rgba(200,169,110,0.08), transparent)", pointerEvents: "none" }} />
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{ color: GOLD, fontFamily: MONO, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
                      {formatTip(tip.amount_cents)}
                    </div>
                    {tip.paid_at && (
                      <span style={{ color: DIM, fontSize: 10, fontFamily: MONO, marginTop: 6 }}>
                        {new Date(tip.paid_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>

                  {tip.message && (
                    <p style={{ color: WHITE, fontSize: 15, lineHeight: 1.6, margin: "0 0 20px", fontStyle: "italic", opacity: 0.9 }}>
                      &ldquo;{tip.message}&rdquo;
                    </p>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: SURFACE, border: `1px solid ${BDR}`, display: "grid", placeItems: "center", color: GOLD, fontSize: 10, fontFamily: MONO, fontWeight: 700 }}>
                      {(tip.display_name?.[0] || "?").toUpperCase()}
                    </div>
                    <span style={{ color: SUB, fontSize: 13, fontWeight: 500 }}>
                      {tip.display_name ?? <span style={{ color: DIM }}>Anonymous</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data && data.pages > 1 && (
            <div style={{ textAlign: "center", marginTop: 40, display: "flex", justifyContent: "center", gap: 8 }}>
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => void fetchWall(p)}
                  style={{ 
                    background: p === data.page ? GOLD : SURFACE, 
                    border: `1px solid ${p === data.page ? GOLD : BDR}`, 
                    borderRadius: 8, width: 36, height: 36, 
                    color: p === data.page ? "#0a0800" : SUB, 
                    cursor: "pointer", fontSize: 13, fontFamily: MONO, fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        <footer style={{ textAlign: "center", padding: "80px 0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 20, height: 1, background: DIM }} />
            <span style={{ color: DIM, fontSize: 11, fontFamily: MONO, letterSpacing: "0.2em" }}>MULUK VIP</span>
            <div style={{ width: 20, height: 1, background: DIM }} />
          </div>
          <p style={{ color: DIM, fontSize: 11 }}>Secure high-end creator economy · Powered by Whop</p>
        </footer>
      </div>
    </div>
  );
}

const inputS: React.CSSProperties = {
  width: "100%", background: SURFACE, border: `1px solid ${BDR2}`, borderRadius: 12,
  padding: "14px 16px", color: WHITE, fontSize: 15, outline: "none",
  boxSizing: "border-box", fontFamily: BODY, transition: "border-color 0.2s",
};

const labelS: React.CSSProperties = {
  display: "block", color: MUTED, fontSize: 10, fontFamily: MONO,
  marginBottom: 8, letterSpacing: "0.1em",
};

const btnP: React.CSSProperties = {
  background: GOLD, border: "none", borderRadius: 12, padding: "16px",
  color: "#0a0800", fontWeight: 700, cursor: "pointer", fontSize: 15,
  flex: 2, fontFamily: BODY, transition: "all 0.2s",
  boxShadow: `0 4px 12px rgba(200,169,110,0.2)`
};

const btnG: React.CSSProperties = {
  background: SURFACE, border: `1px solid ${BDR}`, borderRadius: 12, padding: "16px 24px",
  color: SUB, cursor: "pointer", fontSize: 14, fontFamily: BODY, transition: "all 0.2s",
  flex: 1,
};

