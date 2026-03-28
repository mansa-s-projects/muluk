"use client";

import React, { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────
   CURSOR — lives outside React tree so it
   never re-renders and stays silky smooth
───────────────────────────────────────── */
function Cursor() {
  useEffect(() => {
    const dot  = document.getElementById("cipher-cursor")!;
    const ring = document.getElementById("cipher-ring")!;
    if (!dot || !ring) return;

    let mx = -200, my = -200;
    let rx = -200, ry = -200;
    let raf: number;

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    document.addEventListener("mousemove", onMove);

    const tick = () => {
      rx += (mx - rx) * 0.11;
      ry += (my - ry) * 0.11;
      dot.style.left  = mx + "px";
      dot.style.top   = my + "px";
      ring.style.left = rx + "px";
      ring.style.top  = ry + "px";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const grow   = () => { dot.style.width = "14px"; dot.style.height = "14px"; ring.style.width = "44px"; ring.style.height = "44px"; };
    const shrink = () => { dot.style.width = "8px";  dot.style.height = "8px";  ring.style.width = "32px"; ring.style.height = "32px"; };
    document.querySelectorAll("a, button, [role='button']").forEach(el => {
      el.addEventListener("mouseenter", grow);
      el.addEventListener("mouseleave", shrink);
    });

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null; // DOM elements are in page body below
}

/* ─────────────────────────────────────────
   WAITLIST FORM
───────────────────────────────────────── */
function WaitlistForm({ id }: { id: string }): React.JSX.Element {
  const [done, setDone]   = useState(false);
  const [email, setEmail] = useState("");
  const [type,  setType]  = useState("creator");
  const [err,   setErr]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!email.includes("@")) { setErr(true); inputRef.current?.focus(); return; }
    setErr(false);

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, type }),
    });

    if (res.ok) setDone(true);
    else setErr(true);
  };

  if (done) return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <span style={{ display: "block", fontSize: "28px", marginBottom: "12px" }}>✦</span>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 300, fontStyle: "italic", color: "var(--gold)", marginBottom: "8px" }}>
        {id === "bottom" ? "You're in." : "You're on the list."}
      </div>
      <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 300 }}>
        {id === "bottom" ? "Founding creator access confirmed." : "We'll reach out before anyone else."}
      </div>
    </div>
  );

  return (
    <div>
      {/* label */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "16px" }}>
        {id === "bottom" ? "Reserve your spot" : "Request early access"}
      </div>

      {/* input row */}
      <div className="waitlist-row" style={{
        display: "flex",
        border: `1px solid ${err ? "rgba(200,76,76,0.55)" : "rgba(255,255,255,0.10)"}`,
        borderRadius: "3px",
        background: "rgba(255,255,255,0.02)",
        overflow: "hidden",
        transition: "border-color 0.25s, box-shadow 0.25s",
      }}>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          style={{ background: "transparent", border: "none", borderRight: "1px solid rgba(255,255,255,0.055)", color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", padding: "16px 14px", outline: "none", flexShrink: 0, WebkitAppearance: "none", appearance: "none" }}
        >
          <option value="creator" style={{ background: "#0d0d18" }}>Creator</option>
          <option value="fan"     style={{ background: "#0d0d18" }}>Fan</option>
        </select>

        <input
          ref={inputRef}
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="your@email.com"
          style={{ flex: 1, background: "transparent", border: "none", color: "rgba(255,255,255,0.92)", fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 300, padding: "16px 20px", outline: "none", minWidth: 0 }}
        />

        <button
          onClick={submit}
          style={{ background: "var(--gold)", border: "none", color: "#0a0800", fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", padding: "16px 22px", flexShrink: 0, transition: "opacity 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          Join →
        </button>
      </div>

      {/* social proof */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "18px", fontSize: "12px", color: "var(--dim)", fontWeight: 300 }}>
        <div style={{ display: "flex" }}>
          {(["A","M","K","S"] as const).map((l, i) => (
            <div key={i} style={{ width: "26px", height: "26px", borderRadius: "50%", border: "1.5px solid #020203", marginLeft: i === 0 ? 0 : "-8px", background: ["#c8a96e","#9b8a6e","#d4b886","#8a7d6a"][i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 500, color: "rgba(0,0,0,0.7)" }}>
              {l}
            </div>
          ))}
        </div>
        <span>247 creators already on the waitlist</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function Home() {

  /* scroll reveal */
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));

    /* smooth nav */
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener("click", e => {
        const href = (a as HTMLAnchorElement).getAttribute("href");
        const target = href ? document.querySelector(href) : null;
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth" }); }
      });
    });

    return () => obs.disconnect();
  }, []);

  /* tiny style helpers */
  const mono  = { fontFamily: "var(--font-mono)" } as const;
  const disp  = { fontFamily: "var(--font-display)" } as const;
  const gold  = { color: "var(--gold)" } as const;
  const muted = { color: "var(--muted)" } as const;
  const dim   = { color: "var(--dim)" } as const;

  return (
    <>
      {/* cursor DOM nodes — must be in body */}
      <div id="cipher-cursor" />
      <div id="cipher-ring" />
      <Cursor />

      {/* ══ NAV ══ */}
      <nav className="nav-bar" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "28px 56px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to bottom, rgba(2,2,3,0.92) 0%, transparent 100%)" }}>
        <a href="#" style={{ ...mono, fontSize: "17px", fontWeight: 500, letterSpacing: "0.3em", ...gold, textDecoration: "none" }}>CIPHER</a>
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: "32px" }}>
            {[["#why","Why"],["#how","How it works"],["#tiers","Tiers"]].map(([href, label]) => (
              <a key={href} href={href} style={{ fontSize: "12px", fontWeight: 400, letterSpacing: "0.12em", ...muted, textDecoration: "none", textTransform: "uppercase" as const, transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.92)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
              >{label}</a>
            ))}
          </div>
          <a href="#waitlist" style={{ ...mono, fontSize: "11px", fontWeight: 500, letterSpacing: "0.15em", ...gold, textTransform: "uppercase" as const, textDecoration: "none", border: "1px solid rgba(200,169,110,0.3)", padding: "10px 20px", borderRadius: "2px", transition: "all 0.25s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,169,110,0.12)"; e.currentTarget.style.borderColor = "rgba(200,169,110,0.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)"; }}
          >Join waitlist</a>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section className="hero-section" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "140px 24px 100px", position: "relative", overflow: "hidden" }}>

        {/* orb */}
        <div className="hero-orb" style={{ position: "absolute", width: "700px", height: "700px", borderRadius: "50%", background: "radial-gradient(circle at center, rgba(200,169,110,0.07) 0%, transparent 65%)", top: "50%", left: "50%", pointerEvents: "none" }} />
        {/* horizontal line */}
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(200,169,110,0.15) 30%, rgba(200,169,110,0.15) 70%, transparent 100%)", pointerEvents: "none" }} />

        {/* eyebrow */}
        <div className="anim-eyebrow" style={{ ...mono, display: "inline-flex", alignItems: "center", gap: "12px", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" as const, ...gold, opacity: 0, marginBottom: "52px" }}>
          <span style={{ display: "block", width: "40px", height: "1px", background: "linear-gradient(90deg, transparent, var(--gold-dim))" }} />
          Creator Economy — Redefined
          <span style={{ display: "block", width: "40px", height: "1px", background: "linear-gradient(270deg, transparent, var(--gold-dim))" }} />
        </div>

        {/* headline */}
        <h1 className="anim-headline" style={{ marginBottom: "40px" }}>
          <span style={{ display: "block", fontFamily: "var(--font-body)", fontSize: "clamp(13px,1.8vw,18px)", fontWeight: 300, letterSpacing: "0.35em", textTransform: "uppercase" as const, ...muted, marginBottom: "20px" }}>Introducing</span>
          <span style={{ display: "block", ...disp, fontSize: "clamp(64px,11vw,148px)", fontWeight: 300, lineHeight: 0.88, letterSpacing: "-0.01em", color: "rgba(255,255,255,0.92)" }}>
            <em style={{ fontStyle: "italic", ...gold, fontWeight: 300 }}>CIPHER</em>
          </span>
          <span style={{ display: "block", ...disp, fontSize: "clamp(14px,2.2vw,26px)", fontWeight: 300, fontStyle: "italic", ...muted, marginTop: "20px", letterSpacing: "0.04em" }}>The platform they were afraid to build</span>
        </h1>

        {/* desc */}
        <p className="anim-desc" style={{ maxWidth: "500px", fontSize: "clamp(14px,1.5vw,16px)", fontWeight: 300, lineHeight: 1.85, ...muted, margin: "0 auto 60px" }}>
          Fans with <strong style={{ ...gold, fontWeight: 400 }}>zero accounts</strong>. Payments that <strong style={{ ...gold, fontWeight: 400 }}>split automatically</strong>. Creators who keep <strong style={{ ...gold, fontWeight: 400 }}>88% or more</strong>. Referrals that pay <strong style={{ ...gold, fontWeight: 400 }}>for life</strong>.
        </p>

        {/* waitlist */}
        <div className="anim-waitlist" style={{ width: "100%", maxWidth: "480px", margin: "0 auto" }}>
          <WaitlistForm id="hero" />
        </div>

        {/* stats */}
        <div className="anim-stats hero-stats" style={{ position: "absolute", bottom: "52px", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          {[["8–12%","Platform cut"],["∞","Referral lifetime"],["0","Fan data required"]].map(([num, label], i) => (
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
            ["Anonymous Fan Access","Lifetime Referral Income","Auto Payment Splits","8% Platform Fee","Zero-Knowledge Verification","Crypto-Native Payouts","Creator Tiers","190 Countries","Built for Creators","Fan Code Identity"].map((item, i) => (
              <span key={`${ri}-${i}`} style={{ ...mono, display: "inline-flex", alignItems: "center", gap: "24px", padding: "0 40px", fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase" as const, ...dim }}>
                <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "var(--gold-dim)", flexShrink: 0 }} />
                {item}
              </span>
            ))
          )}
        </div>
      </div>

      {/* ══ WHY CIPHER ══ */}
      <div id="why">
        <div style={{ padding: "clamp(60px,8vw,140px) clamp(20px,4vw,56px)", maxWidth: "1320px", margin: "0 auto" }}>
          <div className="reveal" style={{ ...mono, display: "flex", alignItems: "center", gap: "16px", fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase" as const, color: "var(--gold-dim)", marginBottom: "28px" }}>
            <span style={{ width: "32px", height: "1px", background: "var(--gold-dim)", display: "block" }} />Why CIPHER
          </div>
          <h2 className="reveal reveal-delay-1" style={{ ...disp, fontSize: "clamp(40px,5.5vw,72px)", fontWeight: 300, lineHeight: 1.0, letterSpacing: "-0.01em", marginBottom: "24px" }}>
            The industry has been taking<br />too much, <em style={{ fontStyle: "italic", ...gold }}>for too long.</em>
          </h2>
          <p className="reveal reveal-delay-2" style={{ fontSize: "15px", fontWeight: 300, lineHeight: 1.85, ...muted, maxWidth: "520px", marginBottom: "72px" }}>
            We built CIPHER to fix every broken assumption in the creator economy. Not incrementally. Completely.
          </p>

          <div className="why-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
            {[
              { num:"01", title:"Fans stay", em:"anonymous. Always.", text:"No email. No account. No credit card trail. Every fan gets a unique code — FAN-4729 — that's their entire identity. They pay, they access. Nothing else required.", callout:"No forms. No tracking. No identity required — ever." },
              { num:"02", title:"Splits happen", em:"automatically.", text:"Every payment — card, crypto, wallet — splits in real time. Creator gets their share. Platform takes its cut. Referrer earns their commission. All in one transaction.", callout:"You refer a creator earning $10K/month → you earn $400/month. Forever. No cap." },
              { num:"03", title:"Three tiers.", em:"Real unlocks.", text:"CIPHER, LEGEND, APEX — each tier is a completely different operating level. Different fees, different tools, different payout speed. Not vanity badges. Actual leverage.", callout:"APEX creators pay just 8%. No other platform comes close." },
              { num:"04", title:"Get paid in", em:"190 countries.", text:"Stripe if you have it. Wise if you're in Africa or LatAm. USDC on Polygon if you want instant and borderless. Your earnings always land — no matter where you are.", callout:"Card, crypto, or wallet — your earnings reach you in seconds, anywhere on earth." },
            ].map(({ num, title, em, text, callout }, i) => (
              <div key={num} className={`reveal reveal-delay-${i % 2}`}
                style={{ background: "var(--card)", padding: "48px 44px", position: "relative", overflow: "hidden", transition: "background 0.25s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--card-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--card)")}
              >
                <span style={{ ...disp, fontSize: "80px", fontWeight: 300, color: "rgba(200,169,110,0.07)", lineHeight: 1, position: "absolute", top: "24px", right: "32px", letterSpacing: "-0.03em", pointerEvents: "none" }}>{num}</span>
                <div style={{ width: "44px", height: "44px", borderRadius: "3px", border: "1px solid rgba(200,169,110,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "28px", background: "var(--gold-glow)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /></svg>
                </div>
                <h3 style={{ ...disp, fontSize: "26px", fontWeight: 400, letterSpacing: "-0.01em", marginBottom: "14px", lineHeight: 1.2 }}>
                  {title} <em style={{ fontStyle: "italic", ...gold }}>{em}</em>
                </h3>
                <p style={{ fontSize: "14px", fontWeight: 300, lineHeight: 1.8, ...muted }}>{text}</p>
                <div style={{ marginTop: "24px", padding: "14px 18px", background: "var(--gold-glow)", borderLeft: "2px solid rgba(200,169,110,0.4)", ...mono, fontSize: "12px", ...gold, lineHeight: 1.5, borderRadius: "0 2px 2px 0" }}>{callout}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ NUMBERS ══ */}
      <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="numbers-inner" style={{ maxWidth: "1320px", margin: "0 auto", padding: "clamp(60px,8vw,100px) clamp(20px,4vw,56px)", display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
          {[["88%","Creator keeps","Platform takes just 12% — nothing more"],["∞","Referral lifetime","Every competitor caps or expires it"],["0","Fan data collected","No email, no name, no account ever"],["190","Countries supported","Crypto payouts reach where banks don't"]].map(([val, label, sub], i) => (
            <div key={i} className={`reveal reveal-delay-${i} numbers-item`} style={{ padding: "40px 32px", textAlign: "center", borderLeft: i > 0 ? "1px solid var(--border)" : "none" }}>
              <span style={{ display: "block", ...disp, fontSize: "clamp(48px,6vw,80px)", fontWeight: 300, lineHeight: 1, marginBottom: "12px", ...gold }}>{val}</span>
              <span style={{ ...mono, fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase" as const, ...dim, display: "block", marginBottom: "8px" }}>{label}</span>
              <span style={{ fontSize: "12px", fontWeight: 300, color: "rgba(255,255,255,0.25)", lineHeight: 1.5 }}>{sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ HOW IT WORKS ══ */}
      <div id="how">
        <div style={{ padding: "clamp(60px,8vw,140px) clamp(20px,4vw,56px)", maxWidth: "1320px", margin: "0 auto" }}>
          <div className="reveal" style={{ ...mono, display: "flex", alignItems: "center", gap: "16px", fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase" as const, color: "var(--gold-dim)", marginBottom: "28px" }}>
            <span style={{ width: "32px", height: "1px", background: "var(--gold-dim)", display: "block" }} />How it works
          </div>
          <h2 className="reveal reveal-delay-1" style={{ ...disp, fontSize: "clamp(40px,5.5vw,72px)", fontWeight: 300, lineHeight: 1.0, letterSpacing: "-0.01em", marginBottom: "72px" }}>
            Simple for fans.<br /><em style={{ fontStyle: "italic", ...gold }}>Powerful for creators.</em>
          </h2>

          <div className="how-layout" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "start" }}>
            {/* steps */}
            <div className="reveal reveal-delay-2">
              {[
                ["01","Fan finds a creator","No signup wall. No email prompt. The page just loads. Creators share their cipher.so link anywhere — social, DMs, bio."],
                ["02","Fan pays — anonymously","Card, crypto, or stablecoin. One tap. The system generates their Fan Code. FAN-4729 is born. No registration, no password, no email."],
                ["03","Payment splits instantly","In the same moment the fan pays: creator wallet credited, platform fee deducted, referrer commission queued. Automated. Immutable. Real time."],
                ["04","Creator withdraws their way","Bank transfer, Wise, USDC on Polygon, PayPal. No Stripe required. Creators in Morocco, Nigeria, Pakistan — everyone gets paid."],
                ["05","Referrers earn forever","Every creator you bring earns you a lifetime commission on everything they make. No caps. No expiry dates."],
              ].map(([num, title, text], i) => (
                <div key={num} style={{ display: "flex", gap: "28px", padding: "32px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none", transition: "padding-left 0.3s" }}
                  onMouseEnter={e => (e.currentTarget.style.paddingLeft = "8px")}
                  onMouseLeave={e => (e.currentTarget.style.paddingLeft = "0")}
                >
                  <div style={{ ...disp, fontSize: "13px", fontWeight: 400, color: "var(--gold-dim)", letterSpacing: "0.05em", flexShrink: 0, marginTop: "4px", width: "28px" }}>{num}</div>
                  <div>
                    <h4 style={{ ...disp, fontSize: "22px", fontWeight: 400, marginBottom: "10px", letterSpacing: "-0.01em" }}>{title}</h4>
                    <p style={{ fontSize: "13px", fontWeight: 300, ...muted, lineHeight: 1.8 }}>{text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* fan code card */}
            <div className="reveal reveal-delay-3 fan-demo-card" style={{ background: "var(--card)", border: "1px solid var(--border-mid)", borderRadius: "4px", padding: "40px", position: "sticky", top: "100px" }}>
              <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase" as const, ...dim, marginBottom: "24px" }}>Fan identity</div>
              <span style={{ ...mono, fontSize: "52px", fontWeight: 300, ...gold, letterSpacing: "0.05em", display: "block", marginBottom: "8px", lineHeight: 1 }}>FAN-4729</span>
              <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.2em", ...dim, marginBottom: "32px" }}>Permanent · Anonymous · Active</div>

              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
                {[
                  [false,"No email address"],[false,"No real name"],[false,"No account or password"],
                  [true,"Permanent access via code"],[true,"Works across all devices"],[true,"Crypto or card payment"],
                ].map(([check, text], i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", fontWeight: 300, ...muted }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: check ? "rgba(76,200,140,0.12)" : "rgba(200,76,76,0.10)", border: `1px solid ${check ? "rgba(76,200,140,0.25)" : "rgba(200,76,76,0.20)"}` }}>
                      {check
                        ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#4cc88c" strokeWidth="2"><polyline points="2,5 4,7 8,3" /></svg>
                        : <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#c84c4c" strokeWidth="2"><line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" /></svg>
                      }
                    </div>
                    {String(text)}
                  </li>
                ))}
              </ul>

              <div style={{ height: "1px", background: "var(--border)", margin: "28px 0" }} />
              <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase" as const, ...dim, marginBottom: "14px" }}>Subscribed to</div>
              {[["@darkwave.studio","Legend","var(--gold)","rgba(200,169,110,0.1)","rgba(200,169,110,0.2)"],["@void.frames","Apex","#d88888","rgba(200,76,76,0.08)","rgba(200,76,76,0.18)"],["@signal.raw","Cipher","#9898cc","rgba(140,140,200,0.08)","rgba(140,140,200,0.15)"]].map(([creator,tier,color,bg,border]) => (
                <div key={creator as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                  <span style={{ ...muted, fontWeight: 300 }}>{creator}</span>
                  <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase" as const, padding: "3px 10px", borderRadius: "2px", color: String(color), background: String(bg), border: `1px solid ${border}` }}>{tier}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ TIERS ══ */}
      <div id="tiers">
        <div style={{ padding: "clamp(60px,8vw,140px) clamp(20px,4vw,56px)", maxWidth: "1320px", margin: "0 auto" }}>
          <div className="reveal" style={{ ...mono, display: "flex", alignItems: "center", gap: "16px", fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase" as const, color: "var(--gold-dim)", marginBottom: "28px" }}>
            <span style={{ width: "32px", height: "1px", background: "var(--gold-dim)", display: "block" }} />Creator tiers
          </div>
          <h2 className="reveal reveal-delay-1" style={{ ...disp, fontSize: "clamp(40px,5.5vw,72px)", fontWeight: 300, lineHeight: 1.0, letterSpacing: "-0.01em", marginBottom: "24px" }}>
            Three levels.<br /><em style={{ fontStyle: "italic", ...gold }}>Real differences.</em>
          </h2>
          <p className="reveal reveal-delay-2" style={{ fontSize: "15px", fontWeight: 300, lineHeight: 1.85, ...muted, maxWidth: "520px", marginBottom: "72px" }}>
            Not cosmetic upgrades — actual economic and tooling advantages at every level.
          </p>

          <div className="tiers-layout" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
            {[
              { tag:"Entry",       name:"Cipher", cut:"Platform keeps 12%", featured:false, tagColor:"#9898cc", tagBg:"rgba(140,140,200,0.08)", tagBorder:"rgba(140,140,200,0.15)", arrow:"#7878aa", bg:"var(--card)",   bgHover:"var(--card-hover)", features:["Up to 500 fan codes","Video, photo, text content","Analytics dashboard","Referral program unlocked","Standard 7-day payouts","All payout rails available"] },
              { tag:"Most Popular",name:"Legend", cut:"Platform keeps 10%", featured:true,  tagColor:"var(--gold)", tagBg:"var(--gold-glow)", tagBorder:"rgba(200,169,110,0.25)", arrow:"var(--gold-dim)", bg:"#131220", bgHover:"#161528", features:["Unlimited fan codes","All formats + live rooms","AI content tools included","Collab split system","48-hour priority payouts","Dedicated success rep","Boosted referral rate","Algorithm placement boost"] },
              { tag:"Invite Only", name:"Apex",   cut:"Platform keeps 8%",  featured:false, tagColor:"#d88888",  tagBg:"rgba(200,76,76,0.08)",  tagBorder:"rgba(200,76,76,0.18)",  arrow:"#aa6868", bg:"var(--card)",   bgHover:"var(--card-hover)", features:["Custom domain for page","API access","Instant payouts, always","Highest referral multiplier","Private team access","Roadmap input","Revenue guarantees (pilot)","White-glove onboarding"] },
            ].map(({ tag, name, cut, featured, tagColor, tagBg, tagBorder, arrow, bg, bgHover, features }, i) => (
              <div key={name} className={`reveal reveal-delay-${i}`}
                style={{ padding: "48px 40px", background: bg, position: "relative", transition: "background 0.25s" }}
                onMouseEnter={e => (e.currentTarget.style.background = bgHover)}
                onMouseLeave={e => (e.currentTarget.style.background = bg)}
              >
                {featured && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, var(--gold), transparent)" }} />}
                <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase" as const, marginBottom: "20px", display: "inline-block", padding: "5px 12px", borderRadius: "2px", color: tagColor, background: tagBg, border: `1px solid ${tagBorder}` }}>{tag}</div>
                <div style={{ ...disp, fontSize: "38px", fontWeight: 300, letterSpacing: "-0.01em", marginBottom: "6px" }}>{name}</div>
                <div style={{ ...mono, fontSize: "12px", color: featured ? "var(--gold-dim)" : "var(--dim)", marginBottom: "32px", letterSpacing: "0.08em" }}>{cut}</div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "14px" }}>
                  {features.map(f => (
                    <li key={f} style={{ fontSize: "13px", fontWeight: 300, ...muted, display: "flex", alignItems: "flex-start", gap: "10px", lineHeight: 1.5 }}>
                      <span style={{ ...mono, fontSize: "11px", flexShrink: 0, marginTop: "1px", color: arrow }}>→</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ FINAL CTA ══ */}
      <div id="waitlist" style={{ textAlign: "center", padding: "160px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(200,169,110,0.06) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
        <div className="reveal" style={{ ...mono, fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" as const, color: "var(--gold-dim)", marginBottom: "40px" }}>Early access</div>
        <h2 className="reveal reveal-delay-1" style={{ ...disp, fontSize: "clamp(52px,8vw,110px)", fontWeight: 300, lineHeight: 0.92, letterSpacing: "-0.02em", marginBottom: "32px" }}>
          Be first.<br /><em style={{ fontStyle: "italic", ...gold }}>Build more.</em>
        </h2>
        <p className="reveal reveal-delay-2" style={{ fontSize: "15px", fontWeight: 300, ...muted, marginBottom: "56px", maxWidth: "440px", margin: "0 auto 56px", lineHeight: 1.8 }}>
          We're onboarding the first 500 creators personally. Lower fees locked in for life, and a founding creator badge.
        </p>
        <div className="reveal reveal-delay-3" style={{ maxWidth: "460px", margin: "0 auto" }}>
          <WaitlistForm id="bottom" />
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "48px clamp(20px,4vw,56px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "24px" }}>
        <div style={{ ...mono, fontSize: "15px", letterSpacing: "0.3em", ...gold, fontWeight: 500 }}>CIPHER</div>
        <div style={{ display: "flex", gap: "32px" }}>
          {["Privacy","Terms","Contact"].map(l => (
            <a key={l} href="#" style={{ fontSize: "11px", ...dim, textDecoration: "none", letterSpacing: "0.08em", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
            >{l}</a>
          ))}
        </div>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.15em", ...dim }}>© 2025 CIPHER. All rights reserved.</div>
      </footer>
    </>
  );
}
