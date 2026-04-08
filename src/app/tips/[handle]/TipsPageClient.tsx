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

export default function TipsPageClient({ handle }: Props) {
  const [data, setData]       = useState<TipWallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep]       = useState<TipStep>("wall");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState("");

  // Tip form
  const [amount, setAmount]         = useState(0);
  const [customAmount, setCustom]   = useState("");
  const [message, setMessage]       = useState("");
  const [displayName, setName]      = useState("");
  const [isAnon, setAnon]           = useState(false);
  const [fanEmail, setEmail]        = useState("");

  const effectiveAmount = amount || (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0);

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
    <div style={{ minHeight: "100vh", background: "var(--void)", fontFamily: "var(--font-body)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "inline-block", background: "var(--gold-trace)", border: "1px solid var(--gold-mid)", borderRadius: 20, padding: "0.4rem 1rem", marginBottom: "1.5rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.12em" }}>WALL OF LOVE</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.75rem", fontWeight: 400, color: "var(--white)", margin: "0 0 0.75rem" }}>
            @{handle}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9375rem", marginBottom: "2rem" }}>
            Support with a tip — your message shows up right here
          </p>
          {step === "wall" && (
            <button
              onClick={() => setStep("amount")}
              style={{ background: "var(--gold)", border: "none", borderRadius: 12, padding: "0.875rem 2.5rem", color: "var(--void)", fontWeight: 700, fontSize: "1rem", cursor: "pointer", letterSpacing: "0.02em" }}
            >
              Send a Tip ✦
            </button>
          )}
        </div>

        {/* ── Tip Modal / Steps ── */}
        {step !== "wall" && (
          <div style={{ background: "var(--card)", border: "1px solid var(--rim2)", borderRadius: 20, padding: "2rem", marginBottom: "2rem" }}>

            {step === "amount" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--white)", margin: 0 }}>Choose an amount</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                  {TIP_PRESETS.map((cents) => (
                    <button
                      key={cents}
                      type="button"
                      onClick={() => { setAmount(cents); setCustom(""); }}
                      style={{ background: amount === cents ? "var(--gold-trace)" : "var(--surface)", border: `1px solid ${amount === cents ? "var(--gold)" : "var(--rim)"}`, borderRadius: 10, padding: "1rem", color: amount === cents ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "1.125rem", fontWeight: 600 }}
                    >
                      {formatTip(cents)}
                    </button>
                  ))}
                </div>
                <div>
                  <label style={labelStyle}>Custom amount</label>
                  <input
                    value={customAmount}
                    onChange={(e) => { setCustom(e.target.value); setAmount(0); }}
                    placeholder="$"
                    type="number"
                    min="1"
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={() => setStep("wall")} style={btnGhost}>Cancel</button>
                  <button
                    disabled={effectiveAmount < 100}
                    onClick={() => setStep("info")}
                    style={{ ...btnGold, flex: 2, opacity: effectiveAmount < 100 ? 0.4 : 1 }}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {step === "info" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--white)", margin: 0 }}>Leave a message</h3>
                  <span style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "1.25rem" }}>{formatTip(effectiveAmount)}</span>
                </div>
                <div>
                  <label style={labelStyle}>Your message (optional)</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Your kind words for @{handle}..."
                    rows={3}
                    maxLength={500}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Your name (optional)</label>
                  <input
                    value={isAnon ? "" : displayName}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isAnon}
                    placeholder="How you&apos;d like to appear on the wall"
                    style={{ ...inputStyle, opacity: isAnon ? 0.4 : 1 }}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={isAnon} onChange={(e) => setAnon(e.target.checked)} style={{ accentColor: "var(--gold)", width: 14, height: 14 }} />
                    <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>Post anonymously</span>
                  </label>
                </div>
                <div>
                  <label style={labelStyle}>Email (for receipt — optional)</label>
                  <input value={fanEmail} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" style={inputStyle} />
                </div>
                {error && <div style={{ color: "var(--red)", fontSize: "0.8125rem", background: "var(--red-d)", border: "1px solid rgba(224,85,85,0.3)", borderRadius: 8, padding: "0.75rem" }}>{error}</div>}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={() => setStep("amount")} style={btnGhost}>← Back</button>
                  <button disabled={submitting} onClick={submitTip} style={{ ...btnGold, flex: 2 }}>
                    {submitting ? "Processing…" : `Send ${formatTip(effectiveAmount)} Tip →`}
                  </button>
                </div>
              </div>
            )}

            {step === "done" && (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✦</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "var(--white)", margin: "0 0 0.75rem" }}>Thank You!</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>Your tip has been sent to @{handle}.</p>
                <button onClick={() => { setStep("wall"); setAmount(0); setCustom(""); setMessage(""); setName(""); setAnon(false); setEmail(""); void fetchWall(); }} style={btnGold}>
                  Back to Wall
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Wall of Love ── */}
        <div>
          {loading ? (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: "3rem" }}>Loading wall…</div>
          ) : !data || data.tips.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--dim)", padding: "3rem", background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 16 }}>
              Be the first to leave a tip!
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {data.tips.map((tip) => (
                <div key={tip.id} style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 14, padding: "1.25rem", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: "radial-gradient(circle at top right, rgba(200,169,110,0.07), transparent)", pointerEvents: "none" }} />
                  <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                    {formatTip(tip.amount_cents)}
                  </div>
                  {tip.message && (
                    <p style={{ color: "var(--white)", fontSize: "0.875rem", lineHeight: 1.55, margin: "0 0 0.75rem", fontStyle: "italic" }}>
                      &ldquo;{tip.message}&rdquo;
                    </p>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
                      {tip.display_name ?? <span style={{ color: "var(--dim)" }}>Anonymous</span>}
                    </span>
                    {tip.paid_at && (
                      <span style={{ color: "var(--dim)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                        {new Date(tip.paid_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {data && data.pages > 1 && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => void fetchWall(p)}
                  style={{ background: p === data.page ? "var(--gold-trace)" : "var(--card)", border: `1px solid ${p === data.page ? "var(--gold)" : "var(--rim)"}`, borderRadius: 8, padding: "0.4rem 0.75rem", color: p === data.page ? "var(--gold)" : "var(--muted)", cursor: "pointer", margin: "0 0.25rem", fontSize: "0.8125rem" }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", color: "var(--dim)", fontSize: "0.75rem", marginTop: "3rem" }}>
          Powered by CIPHER · Secure payments
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--surface)", border: "1px solid var(--rim2)", borderRadius: 10,
  padding: "0.75rem", color: "var(--white)", fontSize: "0.9rem", outline: "none",
  boxSizing: "border-box", fontFamily: "var(--font-body)",
};

const labelStyle: React.CSSProperties = {
  display: "block", color: "var(--muted)", fontSize: "0.75rem",
  marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em",
};

const btnGold: React.CSSProperties = {
  background: "var(--gold)", border: "none", borderRadius: 10, padding: "0.875rem",
  color: "var(--void)", fontWeight: 700, cursor: "pointer", fontSize: "0.9375rem",
  width: "100%", fontFamily: "var(--font-body)",
};

const btnGhost: React.CSSProperties = {
  background: "none", border: "1px solid var(--rim)", borderRadius: 10, padding: "0.875rem 1.25rem",
  color: "var(--muted)", cursor: "pointer", fontSize: "0.9rem", fontFamily: "var(--font-body)",
};
