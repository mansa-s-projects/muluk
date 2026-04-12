"use client";

import React, { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface ContentData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  whop_checkout_url?: string | null;
  file_url: string | null;
  preview_url: string | null;
}

interface FanCodeData {
  id: string;
  code: string;
  is_paid: boolean;
  payment_method: string | null;
}

interface PaymentData {
  whopCheckoutUrl: string | null;
}

type PaymentMode = "hosted" | "embedded";

type PaymentMethodOption = "apple_pay" | "card" | "paypal";

interface PaymentConfig {
  provider: "whop";
  mode: PaymentMode;
  checkoutUrl: string | null;
}

/* ─────────────────────────────────────────
   UNLOCK PAGE
───────────────────────────────────────── */
export default function UnlockPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  const [content, setContent] = useState<ContentData | null>(null);
  const [fanCode, setFanCode] = useState<FanCodeData | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodOption>("apple_pay");

  // ── Fetch content + code status ───────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v2/unlock/${code}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Content not found");
          return;
        }
        setContent(json.data.content);
        setFanCode(json.data.fanCode);
        setPayment(json.data.payment ?? null);
        if (json.data.fanCode.is_paid || success) {
          setUnlocked(true);
        }
      } catch {
        setError("Failed to load content");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code, success]);

  // ── Pay with Whop ─────────────────────────────────────────────────────
  const handleWhopPay = async () => {
    if (!paymentConfig.checkoutUrl) {
      setError("Whop checkout link is not configured for this content");
      return;
    }

    setPaying(true);
    try {
      window.location.href = paymentConfig.checkoutUrl;
    } catch {
      setError("Payment failed — please try again");
      setPaying(false);
    }
  };

  const paymentConfig: PaymentConfig = {
    provider: "whop",
    mode: "hosted",
    checkoutUrl: payment?.whopCheckoutUrl ?? null,
  };

  const openPaymentSheet = () => {
    setError(null);
    setShowPaymentSheet(true);
  };

  const closePaymentSheet = () => {
    if (paying) return;
    setShowPaymentSheet(false);
  };

  const startCheckout = async () => {
    await handleWhopPay();
  };

  // ── Styles (inline to match MULUK design system) ─────────────────────
  const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;
  const disp = { fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" } as const;
  const gold = { color: "#c8a96e" } as const;
  const muted = { color: "rgba(255,255,255,0.45)" } as const;
  const dim = { color: "rgba(255,255,255,0.22)" } as const;
  const rim = "rgba(255,255,255,0.08)";

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#020203" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase", ...gold, marginBottom: "16px" }}>
            Loading
          </div>
          <div style={{ width: "32px", height: "32px", border: "2px solid rgba(200,169,110,0.2)", borderTop: "2px solid #c8a96e", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (error || !content || !fanCode) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#020203", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ ...disp, fontSize: "64px", fontWeight: 300, ...gold, marginBottom: "16px" }}>✦</div>
          <h1 style={{ ...disp, fontSize: "32px", fontWeight: 300, fontStyle: "italic", marginBottom: "12px" }}>
            {canceled ? "Payment cancelled" : "Content not found"}
          </h1>
          <p style={{ fontSize: "14px", fontWeight: 300, ...muted, lineHeight: 1.7 }}>
            {canceled
              ? "No worries — your code is still valid. Come back whenever you're ready."
              : error || "This unlock code doesn't exist or has expired."}
          </p>
          {canceled && (
            <button
              onClick={() => window.location.href = `/unlock/${code}`}
              style={{
                marginTop: "24px", ...mono, fontSize: "11px", letterSpacing: "0.15em",
                textTransform: "uppercase", ...gold, background: "transparent",
                border: "1px solid rgba(200,169,110,0.3)", padding: "12px 24px",
                borderRadius: "2px", cursor: "pointer", transition: "all 0.25s",
              }}
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Format price ──────────────────────────────────────────────────────
  const priceDisplay = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: content.currency?.toUpperCase() || "USD",
  }).format(content.price / 100);

  const feeDisplay = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: content.currency?.toUpperCase() || "USD",
  }).format(0);

  // ═══════════════════════════════════════════════════════════════════════
  //   UNLOCKED STATE
  // ═══════════════════════════════════════════════════════════════════════
  if (unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#020203", padding: "24px" }}>
        <div style={{ maxWidth: "680px", margin: "80px auto 0", position: "relative" }}>
          {/* Success header */}
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%",
              background: "rgba(76,200,140,0.1)", border: "1px solid rgba(76,200,140,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: "24px",
            }}>
              ✓
            </div>
            <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#4cc88c", marginBottom: "12px" }}>
              Content unlocked
            </div>
            <h1 style={{ ...disp, fontSize: "clamp(32px,5vw,48px)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.1, marginBottom: "8px" }}>
              {content.title}
            </h1>
            <div style={{ ...mono, fontSize: "11px", letterSpacing: "0.15em", ...dim }}>
              {fanCode.code} · Paid via {fanCode.payment_method === "whop" ? "whop" : fanCode.payment_method || "whop"}
            </div>
          </div>

          {/* Content */}
          <div style={{
            background: "#111120", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "4px", overflow: "hidden",
          }}>
            {content.description && (
              <div style={{ padding: "32px 32px 0", fontSize: "14px", fontWeight: 300, ...muted, lineHeight: 1.8 }}>
                {content.description}
              </div>
            )}
            <div style={{ padding: "32px" }}>
              {content.file_url && (
                <a
                  href={content.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "10px",
                    ...mono, fontSize: "12px", letterSpacing: "0.1em", ...gold,
                    textDecoration: "none", padding: "14px 24px",
                    background: "rgba(200,169,110,0.08)",
                    border: "1px solid rgba(200,169,110,0.2)",
                    borderRadius: "3px", transition: "all 0.25s",
                  }}
                >
                  ↓ Download content
                </a>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <span style={{ ...mono, fontSize: "15px", letterSpacing: "0.3em", ...gold, fontWeight: 500 }}>MULUK</span>
            <div style={{ ...mono, fontSize: "10px", ...dim, marginTop: "8px", letterSpacing: "0.12em" }}>
              Anonymous content. Instant access.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //   LOCKED STATE — PAYMENT REQUIRED
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: "#020203", padding: "24px" }}>
      <div style={{ maxWidth: "520px", margin: "80px auto 0" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <span style={{ ...mono, fontSize: "15px", letterSpacing: "0.3em", ...gold, fontWeight: 500 }}>MULUK</span>
        </div>

        {/* Content card */}
        <div style={{
          background: "#111120", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "4px", padding: "40px", position: "relative", overflow: "hidden",
        }}>
          {/* Gold accent line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #c8a96e, transparent)" }} />

          <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", ...dim, marginBottom: "8px" }}>
            Exclusive content
          </div>

          <h1 style={{ ...disp, fontSize: "clamp(28px,4vw,40px)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.15, marginBottom: "16px" }}>
            {content.title}
          </h1>

          {content.description && (
            <p style={{ fontSize: "14px", fontWeight: 300, ...muted, lineHeight: 1.8, marginBottom: "24px" }}>
              {content.description}
            </p>
          )}

          {/* Preview image */}
          {content.preview_url && (
            <div style={{
              width: "100%", height: "200px", borderRadius: "3px",
              background: `url(${content.preview_url}) center/cover`,
              border: "1px solid rgba(255,255,255,0.06)",
              marginBottom: "24px", position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, transparent 50%, rgba(2,2,3,0.8) 100%)",
              }} />
            </div>
          )}

          {/* Price */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "32px" }}>
            <span style={{ ...disp, fontSize: "42px", fontWeight: 300, ...gold }}>{priceDisplay}</span>
            <span style={{ ...mono, fontSize: "10px", letterSpacing: "0.15em", ...dim, textTransform: "uppercase" }}>
              one-time
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "28px" }} />

          {/* Payment options label */}
          <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", ...dim, marginBottom: "16px" }}>
            Payment method
          </div>

          {/* Checkout CTA */}
          <button
            onClick={openPaymentSheet}
            disabled={paying || !paymentConfig.checkoutUrl}
            id="pay-with-card-btn"
            style={{
              width: "100%", padding: "18px 24px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
              background: "#c8a96e", border: "none", borderRadius: "3px",
              color: "#0a0800", cursor: paying || !paymentConfig.checkoutUrl ? "not-allowed" : "pointer",
              ...mono, fontSize: "12px", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase",
              transition: "opacity 0.2s",
              opacity: paying || !paymentConfig.checkoutUrl ? 0.7 : 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            {paying ? "Redirecting..." : paymentConfig.checkoutUrl ? "Open Secure Checkout" : "Whop Not Configured"}
          </button>

          <div style={{ marginTop: "10px", padding: "12px 14px", border: `1px solid ${rim}`, borderRadius: "4px", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
              <div>
                <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "#c8a96e" }}>Payment shell</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.62)", marginTop: "4px" }}>Apple Pay style flow in MULUK. Secure payment is completed with Whop.</div>
              </div>
              <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{paymentConfig.mode}</div>
            </div>
          </div>

          {/* Crypto (placeholder) */}
          <button
            disabled
            id="pay-with-crypto-btn"
            style={{
              width: "100%", padding: "18px 24px", marginTop: "12px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "3px",
              color: "rgba(255,255,255,0.22)",
              cursor: "not-allowed",
              ...mono, fontSize: "12px", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12m-3-9h6m-7 3h8" />
            </svg>
            Crypto — Coming Soon
          </button>

          {/* Trust signals */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "24px", marginTop: "28px" }}>
            {[
              ["🔒", "Encrypted"],
              ["👤", "No account needed"],
              ["⚡", "Instant access"],
            ].map(([icon, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 300, ...dim }}>
                <span>{icon}</span> {label}
              </div>
            ))}
          </div>
        </div>

        {/* Code display */}
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <span style={{ ...mono, fontSize: "11px", letterSpacing: "0.15em", ...dim }}>
            Your code: {fanCode.code}
          </span>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "48px" }}>
          <div style={{ ...mono, fontSize: "10px", ...dim, letterSpacing: "0.12em" }}>
            Powered by MULUK · No login required
          </div>
        </div>
      </div>

      {showPaymentSheet && (
        <div
          onClick={closePaymentSheet}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,2,3,0.82)",
            backdropFilter: "blur(16px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "linear-gradient(180deg, #111120 0%, #09090f 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "18px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, #c8a96e, transparent)" }} />

            <div style={{ padding: "18px 18px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(200,169,110,0.8)" }}>Express checkout</div>
                <div style={{ ...disp, fontSize: "30px", fontWeight: 300, fontStyle: "italic", color: "rgba(255,255,255,0.92)", marginTop: "4px" }}>Complete payment</div>
              </div>
              <button
                onClick={closePaymentSheet}
                disabled={paying}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "999px",
                  border: `1px solid ${rim}`,
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(255,255,255,0.7)",
                  cursor: paying ? "not-allowed" : "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "0 18px 18px" }}>
              <div style={{ border: `1px solid ${rim}`, borderRadius: "14px", background: "rgba(255,255,255,0.03)", padding: "16px", marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "15px", color: "rgba(255,255,255,0.94)", marginBottom: "4px" }}>{content.title}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{content.description || "Private creator content unlock."}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ ...disp, fontSize: "26px", color: "#c8a96e" }}>{priceDisplay}</div>
                    <div style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.28)", letterSpacing: "0.16em", textTransform: "uppercase" }}>one time</div>
                  </div>
                </div>
              </div>

              <div style={{ border: `1px solid ${rim}`, borderRadius: "14px", background: "rgba(255,255,255,0.02)", padding: "12px", marginBottom: "14px" }}>
                {[
                  { key: "apple_pay", title: "Apple Pay", subtitle: "Fastest checkout when available", badge: "Priority" },
                  { key: "card", title: "Card", subtitle: "Credit or debit card via Whop", badge: "Fallback" },
                  { key: "paypal", title: "PayPal", subtitle: "Shown when supported in Whop", badge: "Optional" },
                ].map((option) => {
                  const active = selectedMethod === option.key;
                  return (
                    <button
                      key={option.key}
                      onClick={() => setSelectedMethod(option.key as PaymentMethodOption)}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 12px",
                        borderRadius: "12px",
                        border: active ? "1px solid rgba(200,169,110,0.42)" : `1px solid ${rim}`,
                        background: active ? "rgba(200,169,110,0.08)" : "transparent",
                        color: "rgba(255,255,255,0.92)",
                        marginBottom: "8px",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: option.key === "apple_pay" ? "18px" : "16px" }}>
                            {option.key === "apple_pay" ? "" : option.key === "card" ? "◫" : "P"}
                          </span>
                          <span style={{ fontSize: "14px" }}>{option.title}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.42)", marginTop: "4px" }}>{option.subtitle}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ ...mono, fontSize: "8px", letterSpacing: "0.16em", textTransform: "uppercase", color: active ? "#c8a96e" : "rgba(255,255,255,0.35)" }}>{option.badge}</span>
                        <span style={{ width: "16px", height: "16px", borderRadius: "999px", border: active ? "4px solid #c8a96e" : `1px solid ${rim}`, background: active ? "rgba(200,169,110,0.18)" : "transparent" }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ border: `1px solid ${rim}`, borderRadius: "14px", background: "rgba(255,255,255,0.02)", padding: "14px 16px", marginBottom: "14px" }}>
                {[
                  ["Subtotal", priceDisplay],
                  ["Processing", feeDisplay],
                  ["Provider", "Whop secure checkout"],
                ].map(([label, value], index) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: index === 2 ? "10px 0 0" : "0 0 10px", borderTop: index === 2 ? `1px solid ${rim}` : "none", marginTop: index === 2 ? "10px" : "0" }}>
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{label}</span>
                    <span style={{ ...mono, fontSize: "11px", color: "rgba(255,255,255,0.82)" }}>{value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={startCheckout}
                disabled={paying || !paymentConfig.checkoutUrl}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "14px",
                  padding: "16px 18px",
                  background: selectedMethod === "apple_pay" ? "linear-gradient(180deg, #ffffff 0%, #d9d9d9 100%)" : "#c8a96e",
                  color: selectedMethod === "apple_pay" ? "#000" : "#120c00",
                  cursor: paying || !paymentConfig.checkoutUrl ? "not-allowed" : "pointer",
                  opacity: paying || !paymentConfig.checkoutUrl ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: selectedMethod === "apple_pay" ? "20px" : "14px" }}>{selectedMethod === "apple_pay" ? "" : "→"}</span>
                <span style={{ ...mono, letterSpacing: "0.14em", textTransform: "uppercase", fontSize: "11px" }}>
                  {paying ? "Redirecting" : selectedMethod === "apple_pay" ? "Pay with Apple Pay" : `Continue with ${selectedMethod === "card" ? "Card" : "PayPal"}`}
                </span>
              </button>

              <div style={{ marginTop: "12px", textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.36)", lineHeight: 1.6 }}>
                The final payment step opens on Whop. This payment sheet is ready to support embedded checkout later without changing the MULUK unlock flow.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
