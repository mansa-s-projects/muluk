"use client";

import React, { useEffect } from "react";
import Link from "next/link";

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;
const gold = { color: "var(--gold, #c8a96e)" } as const;
const muted = { color: "var(--muted, rgba(255,255,255,0.45))" } as const;
const dim = { color: "var(--dim, rgba(255,255,255,0.22))" } as const;
const disp = { fontFamily: "var(--font-display, serif)" } as const;

export default function LandingPage() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".hero-anim");
    els.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(18px)";
      el.style.transition = `opacity 0.8s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 0.15 + 0.2}s, transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 0.15 + 0.2}s`;
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    });
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "60px 24px",
        position: "relative",
        overflow: "hidden",
        background: "var(--bg, #020203)",
      }}
    >
      {/* ambient orb */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: "700px",
          height: "700px",
          borderRadius: "50%",
          background: "radial-gradient(circle at center, rgba(200,169,110,0.06) 0%, transparent 65%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* horizontal accent line */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(200,169,110,0.12) 30%, rgba(200,169,110,0.12) 70%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* title */}
      <h1
        className="hero-anim"
        style={{
          ...disp,
          fontSize: "clamp(72px, 12vw, 160px)",
          fontWeight: 300,
          fontStyle: "italic",
          lineHeight: 0.88,
          letterSpacing: "-0.01em",
          ...gold,
          margin: "0 0 28px",
        }}
      >
        MULUK
      </h1>

      {/* tagline */}
      <p
        className="hero-anim"
        style={{
          ...disp,
          fontSize: "clamp(16px, 2.4vw, 28px)",
          fontWeight: 300,
          fontStyle: "italic",
          ...muted,
          margin: "0 0 20px",
          letterSpacing: "0.03em",
        }}
      >
        The platform they were afraid to build.
      </p>

      {/* subtext */}
      <p
        className="hero-anim"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(13px, 1.4vw, 16px)",
          fontWeight: 300,
          ...dim,
          lineHeight: 1.8,
          margin: "0 0 56px",
          maxWidth: "440px",
        }}
      >
        Anonymous fans. Instant payments. Lifetime income.
      </p>

      {/* CTAs */}
      <div
        className="hero-anim"
        style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}
      >
        <Link
          href="/login"
          style={{
            ...mono,
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "14px 36px",
            borderRadius: "3px",
            textDecoration: "none",
            background: "var(--gold, #c8a96e)",
            color: "#0a0800",
            border: "1px solid var(--gold, #c8a96e)",
            transition: "opacity 0.25s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Enter →
        </Link>

        <Link
          href="/apply"
          style={{
            ...mono,
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "14px 36px",
            borderRadius: "3px",
            textDecoration: "none",
            background: "transparent",
            color: "var(--gold, #c8a96e)",
            border: "1px solid rgba(200,169,110,0.3)",
            transition: "all 0.25s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(200,169,110,0.1)";
            e.currentTarget.style.borderColor = "rgba(200,169,110,0.55)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)";
          }}
        >
          Apply →
        </Link>
      </div>

      {/* helper text */}
      <div
        className="hero-anim"
        style={{ display: "flex", gap: "32px", justifyContent: "center", marginTop: "14px" }}
      >
        <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(200,169,110,0.35)" }}>
          Already inside? Enter.
        </span>
        <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)" }}>
          New here? Apply.
        </span>
      </div>

      {/* stats */}
      <div
        className="hero-anim"
        style={{ position: "absolute", bottom: "52px", left: 0, right: 0, display: "flex", justifyContent: "center" }}
      >
        {[["8–12%", "Platform cut"], ["∞", "Expansion network"], ["0", "Member data required"]].map(([num, label], i) => (
          <div key={i} style={{ padding: "0 48px", textAlign: "center", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.10)" : "none" }}>
            <span style={{ display: "block", ...disp, fontSize: "32px", fontWeight: 300, ...gold, lineHeight: 1, marginBottom: "6px" }}>{num}</span>
            <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase" as const, ...dim }}>{label}</span>
          </div>
        ))}
      </div>

      {/* footer mark */}
      <div
        className="hero-anim"
        style={{
          position: "absolute",
          bottom: "40px",
          left: 0,
          right: 0,
          textAlign: "center",
          ...mono,
          fontSize: "9px",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          ...dim,
        }}
      >
        © 2025 MULUK
      </div>
    </div>
  );
}
