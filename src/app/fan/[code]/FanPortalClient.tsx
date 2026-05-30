"use client";

import Link from "next/link";
import { useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type FanCode = {
  code: string;
  status: string;
  isVip: boolean;
  tags: string[];
  joinedAt: string;
};

type Creator = {
  name: string | null;
  handle: string | null;
  bio: string | null;
  category: string | null;
  phantomMode: boolean;
};

type ContentItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  burnMode: boolean;
  expiresAt: string | null;
  createdAt: string;
};

type TxRow = {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
};

type PortalData = {
  fanCode: FanCode;
  creator: Creator | null;
  content: ContentItem[];
  history: TxRow[];
  unlocked: string[];
  creatorId: string;
};

type Props = {
  code: string;
  error: "invalid" | "not_found" | null;
  data: PortalData | null;
};

// ─── Style constants ───────────────────────────────────────────────────────────
const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display)" };

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Unlock Modal ──────────────────────────────────────────────────────────────
function UnlockModal({
  item,
  code,
  creatorId,
  alreadyUnlocked,
  onClose,
}: {
  item: ContentItem;
  code: string;
  creatorId: string;
  alreadyUnlocked: boolean;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleNotify = async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/fan-portal/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: item.id, creatorId }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.80)",
        backdropFilter: "blur(10px)",
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#0d0d18",
          border: "1px solid rgba(200,169,110,0.3)",
          borderRadius: "12px",
          padding: "28px",
          position: "relative",
        }}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.3)",
            fontSize: "20px",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >×</button>

        <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", color: "rgba(200,169,110,0.5)", marginBottom: "6px" }}>
          CONTENT UNLOCK
        </div>
        <div style={{ ...disp, fontSize: "26px", color: "#c8a96e", marginBottom: "6px" }}>
          {item.title}
        </div>
        {item.description && (
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "20px" }}>
            {item.description}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            background: "rgba(200,169,110,0.06)",
            border: "1px solid rgba(200,169,110,0.2)",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <span style={{ ...mono, fontSize: "11px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>
            PRICE
          </span>
          <span style={{ ...disp, fontSize: "28px", color: "#c8a96e" }}>
            {money.format(item.price)}
          </span>
        </div>

        {/* Payment options */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", marginBottom: "10px" }}>
            PAYMENT METHODS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { label: "USDC on Polygon", sub: "Instant · 0% fee", soon: false },
              { label: "Credit / Debit Card", sub: "Stripe · 2.9% fee", soon: true },
              { label: "Crypto Wallet", sub: "ETH, SOL, BTC", soon: true },
            ].map((opt) => (
              <div
                key={opt.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: opt.soon ? "transparent" : "rgba(200,169,110,0.05)",
                  border: `1px solid ${opt.soon ? "rgba(255,255,255,0.06)" : "rgba(200,169,110,0.18)"}`,
                  borderRadius: "6px",
                  opacity: opt.soon ? 0.45 : 1,
                }}
              >
                <div>
                  <div style={{ ...mono, fontSize: "11px", color: opt.soon ? "rgba(255,255,255,0.4)" : "#c8a96e", letterSpacing: "0.06em" }}>
                    {opt.label}
                  </div>
                  <div style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.25)", marginTop: "2px" }}>
                    {opt.sub}
                  </div>
                </div>
                {opt.soon && (
                  <span style={{ ...mono, fontSize: "8px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)", padding: "3px 8px", borderRadius: "99px" }}>
                    SOON
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {alreadyUnlocked || status === "done" ? (
          <div
            style={{
              textAlign: "center",
              padding: "14px",
              background: "rgba(76,200,140,0.06)",
              border: "1px solid rgba(76,200,140,0.25)",
              borderRadius: "8px",
              ...mono,
              fontSize: "11px",
              color: "#4cc88c",
              letterSpacing: "0.12em",
            }}
          >
            ✓ YOU'LL BE NOTIFIED WHEN PAYMENTS GO LIVE
          </div>
        ) : (
          <button
            onClick={handleNotify}
            disabled={status === "loading"}
            style={{
              width: "100%",
              padding: "14px",
              background: status === "error" ? "rgba(200,76,76,0.12)" : "linear-gradient(135deg, rgba(200,169,110,0.18), rgba(200,169,110,0.08))",
              border: `1px solid ${status === "error" ? "rgba(200,76,76,0.4)" : "rgba(200,169,110,0.4)"}`,
              borderRadius: "8px",
              color: status === "error" ? "#e88888" : "#c8a96e",
              cursor: status === "loading" ? "wait" : "pointer",
              ...mono,
              fontSize: "11px",
              letterSpacing: "0.18em",
              transition: "all 0.2s",
            }}
          >
            {status === "loading"
              ? "SAVING..."
              : status === "error"
              ? "ERROR — TRY AGAIN"
              : "NOTIFY ME WHEN AVAILABLE"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Error Page ────────────────────────────────────────────────────────────────
function ErrorPage({ code, type }: { code: string; type: "invalid" | "not_found" }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080810",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        color: "#fff",
      }}
    >
      {/* Wordmark */}
      <div style={{ ...disp, fontSize: "28px", letterSpacing: "0.25em", color: "#c8a96e", marginBottom: "48px" }}>
        CIPHER
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          textAlign: "center",
          padding: "40px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "12px",
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>◎</div>
        <div style={{ ...disp, fontSize: "24px", color: "rgba(255,255,255,0.8)", marginBottom: "10px" }}>
          {type === "invalid" ? "Invalid Code" : "Code Not Found"}
        </div>
        <div style={{ ...mono, fontSize: "11px", color: "rgba(255,255,255,0.3)", lineHeight: 1.7, marginBottom: "8px" }}>
          {type === "invalid"
            ? "This code format is not recognised."
            : "This fan code doesn't exist or is no longer active."}
        </div>
        <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.15)", marginBottom: "32px", letterSpacing: "0.1em" }}>
          CODE: {code.toUpperCase()}
        </div>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "rgba(200,169,110,0.08)",
            border: "1px solid rgba(200,169,110,0.25)",
            borderRadius: "6px",
            color: "#c8a96e",
            textDecoration: "none",
            ...mono,
            fontSize: "10px",
            letterSpacing: "0.18em",
          }}
        >
          ← CIPHER HOME
        </Link>
      </div>
    </div>
  );
}

// ─── Main Portal ───────────────────────────────────────────────────────────────
export default function FanPortalClient({ code, error, data }: Props) {
  const [unlockTarget, setUnlockTarget] = useState<ContentItem | null>(null);
  const [localUnlocked, setLocalUnlocked] = useState<Set<string>>(
    new Set(data?.unlocked ?? [])
  );

  if (error) return <ErrorPage code={code} type={error} />;
  if (!data) return null;

  const { fanCode, creator, content, history, creatorId } = data;
  const freeContent = content.filter((c) => c.price === 0);
  const paidContent = content.filter((c) => c.price > 0);
  const creatorHandle = creator?.handle ?? "Unknown Creator";

  const handleUnlockClose = (notified: boolean, itemId?: string) => {
    if (notified && itemId) {
      setLocalUnlocked((prev) => new Set([...prev, itemId]));
    }
    setUnlockTarget(null);
  };

  return (
    <>
      {/* Unlock Modal */}
      {unlockTarget && (
        <UnlockModal
          item={unlockTarget}
          code={code}
          creatorId={creatorId}
          alreadyUnlocked={localUnlocked.has(unlockTarget.id)}
          onClose={() => handleUnlockClose(false)}
        />
      )}

      <div
        style={{
          minHeight: "100vh",
          background: "#080810",
          color: "#fff",
          paddingBottom: "80px",
        }}
      >
        {/* ── Header ── */}
        <header
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.055)",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "rgba(8,8,16,0.92)",
            backdropFilter: "blur(12px)",
            zIndex: 100,
          }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ ...disp, fontSize: "20px", letterSpacing: "0.2em", color: "#c8a96e" }}>
              CIPHER
            </span>
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "999px",
              ...mono,
              fontSize: "9px",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.15em",
            }}
          >
            <span style={{ fontSize: "11px" }}>◎</span>
            ANONYMOUS
          </div>
        </header>

        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 20px" }}>

          {/* ── Identity Card ── */}
          <div
            style={{
              margin: "32px 0 28px",
              padding: "24px",
              background: "linear-gradient(135deg, rgba(200,169,110,0.07), rgba(200,169,110,0.02))",
              border: "1px solid rgba(200,169,110,0.2)",
              borderRadius: "12px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background glyph */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                right: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "72px",
                color: "rgba(200,169,110,0.06)",
                ...disp,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              ◈
            </div>

            <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", color: "rgba(200,169,110,0.5)", marginBottom: "10px" }}>
              YOUR CIPHER CODE
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
              <div style={{ ...disp, fontSize: "clamp(22px, 5vw, 34px)", color: "#c8a96e", letterSpacing: "0.1em" }}>
                {fanCode.code.toUpperCase()}
              </div>
              {fanCode.isVip && (
                <span
                  style={{
                    padding: "3px 10px",
                    background: "rgba(200,169,110,0.15)",
                    border: "1px solid rgba(200,169,110,0.4)",
                    borderRadius: "4px",
                    ...mono,
                    fontSize: "9px",
                    color: "#c8a96e",
                    letterSpacing: "0.18em",
                  }}
                >
                  ✦ VIP
                </span>
              )}
              <span
                style={{
                  padding: "3px 10px",
                  background: "rgba(76,200,140,0.08)",
                  border: "1px solid rgba(76,200,140,0.2)",
                  borderRadius: "4px",
                  ...mono,
                  fontSize: "9px",
                  color: "#4cc88c",
                  letterSpacing: "0.14em",
                }}
              >
                ● ACTIVE
              </span>
            </div>

            {fanCode.tags.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                {fanCode.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: "2px 8px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      borderRadius: "4px",
                      ...mono,
                      fontSize: "9px",
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
              JOINED {fmt(fanCode.joinedAt).toUpperCase()}
            </div>
          </div>

          {/* ── Creator Profile ── */}
          {creator && (
            <section style={{ marginBottom: "32px" }}>
              <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)", marginBottom: "12px" }}>
                CREATOR
              </div>
              <div
                style={{
                  padding: "20px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  filter: creator.phantomMode ? "blur(4px)" : "none",
                  userSelect: creator.phantomMode ? "none" : "auto",
                  transition: "filter 0.3s",
                  position: "relative",
                }}
              >
                {creator.phantomMode && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 2,
                      gap: "6px",
                    }}
                  >
                    <span style={{ fontSize: "28px" }}>👁</span>
                    <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em" }}>
                      STEALTH MODE
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, rgba(200,169,110,0.3), rgba(200,169,110,0.08))",
                      border: "1px solid rgba(200,169,110,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      ...disp,
                      fontSize: "22px",
                      color: "#c8a96e",
                    }}
                  >
                    {creator.handle ? creator.handle[0].toUpperCase() : "◈"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                      <div style={{ ...disp, fontSize: "22px", color: "rgba(255,255,255,0.9)" }}>
                        {creator.name ?? `@${creatorHandle}`}
                      </div>
                      {creator.handle && creator.name && (
                        <div style={{ ...mono, fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                          @{creator.handle}
                        </div>
                      )}
                      {creator.category && (
                        <span
                          style={{
                            padding: "2px 10px",
                            background: "rgba(152,152,204,0.1)",
                            border: "1px solid rgba(152,152,204,0.2)",
                            borderRadius: "4px",
                            ...mono,
                            fontSize: "9px",
                            color: "rgba(152,152,204,0.8)",
                            letterSpacing: "0.12em",
                          }}
                        >
                          {creator.category.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {creator.bio && (
                      <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
                        {creator.bio}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Content Vault ── */}
          <section style={{ marginBottom: "36px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)" }}>
                CONTENT VAULT
              </div>
              <div style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>
                {content.length} ITEM{content.length !== 1 ? "S" : ""}
              </div>
            </div>

            {content.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 24px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px dashed rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  ...mono,
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.2)",
                  letterSpacing: "0.1em",
                }}
              >
                NO CONTENT PUBLISHED YET
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {/* Free content */}
                {freeContent.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    unlocked
                    onUnlock={() => setUnlockTarget(item)}
                  />
                ))}
                {/* Paid content */}
                {paidContent.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    unlocked={localUnlocked.has(item.id)}
                    onUnlock={() => setUnlockTarget(item)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Activity History ── */}
          <section style={{ marginBottom: "36px" }}>
            <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)", marginBottom: "14px" }}>
              YOUR ACTIVITY
            </div>

            {history.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 24px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px dashed rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  ...mono,
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.2)",
                  letterSpacing: "0.1em",
                }}
              >
                NO ACTIVITY YET
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {history.map((tx, idx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      borderBottom: idx < history.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}
                  >
                    <div>
                      <div style={{ ...mono, fontSize: "11px", color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em", marginBottom: "2px" }}>
                        {(tx.type ?? "PAYMENT").toUpperCase()}
                      </div>
                      <div style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>
                        {fmt(tx.createdAt)}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          ...mono,
                          fontSize: "9px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: tx.status === "completed"
                            ? "rgba(76,200,140,0.08)"
                            : "rgba(255,255,255,0.04)",
                          color: tx.status === "completed"
                            ? "#4cc88c"
                            : "rgba(255,255,255,0.3)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {tx.status.toUpperCase()}
                      </span>
                      <span style={{ ...disp, fontSize: "18px", color: "#c8a96e" }}>
                        {money.format(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Footer ── */}
          <footer
            style={{
              borderTop: "1px solid rgba(255,255,255,0.05)",
              paddingTop: "28px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
              textAlign: "center",
            }}
          >
            <div style={{ ...disp, fontSize: "18px", letterSpacing: "0.2em", color: "rgba(200,169,110,0.5)" }}>
              CIPHER
            </div>
            <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.15)", letterSpacing: "0.1em", lineHeight: 1.8 }}>
              YOUR IDENTITY IS ANONYMOUS.
              <br />
              YOUR CODE IS YOUR KEY.
            </div>
            <Link
              href="/apply"
              style={{
                ...mono,
                fontSize: "10px",
                letterSpacing: "0.15em",
                color: "rgba(200,169,110,0.5)",
                textDecoration: "none",
                padding: "8px 16px",
                border: "1px solid rgba(200,169,110,0.15)",
                borderRadius: "6px",
                transition: "all 0.2s",
              }}
            >
              ARE YOU A CREATOR? APPLY →
            </Link>
            <div style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.1)", letterSpacing: "0.1em" }}>
              © {new Date().getFullYear()} CIPHER · 88% CREATOR PAYOUT
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}

// ─── Content Card ──────────────────────────────────────────────────────────────
function ContentCard({
  item,
  unlocked,
  onUnlock,
}: {
  item: ContentItem;
  unlocked: boolean;
  onUnlock: () => void;
}) {
  const isFree = item.price === 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "16px",
        padding: "18px",
        background: isFree
          ? "rgba(76,200,140,0.03)"
          : unlocked
          ? "rgba(200,169,110,0.05)"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${isFree ? "rgba(76,200,140,0.15)" : unlocked ? "rgba(200,169,110,0.2)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "10px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "16px" }}>{isFree ? "✦" : unlocked ? "🔓" : "🔒"}</span>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "17px",
              color: isFree ? "rgba(255,255,255,0.85)" : unlocked ? "#c8a96e" : "rgba(255,255,255,0.6)",
              filter: !isFree && !unlocked ? "blur(3px)" : "none",
              userSelect: !isFree && !unlocked ? "none" : "auto",
            }}
          >
            {item.title}
          </div>
          {item.burnMode && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "8px",
                padding: "2px 7px",
                background: "rgba(232,136,136,0.1)",
                border: "1px solid rgba(232,136,136,0.25)",
                borderRadius: "4px",
                color: "#e88888",
                letterSpacing: "0.15em",
              }}
            >
              BURN
            </span>
          )}
        </div>
        {item.description && (
          <div
            style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.3)",
              lineHeight: 1.6,
              filter: !isFree && !unlocked ? "blur(3px)" : "none",
              userSelect: !isFree && !unlocked ? "none" : "auto",
            }}
          >
            {item.description}
          </div>
        )}
        {item.expiresAt && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              color: "rgba(255,255,255,0.2)",
              marginTop: "6px",
              letterSpacing: "0.1em",
            }}
          >
            EXPIRES {fmt(item.expiresAt).toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
        {isFree ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "#4cc88c",
              letterSpacing: "0.12em",
              padding: "4px 10px",
              background: "rgba(76,200,140,0.08)",
              border: "1px solid rgba(76,200,140,0.2)",
              borderRadius: "4px",
            }}
          >
            FREE
          </span>
        ) : (
          <>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "20px",
                color: unlocked ? "#4cc88c" : "#c8a96e",
              }}
            >
              {unlocked ? "✓" : (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "15px" }}>
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.price)}
                </span>
              )}
            </div>
            {!unlocked && (
              <button
                onClick={onUnlock}
                style={{
                  padding: "7px 14px",
                  background: "rgba(200,169,110,0.08)",
                  border: "1px solid rgba(200,169,110,0.3)",
                  borderRadius: "6px",
                  color: "#c8a96e",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.18em",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                }}
              >
                UNLOCK
              </button>
            )}
            {unlocked && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "8px",
                  color: "rgba(76,200,140,0.7)",
                  letterSpacing: "0.12em",
                }}
              >
                NOTIFIED
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
