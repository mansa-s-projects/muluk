"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  /* entrance animations */
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
          background:
            "radial-gradient(circle at center, rgba(200,169,110,0.06) 0%, transparent 65%)",
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
          background:
            "linear-gradient(90deg, transparent 0%, rgba(200,169,110,0.12) 30%, rgba(200,169,110,0.12) 70%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ══ HERO ══ */}
      <section className="hero-section" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "140px 24px 100px", position: "relative", overflow: "hidden" }}>

        {/* orb */}
        <div className="hero-orb" style={{ position: "absolute", width: "700px", height: "700px", borderRadius: "50%", background: "radial-gradient(circle at center, rgba(200,169,110,0.07) 0%, transparent 65%)", top: "50%", left: "50%", pointerEvents: "none" }} />
        {/* horizontal line */}
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(200,169,110,0.15) 30%, rgba(200,169,110,0.15) 70%, transparent 100%)", pointerEvents: "none" }} />

        {/* eyebrow */}
        <div className="anim-eyebrow" style={{ ...mono, display: "inline-flex", alignItems: "center", gap: "12px", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" as const, ...gold, opacity: 0, marginBottom: "52px" }}>
          <span style={{ display: "block", width: "40px", height: "1px", background: "linear-gradient(90deg, transparent, var(--gold-dim))" }} />
          Creator Kingdom — Operating System
          <span style={{ display: "block", width: "40px", height: "1px", background: "linear-gradient(270deg, transparent, var(--gold-dim))" }} />
        </div>

        {/* headline */}
        <h1 className="anim-headline" style={{ marginBottom: "40px" }}>
          <span style={{ display: "block", fontFamily: "var(--font-body)", fontSize: "clamp(13px,1.8vw,18px)", fontWeight: 300, letterSpacing: "0.35em", textTransform: "uppercase" as const, ...muted, marginBottom: "20px" }}>Introducing</span>
          <span style={{ display: "block", ...disp, fontSize: "clamp(64px,11vw,148px)", fontWeight: 300, lineHeight: 0.88, letterSpacing: "-0.01em", color: "rgba(255,255,255,0.92)" }}>
            <em style={{ fontStyle: "italic", ...gold, fontWeight: 300 }}>MULUK</em>
          </span>
          <span style={{ display: "block", ...disp, fontSize: "clamp(14px,2.2vw,26px)", fontWeight: 300, fontStyle: "italic", ...muted, marginTop: "20px", letterSpacing: "0.04em" }}>The platform they were afraid to build.</span>
        </h1>

        {/* desc */}
        <p className="anim-desc" style={{ maxWidth: "500px", fontSize: "clamp(14px,1.5vw,16px)", fontWeight: 300, lineHeight: 1.85, ...muted, margin: "0 auto 60px" }}>
          Members with <strong style={{ ...gold, fontWeight: 400 }}>zero accounts</strong>. Payments that <strong style={{ ...gold, fontWeight: 400 }}>split automatically</strong>. Creators who keep <strong style={{ ...gold, fontWeight: 400 }}>88% or more</strong>. Expansion networks that generate <strong style={{ ...gold, fontWeight: 400 }}>for life</strong>.
        </p>

        {/* waitlist */}
        <div className="anim-waitlist" style={{ width: "100%", maxWidth: "480px", margin: "0 auto" }}>
          <WaitlistForm id="hero" />
        </div>

        {/* stats */}
        <div className="anim-stats hero-stats" style={{ position: "absolute", bottom: "52px", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          {[["8–12%","Platform cut"],["∞","Expansion network"],["0","Member data required"]].map(([num, label], i) => (
            <div key={i} style={{ padding: "0 48px", textAlign: "center", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.10)" : "none" }}>
              <span style={{ display: "block", ...disp, fontSize: "32px", fontWeight: 300, ...gold, lineHeight: 1, marginBottom: "6px" }}>{num}</span>
              <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase" as const, ...dim }}>{label}</span>
            </div>
          ))}
        </div>

        {/* scroll hint */}
        <div className="anim-scroll hero-scroll-hint" style={{ position: "absolute", bottom: "52px", right: "56px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase" as const, ...dim, writingMode: "vertical-rl" }}>Scroll</span>
          <span className="scroll-hint-line" style={{ width: "1px", height: "48px", background: "linear-gradient(to bottom, var(--dim), transparent)" }} />
        </div>
      </section>

      {/* ══ MARQUEE ══ */}
      <div className="marquee-section" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "20px 0", overflow: "hidden", background: "rgba(255,255,255,0.012)" }}>
        <div className="marquee-track" style={{ display: "flex", whiteSpace: "nowrap", width: "max-content" }}>
          {[...Array(2)].flatMap((_, ri) =>
            ["Anonymous Member Access","Lifetime Expansion Network","Auto Payment Splits","8% Platform Fee","Zero-Knowledge Verification","Crypto-Native Payouts","Power Tiers","190 Countries","Built for Creators","Member Code Identity"].map((item, i) => (
              <span key={`${ri}-${i}`} style={{ ...mono, display: "inline-flex", alignItems: "center", gap: "24px", padding: "0 40px", fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase" as const, ...dim }}>
                <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "var(--gold-dim)", flexShrink: 0 }} />
                {item}
              </span>
            ))
          )}
        </div>
      </div>

      {/* title */}
      <h1
        className="hero-anim"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(72px, 12vw, 160px)",
          fontWeight: 300,
          fontStyle: "italic",
          lineHeight: 0.88,
          letterSpacing: "-0.01em",
          color: "var(--gold, #c8a96e)",
          margin: "0 0 28px",
        }}
      >
        MULUK
      </h1>

      {/* tagline */}
      <p
        className="hero-anim"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(16px, 2.4vw, 28px)",
          fontWeight: 300,
          fontStyle: "italic",
          color: "var(--muted, rgba(255,255,255,0.45))",
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
          color: "var(--dim, rgba(255,255,255,0.22))",
          lineHeight: 1.8,
          margin: "0 0 56px",
          maxWidth: "440px",
        }}
      >
        Anonymous fans. Instant payments. Lifetime income.
      </p>

      {/* buttons */}
      <div
        className="hero-anim"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          href="/login"
          style={{
            fontFamily: "var(--font-mono)",
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
            fontFamily: "var(--font-mono)",
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
        style={{
          display: "flex",
          gap: "32px",
          justifyContent: "center",
          marginTop: "14px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(200,169,110,0.35)",
          }}
        >
          Already inside? Enter.
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.18)",
          }}
        >
          New here? Apply.
        </span>
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
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "var(--dim, rgba(255,255,255,0.22))",
        }}
      >
        © 2025 MULUK
      </div>
    </div>
  );
}
