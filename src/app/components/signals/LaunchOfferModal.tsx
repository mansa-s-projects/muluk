"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Signal } from "./SignalCard";

type ActionPlan = {
  headline: string;
  offer_title: string;
  offer_description: string;
  price: number;
  offer_type: string;
  launch_steps: Array<{ day: number; action: string }>;
  caption: string;
  dm_script: string;
  expected_revenue_low: number;
  expected_revenue_high: number;
};

type Props = {
  signal: Signal;
  onClose: () => void;
  onLaunched: (signalId: string) => void;
};

export default function LaunchOfferModal({ signal, onClose, onLaunched }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"plan" | "caption" | "dm">("plan");

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/signals/action-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal_id: signal.id }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { plan: ActionPlan };
      setPlan(data.plan);
    } catch {
      // Silent — will show fallback UI
    } finally {
      setLoading(false);
    }
  }, [signal.id]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  };

  const handleLaunch = async () => {
    await fetch("/api/signals/engage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal_id: signal.id, action: "launch" }),
    });
    onLaunched(signal.id);
    onClose();
  };

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: "8px 18px",
    background: active ? "rgba(200,169,110,0.1)" : "transparent",
    border: `1px solid ${active ? "rgba(200,169,110,0.3)" : "rgba(255,255,255,0.07)"}`,
    borderRadius: "4px",
    color: active ? "var(--gold)" : "rgba(255,255,255,0.35)",
    fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.18em",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(2,2,3,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "640px",
          maxHeight: "90vh",
          background: "#0d0d18",
          border: "1px solid rgba(200,169,110,0.2)",
          borderRadius: "14px",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "20px 24px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.22em", color: "var(--gold-dim)", marginBottom: "6px" }}>
                SIGNAL BOARD · ACTION PLAN
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 300, color: "rgba(255,255,255,0.92)", lineHeight: 1.2 }}>
                {signal.title}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: "none",
                color: "rgba(255,255,255,0.3)", cursor: "pointer",
                fontSize: "20px", lineHeight: 1, padding: "4px",
              }}
            >×</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                border: "2px solid rgba(200,169,110,0.15)",
                borderTop: "2px solid var(--gold)",
                margin: "0 auto 16px",
                animation: "spin 0.8s linear infinite",
              }} />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)" }}>
                GENERATING ACTION PLAN…
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : plan ? (
            <>
              {/* Headline + Revenue */}
              <div style={{
                padding: "14px 18px", marginBottom: "20px",
                background: "rgba(200,169,110,0.06)",
                border: "1px solid rgba(200,169,110,0.14)",
                borderRadius: "8px",
              }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 300, fontStyle: "italic", color: "var(--gold)", marginBottom: "8px" }}>
                  {plan.headline}
                </div>
                <div style={{ display: "flex", gap: "24px" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "0.18em", color: "rgba(200,169,110,0.5)", marginBottom: "2px" }}>SUGGESTED PRICE</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "20px", color: "var(--gold)", fontWeight: 500 }}>${plan.price}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.25)", marginBottom: "2px" }}>EXPECTED REVENUE</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
                      ${plan.expected_revenue_low.toLocaleString()} – ${plan.expected_revenue_high.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Offer summary */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.28)", marginBottom: "6px" }}>OFFER</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 300, color: "rgba(255,255,255,0.9)", marginBottom: "6px" }}>{plan.offer_title}</div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, fontFamily: "var(--font-body)" }}>{plan.offer_description}</div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
                <button style={TAB_STYLE(tab === "plan")}    onClick={() => setTab("plan")}>5-DAY PLAN</button>
                <button style={TAB_STYLE(tab === "caption")} onClick={() => setTab("caption")}>CAPTION</button>
                <button style={TAB_STYLE(tab === "dm")}      onClick={() => setTab("dm")}>DM SCRIPT</button>
              </div>

              {/* Tab: 5-day plan */}
              {tab === "plan" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {plan.launch_steps.map(step => (
                    <div key={step.day} style={{
                      display: "flex", gap: "12px", alignItems: "flex-start",
                      padding: "12px 14px",
                      background: "#111120",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: "7px",
                    }}>
                      <div style={{
                        flexShrink: 0,
                        fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.12em",
                        color: "var(--gold)", background: "rgba(200,169,110,0.1)",
                        padding: "3px 7px", borderRadius: "3px", marginTop: "1px",
                      }}>
                        DAY {step.day}
                      </div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                        {step.action}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: caption */}
              {tab === "caption" && (
                <div>
                  <div style={{
                    padding: "16px", background: "#111120",
                    border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px",
                    fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.65)",
                    lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: "10px",
                  }}>
                    {plan.caption}
                  </div>
                  <button
                    onClick={() => copy("caption", plan.caption)}
                    style={{
                      width: "100%", padding: "10px",
                      background: copied.caption ? "rgba(80,212,138,0.1)" : "rgba(200,169,110,0.06)",
                      border: `1px solid ${copied.caption ? "rgba(80,212,138,0.25)" : "rgba(200,169,110,0.18)"}`,
                      borderRadius: "5px", color: copied.caption ? "#50d48a" : "var(--gold)",
                      fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.15em", cursor: "pointer",
                    }}
                  >
                    {copied.caption ? "✓ COPIED" : "COPY CAPTION"}
                  </button>
                </div>
              )}

              {/* Tab: DM script */}
              {tab === "dm" && (
                <div>
                  <div style={{
                    padding: "16px", background: "#111120",
                    border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px",
                    fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.65)",
                    lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: "10px",
                  }}>
                    {plan.dm_script}
                  </div>
                  <button
                    onClick={() => copy("dm", plan.dm_script)}
                    style={{
                      width: "100%", padding: "10px",
                      background: copied.dm ? "rgba(80,212,138,0.1)" : "rgba(200,169,110,0.06)",
                      border: `1px solid ${copied.dm ? "rgba(80,212,138,0.25)" : "rgba(200,169,110,0.18)"}`,
                      borderRadius: "5px", color: copied.dm ? "#50d48a" : "var(--gold)",
                      fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.15em", cursor: "pointer",
                    }}
                  >
                    {copied.dm ? "✓ COPIED" : "COPY DM SCRIPT"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
              Failed to generate plan. Try again.
            </div>
          )}
        </div>

        {/* ── Footer CTA ── */}
        <div style={{
          padding: "18px 24px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", gap: "10px", flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "13px 20px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px",
              color: "rgba(255,255,255,0.35)",
              fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.14em",
              cursor: "pointer",
            }}
          >
            CLOSE
          </button>
          {plan && (
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  action: "create",
                  title: plan.offer_title,
                  price: String(plan.price),
                });
                router.push(`/dashboard/vault?${params.toString()}`);
              }}
              style={{
                padding: "13px 18px",
                background: "transparent",
                border: "1px solid rgba(200,169,110,0.35)",
                borderRadius: "4px",
                color: "rgba(200,169,110,0.75)",
                fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.14em",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              + VAULT ITEM
            </button>
          )}
          <button
            onClick={handleLaunch}
            disabled={loading}
            style={{
              flex: 1,
              padding: "13px 24px",
              background: "var(--gold)", border: "none", borderRadius: "4px",
              color: "#0a0800",
              fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.18em", fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            LAUNCH THIS OFFER →
          </button>
        </div>
      </div>
    </div>
  );
}
