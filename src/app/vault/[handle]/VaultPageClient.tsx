"use client";

import { useState } from "react";

interface VaultItem {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  content_type: "image" | "video";
  preview_path: string | null;
  purchase_count: number;
}

interface Creator {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Props {
  creator: Creator;
  items: VaultItem[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function previewUrl(path: string | null) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/vault-previews/${path}`;
}

function formatPrice(cents: number) {
  if (cents % 100 === 0) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
}

export default function VaultPageClient({ creator, items }: Props) {
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!email.includes("@")) { setCheckoutError("Please enter a valid email."); return; }

    setLoading(true);
    setCheckoutError("");

    try {
      const res = await fetch(`/api/vault/${selectedItem.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer_email: email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Checkout failed");
      window.location.href = json.checkout_url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--void)",
        position: "relative",
      }}
    >
      {/* Noise texture */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Hero header ── */}
        <div
          style={{
            borderBottom: "1px solid var(--rim)",
            padding: "56px 32px 40px",
            textAlign: "center",
            maxWidth: 800,
            margin: "0 auto",
          }}
        >
          {creator.avatarUrl && (
            <img
              src={creator.avatarUrl}
              alt={creator.displayName}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                border: "1px solid rgba(200,169,110,0.3)",
                objectFit: "cover",
                marginBottom: 20,
              }}
            />
          )}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--gold-dim)",
              marginBottom: 12,
            }}
          >
            Private Vault
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              fontSize: "clamp(36px, 6vw, 60px)",
              color: "var(--white)",
              margin: "0 0 12px",
              lineHeight: 1.2,
            }}
          >
            {creator.displayName}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 15,
              color: "var(--muted)",
              fontWeight: 300,
              margin: 0,
            }}
          >
            Exclusive content unlocked with a one-time payment.
          </p>
        </div>

        {/* ── Grid ── */}
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "40px 24px 80px",
          }}
        >
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--muted)" }}>
                Nothing in the vault yet. Check back soon.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 24,
              }}
            >
              {items.map((item) => {
                const pUrl = previewUrl(item.preview_path);
                return (
                  <div
                    key={item.id}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--rim)",
                      borderRadius: 10,
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "border-color 0.25s, transform 0.25s",
                    }}
                    onClick={() => { setSelectedItem(item); setEmail(""); setCheckoutError(""); }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(200,169,110,0.3)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "var(--rim)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    }}
                  >
                    {/* Preview with lock overlay */}
                    <div
                      style={{
                        position: "relative",
                        aspectRatio: "16/9",
                        background: "var(--ink)",
                        overflow: "hidden",
                      }}
                    >
                      {pUrl ? (
                        <img
                          src={pUrl}
                          alt={item.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            filter: "blur(18px) saturate(0.15) brightness(0.6)",
                            transform: "scale(1.08)",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            background: "linear-gradient(135deg, var(--card2), var(--surface))",
                          }}
                        />
                      )}

                      {/* Lock overlay */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(2,2,3,0.45)",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            background: "var(--gold-glow)",
                            border: "1px solid rgba(200,169,110,0.35)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                          }}
                        >
                          🔒
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            fontWeight: 500,
                            color: "var(--gold)",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {formatPrice(item.price_cents)}
                        </div>
                      </div>

                      {/* Content type badge */}
                      <div
                        style={{
                          position: "absolute",
                          top: 10,
                          left: 10,
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          padding: "4px 10px",
                          borderRadius: 100,
                          background: "rgba(2,2,3,0.7)",
                          border: "1px solid var(--rim2)",
                          color: "var(--muted)",
                        }}
                      >
                        {item.content_type}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: "18px 20px" }}>
                      <h3
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 400,
                          fontSize: 19,
                          color: "var(--white)",
                          margin: "0 0 6px",
                          lineHeight: 1.3,
                        }}
                      >
                        {item.title}
                      </h3>
                      {item.description && (
                        <p
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: 13,
                            color: "var(--muted)",
                            fontWeight: 300,
                            margin: "0 0 14px",
                            lineHeight: 1.5,
                          }}
                        >
                          {item.description.slice(0, 90)}{item.description.length > 90 ? "…" : ""}
                        </p>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            color: "var(--dim)",
                          }}
                        >
                          {item.purchase_count} unlock{item.purchase_count !== 1 ? "s" : ""}
                        </span>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            fontWeight: 500,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: "var(--gold)",
                            border: "1px solid rgba(200,169,110,0.3)",
                            borderRadius: 3,
                            padding: "6px 12px",
                          }}
                        >
                          Unlock
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Checkout Modal ── */}
      {selectedItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,2,3,0.88)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedItem(null); }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--rim2)",
              borderRadius: 12,
              width: "100%",
              maxWidth: 420,
              overflow: "hidden",
            }}
          >
            {/* Preview thumbnail */}
            {selectedItem.preview_path && (
              <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
                <img
                  src={previewUrl(selectedItem.preview_path)!}
                  alt={selectedItem.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "blur(20px) saturate(0.1) brightness(0.5)",
                    transform: "scale(1.1)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(2,2,3,0.4)",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 6 }}>🔒</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--gold)", fontWeight: 500 }}>
                      {formatPrice(selectedItem.price_cents)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: "24px 28px" }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 300,
                  fontSize: 24,
                  color: "var(--white)",
                  margin: "0 0 8px",
                }}
              >
                {selectedItem.title}
              </h2>
              {selectedItem.description && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)", fontWeight: 300, margin: "0 0 20px", lineHeight: 1.6 }}>
                  {selectedItem.description}
                </p>
              )}

              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--amber)",
                  background: "rgba(232,168,48,0.12)",
                  border: "1px solid rgba(232,168,48,0.3)",
                  borderRadius: 4,
                  padding: "8px 10px",
                  marginBottom: 16,
                }}
              >
                Limited unlock window. Access link expires after purchase session.
              </div>

              <form onSubmit={handleUnlock} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Your email — for delivery
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--rim2)",
                      borderRadius: 3,
                      color: "var(--white)",
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      fontWeight: 300,
                      padding: "12px 16px",
                      width: "100%",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {checkoutError && (
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
                      color: "var(--red)",
                      background: "var(--red-d)",
                      border: "1px solid rgba(224,85,85,0.25)",
                      borderRadius: 3,
                      padding: "10px 14px",
                    }}
                  >
                    {checkoutError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: loading ? "var(--gold-dim)" : "var(--gold)",
                    color: "#0a0800",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    padding: "14px",
                    border: "none",
                    borderRadius: 3,
                    cursor: loading ? "not-allowed" : "pointer",
                    width: "100%",
                  }}
                >
                  {loading ? "Redirecting…" : `Unlock for ${formatPrice(selectedItem.price_cents)}`}
                </button>
              </form>

              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--dim)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "center",
                  marginTop: 12,
                  padding: "8px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
