"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" };

interface Props {
  code: string;
  inviterName: string | null;
  inviterHandle: string | null;
  applyCode: string;
}

export default function JoinClient({ code, inviterName, inviterHandle, applyCode }: Props) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void fetch("/api/referrals/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referral_code: code, source: "invite_page" }),
    }).catch(() => {});
  }, [code]);

  const displayName = inviterHandle ? `@${inviterHandle}` : inviterName ?? "a creator";
  const applyLink = applyCode
    ? `/apply?code=${applyCode}&ref=${code}`
    : `/apply?ref=${code}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020203",
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, rgba(200,169,110,0.1) 0%, transparent 55%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Noise overlay */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 500, width: "100%" }}>
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            ...mono,
            fontSize: "11px",
            letterSpacing: "0.38em",
            color: "rgba(200,169,110,0.45)",
            textDecoration: "none",
            display: "block",
            marginBottom: "56px",
          }}
        >
          MULUK
        </Link>

        {/* Inviter avatar placeholder */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            border: "1px solid rgba(200,169,110,0.25)",
            background: "rgba(200,169,110,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <span
            style={{
              ...disp,
              fontSize: "26px",
              fontWeight: 300,
              color: "rgba(200,169,110,0.6)",
              lineHeight: 1,
            }}
          >
            {(inviterHandle ?? inviterName ?? "M").charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Tag */}
        <div
          style={{
            ...mono,
            fontSize: "9px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(200,169,110,0.5)",
            marginBottom: "16px",
          }}
        >
          Private Invitation
        </div>

        {/* Headline */}
        <h1
          style={{
            ...disp,
            fontSize: "clamp(32px, 7vw, 52px)",
            fontWeight: 300,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.92)",
            margin: "0 0 16px",
            lineHeight: 1.1,
          }}
        >
          {displayName} invited you
          <br />
          to join MULUK
        </h1>

        {/* Sub */}
        <p
          style={{
            fontSize: "14px",
            fontWeight: 300,
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.8,
            maxWidth: "380px",
            margin: "0 auto 40px",
          }}
        >
          The exclusive creator platform — 88% payouts, crypto rails to 190
          countries, and total anonymity.
        </p>

        {/* Divider */}
        <div
          style={{
            width: "56px",
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(200,169,110,0.4), transparent)",
            margin: "0 auto 40px",
          }}
        />

        {/* Perks */}
        <div
          style={{
            display: "grid",
            gap: "10px",
            marginBottom: "44px",
          }}
        >
          {[
            ["✦", "88% payout rate — industry leading"],
            ["✦", "Crypto payouts to 190+ countries"],
            ["✦", "Fan anonymity with unique codes"],
            ["✦", "AI-powered content monetisation"],
          ].map(([icon, text]) => (
            <div
              key={text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 16px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "8px",
                textAlign: "left",
              }}
            >
              <span style={{ color: "rgba(200,169,110,0.45)", fontSize: "9px" }}>
                {icon}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href={applyLink}
          style={{
            display: "block",
            background: "#c8a96e",
            color: "#0a0800",
            borderRadius: "5px",
            padding: "17px 28px",
            ...mono,
            fontSize: "11px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            textDecoration: "none",
            marginBottom: "16px",
            fontWeight: 500,
          }}
        >
          Apply to MULUK
        </Link>

        <p style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.18)", letterSpacing: "0.1em" }}>
          Applications are reviewed personally · Invite code already applied
        </p>
      </div>
    </div>
  );
}
