"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

type ReferralStatus = "clicked" | "signed_up" | "converted";

interface ReferralRow {
  id: string;
  referred_id: string | null;
  referral_code: string;
  source: string | null;
  status: ReferralStatus;
  signup_at: string | null;
  first_purchase_at: string | null;
  total_revenue_generated: number;
  created_at: string;
  last_activity_at: string;
  referred_user: {
    name: string;
    handle: string | null;
    email: string | null;
  };
}

interface ReferralPayload {
  referral_code: string;
  referral_link: string;
  kpis: {
    total_referrals: number;
    total_conversions: number;
    conversion_rate: number;
    revenue_generated: number;
  };
  funnel: {
    clicks: number;
    signups: number;
    conversions: number;
  };
  referrals: ReferralRow[];
  leaderboard: ReferralRow[];
  fetched_at: string;
}

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;
const disp = { fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" } as const;

function ago(ts: string | null): string {
  if (!ts) return "-";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function fmtUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function statusPill(status: ReferralStatus) {
  if (status === "converted") {
    return { text: "Converted", color: "var(--green, #50d48a)", bg: "rgba(80,212,138,0.12)" };
  }
  if (status === "signed_up") {
    return { text: "Signed Up", color: "var(--gold, #c8a96e)", bg: "rgba(200,169,110,0.12)" };
  }
  return { text: "Clicked", color: "rgba(255,255,255,0.55)", bg: "rgba(255,255,255,0.08)" };
}

export default function ReferralIntelligenceClient() {
  const [data, setData] = useState<ReferralPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/referrals/stats", { cache: "no-store" });
      const payload = (await response.json()) as ReferralPayload | { error?: string };

      if (!response.ok) {
        setError((payload as { error?: string }).error ?? "Failed to load referral intelligence");
        return;
      }

      setError(null);
      setData(payload as ReferralPayload);
    } catch {
      setError("Failed to load referral intelligence");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      void load();
    }, 20000);
    return () => clearInterval(id);
  }, [load]);

  const conversionProgress = useMemo(() => {
    if (!data) return { signupPct: 0, conversionPct: 0 };
    const clicks = Math.max(data.funnel.clicks, 1);
    return {
      signupPct: Math.min(100, Math.round((data.funnel.signups / clicks) * 100)),
      conversionPct: Math.min(100, Math.round((data.funnel.conversions / clicks) * 100)),
    };
  }, [data]);

  const copyLink = async () => {
    if (!data?.referral_link) return;
    try {
      await navigator.clipboard.writeText(data.referral_link);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  const shareToX = () => {
    if (!data?.referral_link) return;
    const text = encodeURIComponent("Join me on CIPHER.");
    const url = encodeURIComponent(data.referral_link);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener,noreferrer");
  };

  const shareToWhatsApp = () => {
    if (!data?.referral_link) return;
    const text = encodeURIComponent(`Join me on CIPHER: ${data.referral_link}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const shareToTelegram = () => {
    if (!data?.referral_link) return;
    const text = encodeURIComponent("Join me on CIPHER");
    const url = encodeURIComponent(data.referral_link);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
        <div style={{ ...mono, fontSize: "11px", letterSpacing: "0.2em", color: "var(--gold-dim, #7a6030)" }}>
          LOADING REFERRAL INTELLIGENCE
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          border: "1px solid rgba(224,85,85,0.32)",
          background: "rgba(224,85,85,0.12)",
          borderRadius: 10,
          padding: "14px 16px",
          color: "var(--red, #e05555)",
          ...mono,
          fontSize: "11px",
          letterSpacing: "0.08em",
        }}
      >
        {error ?? "Failed to load referral intelligence"}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          border: "1px solid var(--rim, rgba(255,255,255,0.055))",
          borderRadius: 12,
          background: "linear-gradient(145deg, rgba(200,169,110,0.06), rgba(255,255,255,0.02))",
          padding: "18px 20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.24em", color: "var(--gold-dim, #7a6030)" }}>
              REFERRAL LINK
            </div>
            <div style={{ marginTop: 8, ...mono, fontSize: "12px", color: "var(--white, rgba(255,255,255,0.92))" }}>
              {data.referral_link}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={copyLink} style={btnStyle()}>
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy Failed" : "Copy Link"}
            </button>
            <button onClick={shareToX} style={btnStyle()}>Share X</button>
            <button onClick={shareToWhatsApp} style={btnStyle()}>WhatsApp</button>
            <button onClick={shareToTelegram} style={btnStyle()}>Telegram</button>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <KpiCard label="Total Referrals" value={String(data.kpis.total_referrals)} />
        <KpiCard label="Total Conversions" value={String(data.kpis.total_conversions)} color="var(--green, #50d48a)" />
        <KpiCard label="Conversion Rate" value={`${data.kpis.conversion_rate.toFixed(2)}%`} color="var(--gold, #c8a96e)" />
        <KpiCard label="Revenue Generated" value={fmtUSD(data.kpis.revenue_generated)} color="var(--gold-bright, #e8cc90)" />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title="Funnel">
          <FunnelBar label="Clicks" value={data.funnel.clicks} width={100} color="rgba(255,255,255,0.28)" />
          <FunnelBar label="Signups" value={data.funnel.signups} width={conversionProgress.signupPct} color="var(--gold, #c8a96e)" />
          <FunnelBar label="Conversions" value={data.funnel.conversions} width={conversionProgress.conversionPct} color="var(--green, #50d48a)" />
        </Card>

        <Card title="Top Performing Referrals">
          <div style={{ display: "grid", gap: 8 }}>
            {data.leaderboard.slice(0, 5).map((row, index) => (
              <div key={row.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--rim, rgba(255,255,255,0.055))", paddingBottom: 8 }}>
                <div>
                  <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim, #7a6030)" }}>#{index + 1}</div>
                  <div style={{ fontSize: "13px", color: "var(--white, rgba(255,255,255,0.92))" }}>{row.referred_user.name}</div>
                  <div style={{ ...mono, fontSize: "10px", color: "var(--muted, rgba(255,255,255,0.48))" }}>
                    {row.referred_user.handle ? `@${row.referred_user.handle}` : "pending user"}
                  </div>
                </div>
                <div style={{ ...mono, fontSize: "12px", color: "var(--gold, #c8a96e)" }}>{fmtUSD(row.total_revenue_generated)}</div>
              </div>
            ))}
            {data.leaderboard.length === 0 ? (
              <div style={{ ...mono, fontSize: "10px", color: "var(--dim, rgba(255,255,255,0.22))" }}>No referral revenue yet.</div>
            ) : null}
          </div>
        </Card>
      </section>

      <Card title="Referral Intelligence Table">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr>
                {[
                  "Referral User",
                  "Status",
                  "Revenue",
                  "Signup Date",
                  "Last Activity",
                  "Source",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--rim, rgba(255,255,255,0.055))",
                      ...mono,
                      fontSize: "9px",
                      letterSpacing: "0.14em",
                      color: "var(--gold-dim, #7a6030)",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.referrals.map((row) => {
                const pill = statusPill(row.status);
                return (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--rim, rgba(255,255,255,0.055))" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: "13px", color: "var(--white, rgba(255,255,255,0.92))" }}>{row.referred_user.name}</div>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--muted, rgba(255,255,255,0.48))" }}>
                        {row.referred_user.email ?? row.referred_user.handle ?? "pending"}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: pill.color, background: pill.bg, padding: "4px 8px", borderRadius: 6 }}>
                        {pill.text}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", ...mono, fontSize: "11px", color: "var(--gold, #c8a96e)" }}>{fmtUSD(row.total_revenue_generated)}</td>
                    <td style={{ padding: "10px 12px", ...mono, fontSize: "10px", color: "var(--muted, rgba(255,255,255,0.48))" }}>
                      {row.signup_at ? new Date(row.signup_at).toLocaleDateString() : "-"}
                    </td>
                    <td style={{ padding: "10px 12px", ...mono, fontSize: "10px", color: "var(--muted, rgba(255,255,255,0.48))" }}>{ago(row.last_activity_at)} ago</td>
                    <td style={{ padding: "10px 12px", ...mono, fontSize: "10px", color: "var(--dim, rgba(255,255,255,0.22))" }}>{row.source ?? "direct"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.referrals.length === 0 ? (
            <div style={{ padding: "20px 0", ...mono, fontSize: "10px", color: "var(--dim, rgba(255,255,255,0.22))" }}>
              No referrals yet.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function btnStyle(): CSSProperties {
  return {
    ...mono,
    fontSize: "10px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    border: "1px solid var(--rim2, rgba(255,255,255,0.09))",
    background: "rgba(255,255,255,0.04)",
    color: "var(--white, rgba(255,255,255,0.92))",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  };
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        border: "1px solid var(--rim, rgba(255,255,255,0.055))",
        borderRadius: 12,
        background: "var(--card, #0f0f1e)",
        padding: "14px 16px",
      }}
    >
      <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color: "var(--gold-dim, #7a6030)", textTransform: "uppercase", marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--rim, rgba(255,255,255,0.055))",
        borderRadius: 10,
        background: "var(--card, #0f0f1e)",
        padding: "14px 16px",
      }}
    >
      <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.16em", color: "var(--gold-dim, #7a6030)", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ ...disp, fontSize: "34px", lineHeight: 1, fontWeight: 300, color: color ?? "var(--white, rgba(255,255,255,0.92))" }}>
        {value}
      </div>
    </div>
  );
}

function FunnelBar({ label, value, width, color }: { label: string; value: number; width: number; color: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: "12px", color: "var(--muted, rgba(255,255,255,0.48))" }}>{label}</span>
        <span style={{ ...mono, fontSize: "11px", color: "var(--white, rgba(255,255,255,0.92))" }}>{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ width: `${width}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}
