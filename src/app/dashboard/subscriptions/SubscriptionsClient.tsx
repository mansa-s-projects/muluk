"use client";

import { useState } from "react";
import Link from "next/link";

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;

interface PayLink {
  id: string;
  title: string;
  description: string | null;
  price: number;
  is_active: boolean;
  purchase_count: number | null;
  view_count: number | null;
  created_at: string;
}

interface Props {
  payLinks: PayLink[];
  totalSubscribers: number;
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SubscriptionsClient({ payLinks, totalSubscribers }: Props) {
  const [tab, setTab] = useState<"tiers" | "activity">("tiers");

  const active = payLinks.filter((p) => p.is_active);
  const totalRevenue = payLinks.reduce((s, p) => s + (p.purchase_count ?? 0) * p.price, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--void, #08080f)", padding: "2rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ ...mono, fontSize: "1.5rem", fontWeight: 500, color: "#fff", margin: 0, letterSpacing: "0.05em" }}>Subscriptions</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "4px" }}>Recurring revenue and membership tiers</p>
          </div>
          <Link
            href="/dashboard/monetization/pay-links"
            style={{ ...mono, fontSize: "12px", letterSpacing: "0.08em", padding: "10px 18px", background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.3)", color: "#c8a96e", borderRadius: "6px", textDecoration: "none" }}
          >
            + Create Tier
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "2rem" }}>
          {[
            { label: "Active Tiers", value: active.length },
            { label: "Total Subscribers", value: totalSubscribers },
            { label: "Total Revenue", value: formatCents(totalRevenue) },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: "16px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px" }}>
              <div style={{ ...mono, fontSize: "11px", color: "rgba(200,169,110,0.5)", letterSpacing: "0.12em", marginBottom: "6px" }}>{label}</div>
              <div style={{ ...mono, fontSize: "22px", fontWeight: 500, color: "#fff" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "0" }}>
          {(["tiers", "activity"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ ...mono, fontSize: "11px", letterSpacing: "0.1em", padding: "8px 16px", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t ? "#c8a96e" : "transparent"}`, color: tab === t ? "#c8a96e" : "rgba(255,255,255,0.35)", cursor: "pointer", textTransform: "uppercase" }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tiers list */}
        {tab === "tiers" && (
          payLinks.length === 0 ? (
            <div style={{ padding: "4rem", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "14px" }}>
              <div style={{ ...mono, fontSize: "28px", marginBottom: "12px" }}>◑</div>
              <p>No subscription tiers yet.</p>
              <p style={{ fontSize: "12px", marginTop: "8px" }}>
                Create payment links to set up recurring memberships.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {payLinks.map((link) => (
                <div key={link.id} style={{ padding: "16px 20px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", color: "#fff", fontWeight: 500 }}>{link.title}</div>
                    {link.description && <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{link.description}</div>}
                  </div>
                  <div style={{ ...mono, fontSize: "14px", color: "#c8a96e" }}>{formatCents(link.price)}</div>
                  <div style={{ ...mono, fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{link.purchase_count ?? 0} buyers</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: link.is_active ? "#4ade80" : "#666", display: "inline-block" }} />
                    <span style={{ ...mono, fontSize: "10px", color: link.is_active ? "#4ade80" : "rgba(255,255,255,0.3)" }}>{link.is_active ? "ACTIVE" : "INACTIVE"}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "activity" && (
          <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "14px" }}>
            <div style={{ ...mono, fontSize: "28px", marginBottom: "12px" }}>◑</div>
            <p>Subscriber activity will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
