"use client";

import Link from "next/link";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  total_fans?: number;
  monthly_revenue_cents?: number;
  active_content_count?: number;
  total_revenue_cents?: number;
  conversion_rate?: number;
}

interface Props {
  stats: Stats | null;
  handle?: string;
  userEmail: string;
}

// ─── Quick action card with hover state ───────────────────────────────────────
function QuickActionCard({
  icon,
  label,
  desc,
  href,
  primary,
}: {
  icon: string;
  label: string;
  desc: string;
  href: string;
  primary?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        background: hovered
          ? primary
            ? "rgba(200,169,110,0.1)"
            : "rgba(255,255,255,0.025)"
          : primary
          ? "rgba(200,169,110,0.055)"
          : "var(--card, #111120)",
        border: `1px solid ${
          hovered
            ? primary
              ? "rgba(200,169,110,0.4)"
              : "rgba(255,255,255,0.1)"
            : primary
            ? "rgba(200,169,110,0.22)"
            : "rgba(255,255,255,0.055)"
        }`,
        borderRadius: "10px",
        padding: "22px 20px",
        textDecoration: "none",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(200,169,110,0.5), transparent)",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-mono, 'DM Mono', monospace)",
          fontSize: "22px",
          color: primary ? "var(--gold, #c8a96e)" : "rgba(255,255,255,0.3)",
          marginBottom: "14px",
          transition: "color 0.2s",
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: "var(--font-body, 'Outfit', sans-serif)",
          fontSize: "14px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.92)",
          marginBottom: "5px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-body, 'Outfit', sans-serif)",
          fontSize: "12px",
          fontWeight: 300,
          color: "rgba(255,255,255,0.35)",
        }}
      >
        {desc}
      </div>
    </Link>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  delay: string;
}) {
  return (
    <div
      style={{
        background: "var(--card, #111120)",
        border: "1px solid rgba(255,255,255,0.055)",
        borderRadius: "10px",
        padding: "26px 24px",
        position: "relative",
        overflow: "hidden",
        animation: `fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) ${delay} both`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(200,169,110,0.22), transparent)",
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-mono, 'DM Mono', monospace)",
          fontSize: "9px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.25)",
          marginBottom: "14px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono, 'DM Mono', monospace)",
          fontSize: "34px",
          fontWeight: 400,
          color: "var(--gold, #c8a96e)",
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            marginTop: "10px",
            fontFamily: "var(--font-mono, 'DM Mono', monospace)",
            fontSize: "10px",
            color: "rgba(80,212,138,0.75)",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardHomeClient({ stats, handle, userEmail }: Props) {
  const revenue = ((stats?.monthly_revenue_cents ?? 0) / 100).toFixed(2);
  const lifetime = ((stats?.total_revenue_cents ?? 0) / 100).toFixed(2);
  const fans = (stats?.total_fans ?? 0).toLocaleString();
  const content = (stats?.active_content_count ?? 0).toString();
  const displayName = handle ? `@${handle}` : userEmail.split("@")[0];

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%       { transform: scale(1.12); opacity: 1; }
        }
        .dash-home-wrap { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "var(--void, #020203)",
          position: "relative",
          overflowX: "hidden",
        }}
      >
        {/* Ambient gold orb */}
        <div
          style={{
            position: "absolute",
            top: "-250px",
            right: "-200px",
            width: "750px",
            height: "750px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(200,169,110,0.06) 0%, transparent 65%)",
            filter: "blur(90px)",
            pointerEvents: "none",
            animation: "breathe 9s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(91,141,232,0.04) 0%, transparent 65%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        <div
          className="dash-home-wrap"
          style={{
            position: "relative",
            zIndex: 1,
            padding: "52px 48px 80px",
            maxWidth: "1200px",
          }}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{ marginBottom: "52px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: "24px",
                  height: "1px",
                  background: "rgba(200,169,110,0.5)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                  fontSize: "10px",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "rgba(200,169,110,0.6)",
                }}
              >
                YOUR MONEY ENGINE
              </span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', serif)",
                fontSize: "clamp(38px, 4vw, 58px)",
                fontWeight: 300,
                color: "rgba(255,255,255,0.92)",
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Welcome back,{" "}
              <span style={{ fontStyle: "italic", color: "var(--gold, #c8a96e)" }}>
                {displayName}
              </span>
            </h1>
          </div>

          {/* ── Stats ───────────────────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "14px",
              marginBottom: "52px",
            }}
          >
            <StatCard label="Monthly Revenue" value={`$${revenue}`} delay="0.08s" />
            <StatCard label="Lifetime Earnings" value={`$${lifetime}`} delay="0.16s" />
            <StatCard label="Total Fans" value={fans} delay="0.24s" />
            <StatCard label="Active Content" value={content} delay="0.32s" />
          </div>

          {/* ── Divider ─────────────────────────────────────────────────── */}
          <div
            style={{
              height: "1px",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
              marginBottom: "40px",
            }}
          />

          {/* ── Quick actions ────────────────────────────────────────────── */}
          <div
            style={{
              fontFamily: "var(--font-mono, 'DM Mono', monospace)",
              fontSize: "9px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.2)",
              marginBottom: "18px",
            }}
          >
            QUICK ACTIONS
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
              gap: "12px",
              marginBottom: "52px",
            }}
          >
            <QuickActionCard
              icon="◈"
              label="Create Offer"
              desc="Package your value"
              href="/dashboard/offers/new"
              primary
            />
            <QuickActionCard
              icon="◪"
              label="Pay Link"
              desc="Get paid instantly"
              href="/dashboard/monetization/pay-links"
            />
            <QuickActionCard
              icon="▦"
              label="Vault"
              desc="Lock exclusive content"
              href="/dashboard/vault"
            />
            <QuickActionCard
              icon="◎"
              label="Direct Line"
              desc="Message your fans"
              href="/dashboard/direct-line"
            />
            <QuickActionCard
              icon="◍"
              label="Members"
              desc="See your audience"
              href="/dashboard/members"
            />
          </div>

          {/* ── Page live banner ─────────────────────────────────────────── */}
          {handle && (
            <div
              style={{
                padding: "28px 32px",
                background: "rgba(200,169,110,0.04)",
                border: "1px solid rgba(200,169,110,0.1)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "1px",
                  background:
                    "linear-gradient(90deg, transparent, rgba(200,169,110,0.35), transparent)",
                }}
              />
              <div>
                <div
                  style={{
                    fontFamily:
                      "var(--font-display, 'Cormorant Garamond', serif)",
                    fontSize: "20px",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.9)",
                    marginBottom: "6px",
                  }}
                >
                  Your public page is live
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body, 'Outfit', sans-serif)",
                    fontSize: "13px",
                    fontWeight: 300,
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  muluk.vip/{handle} — share it everywhere.
                </div>
              </div>
              <a
                href={`/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#0a0800",
                  background: "var(--gold, #c8a96e)",
                  padding: "12px 24px",
                  borderRadius: "3px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                }}
              >
                View Page →
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
