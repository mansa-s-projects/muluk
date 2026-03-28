"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type FormData = {
  // step 1
  name: string;
  handle: string;
  category: string;
  // step 2
  country: string;
  payout: string;
  // step 3
  content: string[];
  audience: string;
  bio: string;
  // meta
  email: string;
};

const CATEGORIES = ["Music", "Art & Design", "Photography", "Film & Video", "Writing", "Podcasting", "Gaming", "Fitness", "Cooking", "Education", "Comedy", "Fashion", "Tech", "Other"];
const CONTENT_TYPES = ["Photos", "Videos", "Audio", "Live streams", "Written posts", "Exclusive downloads", "1-on-1 messages", "Tutorials"];
const PAYOUT_METHODS = ["Stripe", "Wise", "USDC (Polygon)", "PayPal"];
const AUDIENCE_SIZES = ["Under 1K", "1K–10K", "10K–50K", "50K–100K", "100K–500K", "500K+"];
const COUNTRIES = ["United Arab Emirates", "United States", "United Kingdom", "Morocco", "Nigeria", "France", "Germany", "Canada", "Australia", "Saudi Arabia", "Egypt", "South Africa", "Brazil", "India", "Pakistan", "Indonesia", "Philippines", "Other"];

/* ─────────────────────────────────────────
   CURSOR
───────────────────────────────────────── */
function Cursor() {
  useEffect(() => {
    const dot  = document.getElementById("cipher-cursor");
    const ring = document.getElementById("cipher-ring");
    if (!dot || !ring) return;
    let mx = -200, my = -200, rx = -200, ry = -200, raf: number;
    const move = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    document.addEventListener("mousemove", move);
    const tick = () => {
      rx += (mx - rx) * 0.11; ry += (my - ry) * 0.11;
      dot.style.left  = mx + "px"; dot.style.top  = my + "px";
      ring.style.left = rx + "px"; ring.style.top = ry + "px";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { document.removeEventListener("mousemove", move); cancelAnimationFrame(raf); };
  }, []);
  return null;
}

/* ─────────────────────────────────────────
   STEP INDICATOR
───────────────────────────────────────── */
function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "56px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: i < current ? "24px" : i === current ? "32px" : "24px",
            height: "2px",
            background: i < current ? "var(--gold)" : i === current ? "var(--gold)" : "rgba(255,255,255,0.1)",
            borderRadius: "2px",
            transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
          }} />
          {i < total - 1 && (
            <div style={{ width: "16px", height: "1px", background: "rgba(255,255,255,0.08)" }} />
          )}
        </div>
      ))}
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.2em", color: "var(--dim)", marginLeft: "8px" }}>
        {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────
   FIELD COMPONENTS
───────────────────────────────────────── */
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase" as const, color: error ? "#c84c4c" : "var(--gold-dim)", marginBottom: "10px" }}>
        {label} {error && <span style={{ color: "#c84c4c" }}>— {error}</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "3px",
  color: "rgba(255,255,255,0.92)",
  fontFamily: "var(--font-body)",
  fontSize: "15px",
  fontWeight: 300,
  padding: "14px 18px",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

function Input({ value, onChange, placeholder, prefix }: { value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string; }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {prefix && (
        <span style={{ position: "absolute", left: "18px", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--gold-dim)", pointerEvents: "none" }}>{prefix}</span>
      )}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle,
          paddingLeft: prefix ? "36px" : "18px",
          borderColor: focused ? "rgba(200,169,110,0.45)" : "rgba(255,255,255,0.10)",
          boxShadow: focused ? "0 0 0 3px rgba(200,169,110,0.07)" : "none",
        }}
      />
    </div>
  );
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        WebkitAppearance: "none",
        appearance: "none",
        borderColor: focused ? "rgba(200,169,110,0.45)" : "rgba(255,255,255,0.10)",
        boxShadow: focused ? "0 0 0 3px rgba(200,169,110,0.07)" : "none",
      }}
    >
      {placeholder && <option value="" style={{ background: "#0d0d18" }}>{placeholder}</option>}
      {options.map(o => <option key={o} value={o} style={{ background: "#0d0d18" }}>{o}</option>)}
    </select>
  );
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string; }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      style={{
        ...inputStyle,
        resize: "none",
        lineHeight: 1.7,
        borderColor: focused ? "rgba(200,169,110,0.45)" : "rgba(255,255,255,0.10)",
        boxShadow: focused ? "0 0 0 3px rgba(200,169,110,0.07)" : "none",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function Chips({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void; }) {
  const toggle = (o: string) => {
    onChange(selected.includes(o) ? selected.filter(s => s !== o) : [...selected, o]);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {options.map(o => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            style={{
              background: active ? "var(--gold-glow)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${active ? "rgba(200,169,110,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: "2px",
              color: active ? "var(--gold)" : "var(--muted)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              padding: "8px 14px",
              transition: "all 0.2s",
              cursor: "pointer",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function RadioCards({ options, selected, onChange }: { options: string[]; selected: string; onChange: (v: string) => void; }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "10px" }}>
      {options.map(o => {
        const active = selected === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            style={{
              background: active ? "var(--gold-glow)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${active ? "rgba(200,169,110,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: "3px",
              color: active ? "var(--gold)" : "var(--muted)",
              fontFamily: active ? "var(--font-mono)" : "var(--font-body)",
              fontSize: "13px",
              fontWeight: active ? 500 : 300,
              letterSpacing: active ? "0.08em" : 0,
              padding: "14px 18px",
              textAlign: "left" as const,
              transition: "all 0.2s",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ width: "16px", height: "16px", borderRadius: "50%", border: `1px solid ${active ? "var(--gold)" : "rgba(255,255,255,0.2)"}`, background: active ? "var(--gold)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {active && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0a0800" }} />}
            </span>
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function Apply() {
  const router = useRouter();
  const [step, setStep]         = useState(0);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState("");
  const contentRef              = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormData>({
    name: "", handle: "", category: "",
    country: "", payout: "",
    content: [], audience: "", bio: "",
    email: "",
  });

  const set = (key: keyof FormData) => (val: string | string[]) =>
    setForm(f => ({ ...f, [key]: val }));

  /* scroll to top on step change */
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  /* validation */
  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.name.trim())    e.name     = "required";
      if (!form.handle.trim())  e.handle   = "required";
      if (!form.category)       e.category = "required";
    }
    if (step === 1) {
      if (!form.country)        e.country  = "required";
      if (!form.payout)         e.payout   = "required";
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(form.email)) e.email = "valid email required";
    }
    if (step === 2) {
      if (!form.content.length) e.content  = "select at least one";
      if (!form.audience)       e.audience = "required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = async () => {
    if (!validate()) return;
    if (step < 3) { setStep(s => s + 1); return; }

    /* submit */
    setLoading(true);
    setServerErr("");
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* non-JSON response */ }
      if (!res.ok) {
        setServerErr((data.error as string) || "Something went wrong. Please try again.");
        return;
      }
      setStep(4);
    } catch {
      setServerErr("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const back = () => { setErrors({}); setStep(s => s - 1); };

  /* styles */
  const mono  = { fontFamily: "var(--font-mono)" } as const;
  const disp  = { fontFamily: "var(--font-display)" } as const;
  const gold  = { color: "var(--gold)" } as const;
  const muted = { color: "var(--muted)" } as const;

  return (
    <>
      <div id="cipher-cursor" style={{ position: "fixed", width: "8px", height: "8px", background: "var(--gold)", borderRadius: "50%", pointerEvents: "none", zIndex: 99999, top: "-100px", left: "-100px", transform: "translate(-50%,-50%)", mixBlendMode: "screen" }} />
      <div id="cipher-ring"   style={{ position: "fixed", width: "32px", height: "32px", border: "1px solid rgba(200,169,110,0.4)", borderRadius: "50%", pointerEvents: "none", zIndex: 99998, top: "-100px", left: "-100px", transform: "translate(-50%,-50%)" }} />
      <Cursor />

      <div className="apply-grid" style={{ minHeight: "100vh", background: "#020203", display: "grid", gridTemplateColumns: "1fr 1fr" }}>

        {/* ── LEFT PANEL — branding ── */}
        <div className="apply-left" style={{ background: "var(--surface)", borderRight: "1px solid var(--border)", padding: "56px 64px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "sticky", top: 0, height: "100vh" }}>

          {/* logo */}
          <Link href="/" style={{ ...mono, fontSize: "17px", fontWeight: 500, letterSpacing: "0.3em", ...gold, textDecoration: "none" }}>CIPHER</Link>

          {/* center content */}
          <div>
            <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase" as const, color: "var(--gold-dim)", marginBottom: "28px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ width: "24px", height: "1px", background: "var(--gold-dim)", display: "block" }} />
              Creator application
            </div>
            <h1 style={{ ...disp, fontSize: "clamp(40px,4vw,58px)", fontWeight: 300, lineHeight: 1.0, letterSpacing: "-0.01em", marginBottom: "24px" }}>
              {step === 0 && <><em style={{ ...gold, fontStyle: "italic" }}>Who</em> are you?</>}
              {step === 1 && <>Where do you<br /><em style={{ ...gold, fontStyle: "italic" }}>get paid?</em></>}
              {step === 2 && <>What do you<br /><em style={{ ...gold, fontStyle: "italic" }}>create?</em></>}
              {step === 3 && <>Almost<br /><em style={{ ...gold, fontStyle: "italic" }}>there.</em></>}
              {step === 4 && <>You&apos;re<br /><em style={{ ...gold, fontStyle: "italic" }}>in.</em></>}
            </h1>
            <p style={{ fontSize: "14px", fontWeight: 300, lineHeight: 1.8, ...muted, maxWidth: "320px" }}>
              {step === 0 && "Tell us about yourself. Your handle is your identity on CIPHER."}
              {step === 1 && "We support Stripe, Wise, crypto, and PayPal. No Stripe account required."}
              {step === 2 && "What kind of content do you create and how big is your current audience?"}
              {step === 3 && "Review your application. We'll reach out within 48 hours."}
              {step === 4 && "Founding creator access confirmed. Your fee is locked in for life."}
            </p>

            {/* step perks */}
            {step < 4 && (
              <div style={{ marginTop: "48px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {[
                  ["Fees locked in for life", step >= 0],
                  ["Founding creator badge", step >= 0],
                  ["Personal onboarding", step >= 1],
                  ["Lifetime referral income", step >= 2],
                ].map(([text, active]) => (
                  <div key={text as string} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", fontWeight: 300, color: active ? "var(--muted)" : "rgba(255,255,255,0.15)", transition: "color 0.4s" }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: `1px solid ${active ? "rgba(200,169,110,0.3)" : "rgba(255,255,255,0.08)"}`, background: active ? "var(--gold-glow)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.4s" }}>
                      {active && <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="var(--gold)" strokeWidth="2"><polyline points="2,5 4,7 8,3" /></svg>}
                    </div>
                    {text as string}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* bottom quote */}
          <div style={{ ...disp, fontSize: "13px", fontStyle: "italic", color: "var(--dim)", lineHeight: 1.7 }}>
            &quot;The first 500 creators get fees locked<br />in for life. You&apos;re early.&quot;
          </div>
        </div>

        {/* ── RIGHT PANEL — form ── */}
        <div ref={contentRef} className="apply-right" style={{ padding: "56px 64px", overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {step < 4 && <Steps current={step} total={4} />}

          {/* ── STEP 0 — identity ── */}
          {step === 0 && (
            <div style={{ animation: "fadeUp 0.5s ease forwards" }}>
              <Field label="Full name" error={errors.name}>
                <Input value={form.name} onChange={set("name")} placeholder="El Mehdi" />
              </Field>
              <Field label="Creator handle" error={errors.handle}>
                <Input value={form.handle} onChange={set("handle")} placeholder="yourhandle" prefix="@" />
              </Field>
              <Field label="Category" error={errors.category}>
                <Select value={form.category} onChange={set("category")} options={CATEGORIES} placeholder="Select your category" />
              </Field>
            </div>
          )}

          {/* ── STEP 1 — payout + email ── */}
          {step === 1 && (
            <div style={{ animation: "fadeUp 0.5s ease forwards" }}>
              <Field label="Email address" error={errors.email}>
                <Input value={form.email} onChange={set("email")} placeholder="you@email.com" />
              </Field>
              <Field label="Country" error={errors.country}>
                <Select value={form.country} onChange={set("country")} options={COUNTRIES} placeholder="Select your country" />
              </Field>
              <Field label="Preferred payout method" error={errors.payout}>
                <RadioCards options={PAYOUT_METHODS} selected={form.payout} onChange={set("payout")} />
              </Field>
            </div>
          )}

          {/* ── STEP 2 — content ── */}
          {step === 2 && (
            <div style={{ animation: "fadeUp 0.5s ease forwards" }}>
              <Field label="Content types" error={errors.content}>
                <Chips options={CONTENT_TYPES} selected={form.content} onChange={val => set("content")(val)} />
              </Field>
              <Field label="Current audience size" error={errors.audience}>
                <RadioCards options={AUDIENCE_SIZES} selected={form.audience} onChange={set("audience")} />
              </Field>
              <Field label="Bio — tell fans who you are (optional)">
                <Textarea value={form.bio} onChange={set("bio")} placeholder="I create dark ambient music and visual art..." />
              </Field>
            </div>
          )}

          {/* ── STEP 3 — review ── */}
          {step === 3 && (
            <div style={{ animation: "fadeUp 0.5s ease forwards" }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--border-mid)", borderRadius: "4px", overflow: "hidden", marginBottom: "32px" }}>
                {[
                  ["Name", form.name],
                  ["Handle", `@${form.handle}`],
                  ["Category", form.category],
                  ["Email", form.email],
                  ["Country", form.country],
                  ["Payout", form.payout],
                  ["Content", (form.content as string[]).join(", ")],
                  ["Audience", form.audience],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ ...mono, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "var(--dim)" }}>{label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 300, ...muted, textAlign: "right" as const, maxWidth: "260px" }}>{val || "—"}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "var(--gold-glow)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "3px", padding: "16px 20px", ...mono, fontSize: "12px", ...gold, lineHeight: 1.6 }}>
                By applying you agree to CIPHER&apos;s creator terms. We&apos;ll review your application and reach out within 48 hours.
              </div>
            </div>
          )}

          {/* ── STEP 4 — success ── */}
          {step === 4 && (
            <div style={{ textAlign: "center", padding: "40px 0", animation: "fadeUp 0.6s ease forwards" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "var(--gold-glow)", border: "1px solid rgba(200,169,110,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h2 style={{ ...disp, fontSize: "48px", fontWeight: 300, fontStyle: "italic", ...gold, marginBottom: "16px", lineHeight: 1 }}>Application sent.</h2>
              <p style={{ fontSize: "15px", fontWeight: 300, ...muted, lineHeight: 1.8, maxWidth: "380px", margin: "0 auto 40px" }}>
                We&apos;ll review <strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 400 }}>{form.email}</strong> and get back to you within 48 hours. Check your inbox for a confirmation.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                {["Founding creator badge", "Fees locked for life", "Personal onboarding"].map(perk => (
                  <span key={perk} style={{ ...mono, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" as const, padding: "7px 14px", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "2px", ...gold, background: "var(--gold-glow)" }}>{perk}</span>
                ))}
              </div>
              <button
                onClick={() => router.push("/")}
                style={{ marginTop: "48px", background: "transparent", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "3px", color: "var(--muted)", ...mono, fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" as const, padding: "12px 24px", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "var(--muted)"; }}
              >
                ← Back to cipher.so
              </button>
            </div>
          )}

          {/* ── NAV BUTTONS ── */}
          {step < 4 && (
            <div style={{ marginTop: "auto", paddingTop: "48px" }}>
              {serverErr && (
                <div style={{ marginBottom: "16px", padding: "12px 16px", background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.25)", borderRadius: "3px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c84c4c", letterSpacing: "0.05em" }}>
                  {serverErr}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {step > 0
                ? <button onClick={back} style={{ background: "transparent", border: "none", ...mono, fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "var(--dim)", padding: "12px 0", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--muted)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--dim)")}
                  >← Back</button>
                : <Link href="/" style={{ ...mono, fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "var(--dim)", textDecoration: "none" }}>← cipher.so</Link>
              }
              <button
                onClick={next}
                disabled={loading}
                style={{ background: "var(--gold)", border: "none", color: "#0a0800", ...mono, fontSize: "11px", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase" as const, padding: "14px 32px", borderRadius: "2px", transition: "opacity 0.2s", opacity: loading ? 0.6 : 1 }}
                onMouseEnter={e => !loading && (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = loading ? "0.6" : "1")}
              >
                {loading ? "Sending..." : step === 3 ? "Submit application →" : "Continue →"}
              </button>
            </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (hover: hover) and (pointer: fine) {
          #cipher-cursor, #cipher-ring { display: block; }
          body:has(#cipher-cursor) * { cursor: none !important; }
        }
        @media (hover: none), (pointer: coarse) {
          #cipher-cursor, #cipher-ring { display: none !important; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #020203; }
        ::-webkit-scrollbar-thumb { background: rgba(200,169,110,0.2); border-radius: 2px; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.22); }
        select option { background: #0d0d18; }
      `}</style>
    </>
  );
}