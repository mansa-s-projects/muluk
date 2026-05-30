"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { track } from "@/lib/analytics/track";

function snapCoord(value: number) {
  return value.toFixed(3);
}

function WaitlistPanel() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("operator");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const canSubmit = useMemo(() => email.includes("@") && email.includes("."), [email]);

  const submit = async () => {
    if (!canSubmit || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: role, source: "landing-redesign" }),
      });
      if (!res.ok) throw new Error();
      track.event("waitlist_joined", { role, surface: "hero" });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="waitlist-wrap">
      <div className="waitlist-eyebrow">Private Access Queue</div>
      {status === "done" ? (
        <div className="waitlist-success">
          <span>Access request secured.</span>
          <small>Founding operator invite will be delivered before public release.</small>
        </div>
      ) : (
        <>
          <div className="waitlist-row">
            <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
              <option value="operator">Operator</option>
              <option value="citizen">Citizen</option>
            </select>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              aria-label="Email"
              onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
            />
            <button disabled={!canSubmit || status === "loading"} onClick={() => void submit()}>
              {status === "loading" ? "Securing…" : "Enter the Empire"}
            </button>
          </div>
          {status === "error" && (
            <p className="waitlist-error">Could not secure access. Try again.</p>
          )}
        </>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="lux-root low-motion">

      {/* Watermark emblem — enormous, ghosted into the architecture */}
      <div className="bg-watermark" aria-hidden="true">
        <Image
          src="/Logo/Logo.png"
          alt=""
          width={920}
          height={920}
          style={{ objectFit: "contain", width: "100%", height: "100%" }}
        />
      </div>

      {/* Sacred geometry + celestial grid */}
      <div className="bg-geometry" aria-hidden="true">
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
            {/* Fine grid */}
            {Array.from({ length: 25 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 38} x2="1440" y2={i * 38} stroke="rgba(200,169,110,0.035)" strokeWidth="0.6" />
            ))}
            {Array.from({ length: 37 }, (_, i) => (
              <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="900" stroke="rgba(200,169,110,0.035)" strokeWidth="0.6" />
            ))}

            {/* Diagonal empire lines */}
            <line x1="0" y1="0" x2="1440" y2="900" stroke="rgba(200,169,110,0.025)" strokeWidth="0.6" />
            <line x1="1440" y1="0" x2="0" y2="900" stroke="rgba(200,169,110,0.025)" strokeWidth="0.6" />

            {/* Concentric sacred geometry circles — centered on viewport mid */}
            {[110, 190, 280, 390, 520, 670, 840, 1040].map((r, i) => (
              <circle
                key={`c${i}`}
                cx="720" cy="450"
                r={r}
                fill="none"
                stroke="rgba(200,169,110,0.07)"
                strokeWidth={i < 3 ? "0.9" : "0.6"}
                strokeDasharray={i % 3 === 0 ? "none" : i % 3 === 1 ? "5 14" : "1.5 9"}
                opacity={1 - i * 0.07}
              />
            ))}

            {/* Compass crosshairs through viewport center */}
            <line x1="720" y1="0" x2="720" y2="900" stroke="rgba(200,169,110,0.05)" strokeWidth="0.7" strokeDasharray="3 20" />
            <line x1="0" y1="450" x2="1440" y2="450" stroke="rgba(200,169,110,0.05)" strokeWidth="0.7" strokeDasharray="3 20" />

            {/* Compass rose tick marks */}
            {Array.from({ length: 24 }, (_, i) => {
              const angle = (i / 24) * Math.PI * 2;
              const isMajor = i % 6 === 0;
              const inner = 138, outer = isMajor ? 158 : 148;
              return (
                <line
                  key={`t${i}`}
                  x1={snapCoord(720 + Math.cos(angle) * inner)} y1={snapCoord(450 + Math.sin(angle) * inner)}
                  x2={snapCoord(720 + Math.cos(angle) * outer)} y2={snapCoord(450 + Math.sin(angle) * outer)}
                  stroke={`rgba(200,169,110,${isMajor ? 0.38 : 0.2})`}
                  strokeWidth={isMajor ? 1.2 : 0.7}
                />
              );
            })}

            {/* Inner decorative octagon */}
            {Array.from({ length: 8 }, (_, i) => {
              const a1 = (i / 8) * Math.PI * 2 - Math.PI / 8;
              const a2 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 8;
              const r = 136;
              return (
                <line
                  key={`oct${i}`}
                  x1={snapCoord(720 + Math.cos(a1) * r)} y1={snapCoord(450 + Math.sin(a1) * r)}
                  x2={snapCoord(720 + Math.cos(a2) * r)} y2={snapCoord(450 + Math.sin(a2) * r)}
                  stroke="rgba(200,169,110,0.2)" strokeWidth="0.9"
                />
              );
            })}
        </svg>
      </div>

      {/* Noise film grain */}
      <div className="bg-noise" aria-hidden="true" />

      {/* Deep radial glow */}
      <div className="bg-radial" aria-hidden="true" />

      {/* Cinematic light rays from top-center */}
      <div className="light-rays" aria-hidden="true" />

      {/* ── NAVBAR ── */}
      <header className="lux-nav">
        <a href="#" className="brand-mark" aria-label="Mansa's Mogules">
          <span className="brand-crop-frame">
            <Image
              src="/Logo/Logo.png"
              alt="Mansa's Mogules mark"
              fill
              sizes="34px"
              style={{ objectFit: "cover", objectPosition: "50% 30%" }}
            />
          </span>
        </a>

        <nav className="lux-nav-links" aria-label="Main">
          <a href="#system">System</a>
          <span className="nav-dot" aria-hidden="true">•</span>
          <a href="#architecture">Architecture</a>
          <span className="nav-dot" aria-hidden="true">•</span>
          <a href="#access">Access</a>
        </nav>

        <a
          href="#access"
          className="nav-cta"
          onClick={() => track.event("landing_cta_click", { placement: "nav", label: "enter_empire" })}
        >
          Enter The Empire
        </a>
      </header>

      {/* ── HERO ── */}
      <section className="hero" id="access">

        {/* Flanking ghosted M marks */}
        <div className="flank flank-left" aria-hidden="true">
          <Image src="/Logo/Logo.png" alt="" width={320} height={320} style={{ objectFit: "contain", width: "100%", height: "100%" }} />
        </div>
        <div className="flank flank-right" aria-hidden="true">
          <Image src="/Logo/Logo.png" alt="" width={320} height={320} style={{ objectFit: "contain", width: "100%", height: "100%" }} />
        </div>

        {/* Imperial emblem — the living seal */}
        <div className="emblem-wrap">
          <div className="emblem-corona" />
          <div className="emblem-ring emblem-ring-1" />
          <div className="emblem-ring emblem-ring-2" />
          <div className="emblem-ring emblem-ring-3" />
          <div className="emblem-img">
            <Image
              src="/Logo/Logo.png"
              alt="Mansa's Mogules Imperial Seal"
              width={260}
              height={260}
              style={{
                objectFit: "contain",
                filter:
                  "drop-shadow(0 0 52px rgba(200,169,110,0.65)) drop-shadow(0 0 18px rgba(200,169,110,0.3)) drop-shadow(0 4px 8px rgba(0,0,0,0.8))",
              }}
            />
          </div>
        </div>

        {/* Thin gold rule */}
        <div className="hero-rule" />

        <p className="hero-kicker">Private Infrastructure For Elite Operators</p>

        <h1>Empire Operating Systems</h1>
        <h2><em>For Digital Operators</em></h2>

        <p className="hero-copy">
          Build owned audience infrastructure, automate your content systems,
          track your growth, and turn influence into long-term digital assets.
        </p>

        <div className="hero-ctas">
          <a
            href="#access"
            className="btn-primary"
            onClick={() => track.event("landing_cta_click", { placement: "hero", label: "enter_empire" })}
          >
            Enter The Empire
          </a>
          <a
            href="#system"
            className="btn-secondary"
            onClick={() => track.event("landing_cta_click", { placement: "hero", label: "explore_system" })}
          >
            Explore the System
          </a>
        </div>

        <WaitlistPanel />
      </section>

      {/* ── FEATURE CARDS ── */}
      <section className="pillars" id="system">
        <article className="pillar-card">
          <div className="pillar-shimmer" />
          <span className="pillar-num">01</span>
          <h3>Audience Infrastructure</h3>
          <p>Build direct audience rails you own, segment citizens with precision, and reduce algorithm dependency to zero.</p>
        </article>
        <article className="pillar-card">
          <div className="pillar-shimmer" />
          <span className="pillar-num">02</span>
          <h3>Social Command Center</h3>
          <p>Coordinate multi-platform distribution, monitor signal quality, and orchestrate campaigns from one command layer.</p>
        </article>
        <article className="pillar-card">
          <div className="pillar-shimmer" />
          <span className="pillar-num">03</span>
          <h3>Monetization Engine</h3>
          <p>Deploy offers, subscriptions, and payment links designed to convert influence into durable digital revenue.</p>
        </article>
      </section>

      {/* ── ARCHITECTURE DIVIDER ── */}
      <section className="architecture" id="architecture">
        <div className="arch-tick" />
        <p>Luxury Intelligence Network</p>
        <div className="arch-tick" />
      </section>

      <style jsx global>{`
        :root {
          --void: #020203;
          --gold: #c8a96e;
          --gold-bright: #e8cc90;
          --gold-dim: #7a6030;
          --rim: rgba(200,169,110,0.18);
          --rim2: rgba(200,169,110,0.35);
          --text: rgba(255,255,255,0.90);
          --muted: rgba(255,255,255,0.42);
          --dim: rgba(255,255,255,0.20);
        }

        .lux-root {
          position: relative;
          min-height: 100vh;
          background: var(--void);
          color: var(--text);
          overflow-x: hidden;
          isolation: isolate;
          padding: 1.25rem clamp(1rem, 3vw, 2.5rem) 7rem;
        }

        .low-motion,
        .low-motion * {
          animation: none !important;
          transition: none !important;
        }

        /* ── BACKGROUND LAYERS ── */
        .bg-watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: min(920px, 95vw);
          height: min(920px, 95vw);
          pointer-events: none;
          z-index: 0;
          opacity: 0.04;
          filter: blur(1.5px);
        }

        .bg-geometry {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .bg-noise {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          opacity: 0.06;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        .bg-radial {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse 70% 60% at 50% 50%, rgba(200,169,110,0.14) 0%, rgba(200,169,110,0.04) 42%, transparent 65%),
            radial-gradient(ellipse 36% 28% at 50% 50%, rgba(200,169,110,0.08) 0%, transparent 52%);
          animation: none;
        }

        .light-rays {
          position: fixed;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 640px;
          pointer-events: none;
          z-index: 0;
          background: conic-gradient(
            from -20deg at 50% 0%,
            transparent 0deg,
            rgba(200,169,110,0.042) 10deg,
            transparent 20deg,
            rgba(200,169,110,0.028) 32deg,
            transparent 42deg,
            rgba(200,169,110,0.038) 56deg,
            transparent 66deg,
            rgba(200,169,110,0.022) 78deg,
            transparent 90deg,
            rgba(200,169,110,0.032) 106deg,
            transparent 116deg
          );
          mask-image: radial-gradient(ellipse 80% 90% at 50% 0%, black 0%, transparent 72%);
          -webkit-mask-image: radial-gradient(ellipse 80% 90% at 50% 0%, black 0%, transparent 72%);
        }

        /* ── NAVBAR ── */
        .lux-nav {
          position: sticky;
          top: 0.9rem;
          z-index: 100;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 1rem;
          padding: 0.55rem 0.85rem;
          max-width: 1200px;
          margin: 0 auto;
          border: 1px solid var(--rim);
          border-radius: 999px;
          background: rgba(3,2,1,0.78);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 1px 0 rgba(200,169,110,0.06) inset;
        }

        .brand-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid var(--rim);
          background: radial-gradient(circle at 30% 28%, rgba(200,169,110,0.14), rgba(0,0,0,0));
          flex-shrink: 0;
          transition: border-color 220ms ease;
        }

        .brand-mark:hover { border-color: var(--rim2); }

        .brand-crop-frame {
          position: relative;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          overflow: hidden;
          display: block;
        }

        .lux-nav-links {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: clamp(0.8rem, 1.8vw, 2rem);
        }

        .lux-nav-links a {
          color: var(--muted);
          text-decoration: none;
          font-family: var(--font-mono), monospace;
          font-size: 0.66rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          transition: color 200ms ease;
        }

        .lux-nav-links a:hover { color: var(--gold-bright); }

        .nav-dot {
          color: var(--gold-dim);
          font-size: 0.45rem;
          line-height: 1;
          user-select: none;
          opacity: 0.7;
        }

        .nav-cta {
          text-decoration: none;
          color: var(--gold);
          border: 1px solid var(--rim);
          border-radius: 999px;
          padding: 0.5rem 1.15rem;
          font-family: var(--font-mono), monospace;
          font-size: 0.62rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          background: rgba(200,169,110,0.055);
          transition: all 260ms cubic-bezier(0.16,1,0.3,1);
          white-space: nowrap;
        }

        .nav-cta:hover {
          border-color: var(--rim2);
          background: rgba(200,169,110,0.13);
          color: var(--gold-bright);
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(200,169,110,0.1);
        }

        /* ── HERO ── */
        .hero {
          max-width: 960px;
          min-height: calc(100vh - 90px);
          margin: 0 auto;
          padding: 2rem 0 3rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          position: relative;
          z-index: 10;
        }

        /* Flanking ghosted M marks */
        .flank {
          position: absolute;
          width: 320px;
          height: 320px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.045;
          filter: blur(1px);
          pointer-events: none;
        }

        .flank-left  { left: -260px; }
        .flank-right { right: -260px; transform: translateY(-50%) scaleX(-1); }

        /* ── EMBLEM ── */
        .emblem-wrap {
          position: relative;
          width: 280px;
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.2rem;
          animation: none;
          flex-shrink: 0;
        }

        .emblem-corona {
          position: absolute;
          inset: -90px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(200,169,110,0.22) 0%, rgba(200,169,110,0.07) 40%, transparent 70%);
          filter: blur(28px);
          animation: none;
          pointer-events: none;
        }

        .emblem-ring {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .emblem-ring-1 {
          inset: -22px;
          border: 1px solid rgba(200,169,110,0.3);
          animation: none;
        }

        .emblem-ring-2 {
          inset: -46px;
          border: 1px dashed rgba(200,169,110,0.16);
          animation: none;
        }

        .emblem-ring-3 {
          inset: -76px;
          border: 1px solid rgba(200,169,110,0.07);
          animation: none;
        }

        .low-motion canvas,
        .low-motion .light-rays {
          display: none !important;
        }

        .emblem-img {
          position: relative;
          z-index: 2;
          width: 260px;
          height: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── HERO TYPOGRAPHY ── */
        .hero-rule {
          width: 80px;
          height: 1px;
          background: linear-gradient(to right, transparent, var(--gold), transparent);
          margin: 0.1rem 0;
          animation: none;
        }

        .hero-kicker {
          color: var(--muted);
          font-family: var(--font-mono), monospace;
          font-size: 0.62rem;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          animation: none;
        }

        .hero h1 {
          margin: 0;
          font-family: var(--font-display), "Cormorant Garamond", serif;
          font-size: clamp(3.2rem, 8.5vw, 6.4rem);
          font-weight: 300;
          letter-spacing: -0.025em;
          line-height: 0.94;
          color: var(--text);
          animation: none;
        }

        .hero h2 {
          margin: 0;
          font-family: var(--font-display), "Cormorant Garamond", serif;
          font-size: clamp(1.05rem, 2.2vw, 1.55rem);
          font-weight: 400;
          font-style: italic;
          color: var(--gold);
          letter-spacing: 0.025em;
          animation: none;
        }

        .hero-copy {
          max-width: 600px;
          color: var(--muted);
          font-family: var(--font-body), sans-serif;
          font-weight: 300;
          font-size: clamp(0.88rem, 1.5vw, 1.05rem);
          line-height: 1.9;
          animation: none;
        }

        .hero-ctas {
          margin-top: 0.3rem;
          display: flex;
          gap: 0.9rem;
          flex-wrap: wrap;
          justify-content: center;
          animation: none;
        }

        .btn-primary, .btn-secondary {
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-family: var(--font-mono), monospace;
          font-size: 0.62rem;
          font-weight: 500;
          border-radius: 999px;
          padding: 0.88rem 1.7rem;
          transition: all 280ms cubic-bezier(0.16,1,0.3,1);
        }

        .btn-primary {
          color: #0c0900;
          background: linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%);
          border: 1px solid rgba(232,204,144,0.3);
          box-shadow: 0 10px 30px rgba(200,169,110,0.28), 0 0 0 1px rgba(200,169,110,0.14);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 42px rgba(200,169,110,0.4), 0 0 24px rgba(200,169,110,0.18);
        }

        .btn-secondary {
          color: var(--gold);
          background: rgba(200,169,110,0.05);
          border: 1px solid var(--rim);
        }

        .btn-secondary:hover {
          background: rgba(200,169,110,0.11);
          border-color: var(--rim2);
          transform: translateY(-2px);
          color: var(--gold-bright);
        }

        /* ── WAITLIST ── */
        .waitlist-wrap {
          margin-top: 1.4rem;
          width: min(760px, 100%);
          border: 1px solid var(--rim);
          border-radius: 22px;
          background: linear-gradient(145deg, rgba(7,6,3,0.92), rgba(5,4,2,0.96));
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 28px 64px rgba(0,0,0,0.65), inset 0 1px 0 rgba(200,169,110,0.08);
          padding: 20px 22px;
          animation: none;
        }

        .waitlist-eyebrow {
          text-align: left;
          margin-bottom: 14px;
          color: var(--muted);
          font-family: var(--font-mono), monospace;
          font-size: 0.58rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .waitlist-row {
          display: grid;
          grid-template-columns: 148px 1fr 182px;
          gap: 12px;
          align-items: center;
        }

        .waitlist-row select,
        .waitlist-row input,
        .waitlist-row button {
          height: 52px;
          border-radius: 999px;
          border: 1px solid var(--rim);
          font-family: var(--font-body), sans-serif;
          font-size: 0.86rem;
          font-weight: 300;
        }

        .waitlist-row select,
        .waitlist-row input {
          color: var(--text);
          background: rgba(10,8,5,0.96);
          padding: 0 20px;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
        }

        .waitlist-row select:focus,
        .waitlist-row input:focus {
          border-color: rgba(200,169,110,0.5);
          box-shadow: 0 0 0 2px rgba(200,169,110,0.07);
        }

        .waitlist-row input::placeholder { color: var(--dim); }

        .waitlist-row button {
          cursor: pointer;
          padding: 0 1rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-family: var(--font-mono), monospace;
          font-size: 0.6rem;
          font-weight: 500;
          color: #0c0900;
          background: linear-gradient(135deg, var(--gold-bright), var(--gold));
          border-color: rgba(200,169,110,0.3);
          transition: all 240ms ease;
        }

        .waitlist-row button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 26px rgba(200,169,110,0.38);
        }

        .waitlist-row button:disabled { opacity: 0.48; cursor: not-allowed; }

        .waitlist-error { margin: 0.6rem 0 0; color: rgba(197,134,100,0.9); font-size: 0.82rem; }

        .waitlist-success { display: grid; gap: 0.35rem; text-align: left; }
        .waitlist-success span { color: var(--gold-bright); font-size: 0.96rem; }
        .waitlist-success small { color: var(--muted); font-size: 0.82rem; }

        /* ── FEATURE CARDS ── */
        .pillars {
          max-width: 1180px;
          margin: 4.5rem auto 2.5rem;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          position: relative;
          z-index: 10;
        }

        .pillar-card {
          position: relative;
          border: 1px solid var(--rim);
          border-radius: 16px;
          background: linear-gradient(150deg, rgba(9,8,5,0.88) 0%, rgba(6,5,3,0.94) 100%);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          padding: 1.55rem 1.45rem;
          min-height: 240px;
          overflow: hidden;
          transition: border-color 280ms ease, transform 280ms cubic-bezier(0.16,1,0.3,1);
        }

        .pillar-shimmer {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(200,169,110,0.55) 50%, transparent 100%);
          opacity: 0;
          transition: opacity 280ms ease;
        }

        .pillar-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 15%, rgba(200,169,110,0.07) 0%, transparent 55%);
          opacity: 0;
          transition: opacity 300ms ease;
          pointer-events: none;
        }

        .pillar-card:hover { border-color: var(--rim2); transform: translateY(-5px); }
        .pillar-card:hover::before { opacity: 1; }
        .pillar-card:hover .pillar-shimmer { opacity: 1; }

        .pillar-num {
          display: block;
          font-family: var(--font-mono), monospace;
          font-size: 0.62rem;
          letter-spacing: 0.22em;
          color: var(--gold);
          margin-bottom: 1rem;
          opacity: 0.85;
        }

        .pillar-card h3 {
          font-family: var(--font-display), "Cormorant Garamond", serif;
          font-size: 1.55rem;
          font-weight: 400;
          color: var(--text);
          margin-bottom: 0.7rem;
          line-height: 1.15;
        }

        .pillar-card p {
          color: var(--muted);
          font-family: var(--font-body), sans-serif;
          font-weight: 300;
          font-size: 0.88rem;
          line-height: 1.82;
          margin: 0;
        }

        /* ── ARCHITECTURE ── */
        .architecture {
          max-width: 1180px;
          margin: 1.5rem auto 0;
          padding: 2rem 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.4rem;
          position: relative;
          z-index: 10;
        }

        .architecture p {
          text-transform: uppercase;
          letter-spacing: 0.24em;
          color: var(--dim);
          font-family: var(--font-mono), monospace;
          font-size: 0.6rem;
          white-space: nowrap;
        }

        .arch-tick {
          width: min(200px, 22vw);
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(200,169,110,0.3), transparent);
        }

        /* ── KEYFRAMES ── */
        @keyframes bgPulse { 0%, 100% { opacity: 0.88; } 50% { opacity: 1; } }

        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(1.18); opacity: 1; }
        }

        @keyframes ringBreathe {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.05); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--void); }
        ::-webkit-scrollbar-thumb { background: rgba(200,169,110,0.18); border-radius: 2px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .lux-nav { grid-template-columns: auto auto; }
          .lux-nav-links { display: none; }
          .pillars { grid-template-columns: 1fr; gap: 0.85rem; }
          .flank { display: none; }
        }

        @media (max-width: 720px) {
          .lux-root { padding-top: 0.85rem; }
          .hero { min-height: calc(100svh - 80px); gap: 0.85rem; padding: 1.5rem 0 2rem; }
          .emblem-wrap { width: 200px; height: 200px; }
          .emblem-img { width: 180px; height: 180px; }
          .emblem-ring-3 { inset: -52px; }
          .waitlist-row { grid-template-columns: 1fr; gap: 10px; }
          .waitlist-row select,
          .waitlist-row input,
          .waitlist-row button { width: 100%; }
          .nav-cta { padding: 0.45rem 0.9rem; font-size: 0.58rem; }
        }
      `}</style>
    </main>
  );
}
