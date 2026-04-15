"use client";

import Link from "next/link";

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;

const QUICK_LINKS = [
  { label: "Content",     sub: "Upload & manage drops",       href: "/dashboard/content",     icon: "▤" },
  { label: "Vault",       sub: "Premium digital files",       href: "/dashboard/vault",        icon: "▦" },
  { label: "Earnings",    sub: "Live monetization signals",   href: "/dashboard/signals",      icon: "◈" },
  { label: "Bookings",    sub: "1-on-1 session calendar",     href: "/dashboard/bookings",     icon: "◷" },
  { label: "Referrals",   sub: "Lifetime referral network",   href: "/dashboard/referrals",    icon: "◉" },
  { label: "Analytics",   sub: "Presence & engagement",       href: "/dashboard/presence",     icon: "◌" },
  { label: "Series",      sub: "Episodic content drops",      href: "/dashboard/series",       icon: "▣" },
  { label: "Tip Jar",     sub: "Fan tips & donations",        href: "/dashboard/tips",         icon: "◬" },
  { label: "Commissions", sub: "Accept work requests",        href: "/dashboard/commissions",  icon: "◫" },
  { label: "Brand Deals", sub: "Partnerships & sponsorships", href: "/dashboard/deals",        icon: "◯" },
  { label: "Settings",    sub: "Account & integrations",      href: "/dashboard/settings",     icon: "◔" },
];

export default function DashboardHome({ userId: _userId }: { userId: string }) {
  return (
    <div style={{ padding: "40px 36px", minHeight: "100vh", background: "#08080f" }}>
      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{ ...mono, fontSize: "20px", fontWeight: 500, color: "var(--gold, #c8a96e)", letterSpacing: "0.18em", margin: 0 }}>
          CREATOR OS
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", marginTop: "6px", fontFamily: "var(--font-body, 'Outfit', sans-serif)", letterSpacing: "0.02em" }}>
          Everything you need to run your business.
        </p>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              padding: "18px 20px",
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "8px",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(200,169,110,0.07)";
              e.currentTarget.style.borderColor = "rgba(200,169,110,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.025)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
            }}
          >
            <span style={{ fontSize: "13px", color: "rgba(200,169,110,0.5)" }}>{item.icon}</span>
            <span style={{ ...mono, fontSize: "12px", color: "rgba(255,255,255,0.75)", letterSpacing: "0.08em", fontWeight: 500 }}>
              {item.label}
            </span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-body, 'Outfit', sans-serif)" }}>
              {item.sub}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
