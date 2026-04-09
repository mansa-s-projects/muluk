"use client";

import { useState } from "react";
import type { Tip } from "@/lib/tips";
import { formatTip } from "@/lib/tips";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Props {
  initialTips: Tip[];
  monthlyEarnings: { month: number; total_cents: number; tip_count: number }[];
  handle: string;
}

export default function TipsClient({ initialTips, monthlyEarnings, handle }: Props) {
  const [tips]    = useState<Tip[]>(initialTips);
  const [tab, setTab] = useState<"wall" | "all">("wall");
  const [clipboardStatus, setClipboardStatus] = useState<"idle" | "success" | "error">("idle");

  const paidTips  = tips.filter((t) => t.status === "paid");
  const totalEarned = paidTips.reduce((s, t) => s + t.amount_cents, 0);
  const totalCount  = paidTips.length;

  const topTip    = paidTips.reduce<Tip | null>((top, t) => (!top || t.amount_cents > top.amount_cents ? t : top), null);
  const recentTip = paidTips[0] ?? null;

  const maxMonth  = Math.max(...monthlyEarnings.map((m) => m.total_cents), 1);

  const wallUrl = handle ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/tips/${handle}` : null;

  const displayedTips = tab === "wall" ? paidTips.slice(0, 20) : tips.slice(0, 50);

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)", padding: "2rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 400, color: "var(--white)", margin: 0 }}>Tip Jar</h1>
            <p style={{ color: "var(--muted)", marginTop: "0.25rem", fontSize: "0.875rem" }}>Your fans&apos; appreciation, tracked</p>
          </div>
          {wallUrl && (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>Wall of Love:</span>
              <a href={wallUrl} target="_blank" rel="noopener noreferrer" style={{ background: "var(--card)", border: "1px solid var(--gold)", borderRadius: 8, padding: "0.4rem 0.875rem", color: "var(--gold)", fontSize: "0.8125rem", textDecoration: "none" }}>
                View Live ↗
              </a>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(wallUrl);
                    setClipboardStatus("success");
                    setTimeout(() => setClipboardStatus("idle"), 1800);
                  } catch {
                    setClipboardStatus("error");
                    setTimeout(() => setClipboardStatus("idle"), 2200);
                  }
                }}
                style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 8, padding: "0.4rem 0.875rem", color: "var(--muted)", fontSize: "0.8125rem", cursor: "pointer" }}
              >
                {clipboardStatus === "success" ? "Copied" : clipboardStatus === "error" ? "Copy failed" : "Copy Link"}
              </button>
            </div>
          )}
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <StatCard label="Total Earned" value={formatTip(totalEarned)} gold />
          <StatCard label="Total Tips" value={String(totalCount)} />
          <StatCard label="Top Tip" value={topTip ? formatTip(topTip.amount_cents) : "—"} />
          <StatCard label="Most Recent" value={recentTip ? formatTip(recentTip.amount_cents) : "—"} />
        </div>

        {/* ── Monthly chart ── */}
        <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 16, padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ color: "var(--white)", fontFamily: "var(--font-display)", fontSize: "1.125rem", fontWeight: 400, margin: 0 }}>
              Monthly Tips — {new Date().getFullYear()}
            </h3>
            <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
              {monthlyEarnings.reduce((s, m) => s + m.tip_count, 0)} tips this year
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 72 }}>
            {MONTH_NAMES.map((m, i) => {
              const entry = monthlyEarnings.find((e) => e.month === i + 1);
              const h = entry?.total_cents ? Math.max(4, (entry.total_cents / maxMonth) * 72) : 2;
              return (
                <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div
                    title={`${m}: ${formatTip(entry?.total_cents ?? 0)} (${entry?.tip_count ?? 0} tips)`}
                    style={{ width: "100%", height: h, background: entry?.total_cents ? "var(--gold)" : "var(--rim)", borderRadius: 3, transition: "height 0.3s" }}
                  />
                  <span style={{ color: "var(--dim)", fontSize: "0.6rem" }}>{m[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {([["wall","Wall of Love"],["all","All Tips"]] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ background: tab === t ? "var(--card)" : "none", border: `1px solid ${tab === t ? "var(--gold)" : "var(--rim)"}`, borderRadius: 8, padding: "0.5rem 1.25rem", color: tab === t ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontSize: "0.8125rem" }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tips grid / feed ── */}
        {displayedTips.length === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 16, padding: "4rem", textAlign: "center", color: "var(--muted)" }}>
            {tab === "wall" ? "No paid tips yet. Share your wall link to start receiving tips!" : "No tips yet."}
          </div>
        ) : tab === "wall" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {displayedTips.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </div>
        ) : (
          <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 16, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--rim)" }}>
                  {["From","Amount","Message","Status","Date"].map((h) => (
                    <th key={h} style={{ padding: "0.875rem 1.25rem", textAlign: "left", color: "var(--muted)", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedTips.map((tip) => (
                  <tr key={tip.id} style={{ borderBottom: "1px solid var(--rim)" }}>
                    <td style={{ padding: "0.875rem 1.25rem", color: "var(--white)", fontSize: "0.875rem" }}>
                      {tip.is_anonymous ? <span style={{ color: "var(--dim)" }}>Anonymous</span> : (tip.display_name ?? "Fan")}
                    </td>
                    <td style={{ padding: "0.875rem 1.25rem", color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
                      {formatTip(tip.amount_cents)}
                    </td>
                    <td style={{ padding: "0.875rem 1.25rem", color: "var(--muted)", fontSize: "0.8125rem", maxWidth: 200 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tip.message ?? "—"}
                      </span>
                    </td>
                    <td style={{ padding: "0.875rem 1.25rem" }}>
                      <StatusBadge status={tip.status} />
                    </td>
                    <td style={{ padding: "0.875rem 1.25rem", color: "var(--dim)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
                      {new Date(tip.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TipCard({ tip }: { tip: Tip }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 14, padding: "1.25rem", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: "radial-gradient(circle at top right, rgba(200,169,110,0.08), transparent)", pointerEvents: "none" }} />
      <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        {formatTip(tip.amount_cents)}
      </div>
      {tip.message && (
        <p style={{ color: "var(--white)", fontSize: "0.875rem", lineHeight: 1.5, margin: "0 0 0.75rem", fontStyle: "italic" }}>
          &ldquo;{tip.message}&rdquo;
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: tip.is_anonymous ? "var(--dim)" : "var(--muted)", fontSize: "0.8125rem" }}>
          {tip.is_anonymous ? "Anonymous" : (tip.display_name ?? "Fan")}
        </span>
        {tip.paid_at && (
          <span style={{ color: "var(--dim)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
            {new Date(tip.paid_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { paid: "var(--green)", pending: "var(--amber)", refunded: "var(--dim)" };
  const c = colors[status] ?? "var(--dim)";
  return (
    <span style={{ background: `${c}22`, border: `1px solid ${c}55`, borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: "0.75rem", color: c }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 12, padding: "1.25rem" }}>
      <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ color: gold ? "var(--gold)" : "var(--white)", fontFamily: "var(--font-mono)", fontSize: "1.5rem" }}>{value}</div>
    </div>
  );
}
