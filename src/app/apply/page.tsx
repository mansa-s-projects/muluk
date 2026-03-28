"use client";

import { useState } from "react";

const CATEGORIES = ["Music", "Fashion", "Beauty", "Fitness", "Gaming", "Lifestyle", "Art", "Tech", "Food", "Travel", "Other"];
const COUNTRIES   = ["United States", "United Kingdom", "France", "Germany", "Nigeria", "South Africa", "UAE", "Saudi Arabia", "Canada", "Australia", "Other"];
const PAYOUTS     = ["Stripe", "PayPal", "Bank Transfer", "Crypto"];
const SIZES       = ["< 1K", "1K - 10K", "10K - 100K", "100K - 1M", "1M+"];
const CONTENT     = ["Short-form video", "Long-form video", "Photos", "Audio / Podcast", "Written", "Live streams"];

const S = {
  page: { minHeight: "100vh", background: "var(--void)", color: "var(--white)", fontFamily: "var(--font-body, Outfit), sans-serif", padding: "80px 24px 120px" } as React.CSSProperties,
  wrap: { maxWidth: 640, margin: "0 auto" } as React.CSSProperties,
  eyebrow: { fontFamily: "var(--font-mono, monospace)", fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase" as const, color: "var(--gold-dim)", marginBottom: "20px" },
  title: { fontFamily: "var(--font-display, Georgia), serif", fontSize: "clamp(32px,6vw,52px)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.15, color: "var(--gold)", marginBottom: "12px" },
  sub: { fontSize: "15px", color: "var(--muted)", fontWeight: 300, lineHeight: 1.7, marginBottom: "56px" },
  divider: { border: "none", borderTop: "1px solid var(--border)", margin: "40px 0" } as React.CSSProperties,
  label: { display: "block", fontFamily: "var(--font-mono, monospace)", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "var(--gold-dim)", marginBottom: "10px" },
  input: { width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-mid)", borderRadius: "3px", color: "var(--white)", fontFamily: "var(--font-body, Outfit), sans-serif", fontSize: "14px", fontWeight: 300, padding: "14px 18px", outline: "none", boxSizing: "border-box" as const },
  select: { width: "100%", background: "#0d0d18", border: "1px solid var(--border-mid)", borderRadius: "3px", color: "var(--white)", fontFamily: "var(--font-mono, monospace)", fontSize: "12px", padding: "14px 18px", outline: "none", WebkitAppearance: "none" as const, appearance: "none" as const },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" } as React.CSSProperties,
  field: { marginBottom: "24px" } as React.CSSProperties,
  checkGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" } as React.CSSProperties,
  chip: (active: boolean) => ({ display: "flex", alignItems: "center", gap: "10px", border: `1px solid ${active ? "var(--gold)" : "var(--border-mid)"}`, borderRadius: "3px", padding: "10px 14px", background: active ? "var(--gold-glow)" : "transparent", cursor: "none", transition: "all 0.2s", fontSize: "13px", color: active ? "var(--gold)" : "var(--muted)", fontWeight: 300 }) as React.CSSProperties,
  btn: { width: "100%", background: "var(--gold)", border: "none", borderRadius: "3px", color: "#0a0800", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase" as const, padding: "18px", marginTop: "40px", transition: "opacity 0.2s" },
  err: { color: "rgba(220,80,80,0.9)", fontSize: "12px", marginTop: "6px", fontFamily: "var(--font-mono, monospace)" },
};

export default function ApplyPage() {
  const [form, setForm] = useState({
    name: "", handle: "", category: "", email: "",
    country: "", payout_method: "", audience_size: "", bio: "",
  });
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [serverErr, setServerErr] = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const toggleContent = (val: string) =>
    setContentTypes(c => c.includes(val) ? c.filter(x => x !== val) : [...c, val]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())         e.name          = "Required";
    if (!form.handle.trim())       e.handle        = "Required";
    if (!form.category)            e.category      = "Required";
    if (!form.email.includes("@")) e.email         = "Valid email required";
    if (!form.country)             e.country       = "Required";
    if (!form.payout_method)       e.payout_method = "Required";
    if (!form.audience_size)       e.audience_size = "Required";
    if (contentTypes.length === 0) e.content_types = "Select at least one";
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    setServerErr("");

    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, content_types: contentTypes }),
    });

    setLoading(false);
    if (res.ok) { setDone(true); return; }
    const data = await res.json();
    setServerErr(data.error ?? "Something went wrong. Please try again.");
  };

  if (done) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: "36px", marginBottom: "24px" }}>&#10003;</div>
        <div style={{ fontFamily: "var(--font-display, Georgia), serif", fontSize: "36px", fontWeight: 300, fontStyle: "italic", color: "var(--gold)", marginBottom: "16px" }}>Application received.</div>
        <div style={{ fontSize: "15px", color: "var(--muted)", fontWeight: 300, lineHeight: 1.7 }}>We review every application personally. You&apos;ll hear from us within 5-7 business days at <span style={{ color: "var(--gold)" }}>{form.email}</span>.</div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {/* Header */}
        <div style={S.eyebrow}>Creator Program</div>
        <div style={S.title}>Apply to CIPHER</div>
        <div style={S.sub}>We&apos;re building the next generation of creator monetization. Tell us about yourself &mdash; we review every application personally.</div>

        {/* Identity */}
        <div style={S.row}>
          <div>
            <label style={S.label}>Full Name</label>
            <input style={S.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your name" />
            {errors.name && <div style={S.err}>{errors.name}</div>}
          </div>
          <div>
            <label style={S.label}>Handle / Username</label>
            <input style={S.input} value={form.handle} onChange={e => set("handle", e.target.value)} placeholder="@yourhandle" />
            {errors.handle && <div style={S.err}>{errors.handle}</div>}
          </div>
        </div>

        <div style={S.row}>
          <div>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@email.com" />
            {errors.email && <div style={S.err}>{errors.email}</div>}
          </div>
          <div>
            <label style={S.label}>Category</label>
            <select style={S.select} value={form.category} onChange={e => set("category", e.target.value)}>
              <option value="">Select...</option>
              {CATEGORIES.map(c => <option key={c} value={c} style={{ background: "#0d0d18" }}>{c}</option>)}
            </select>
            {errors.category && <div style={S.err}>{errors.category}</div>}
          </div>
        </div>

        <hr style={S.divider} />

        {/* Audience */}
        <div style={S.row}>
          <div>
            <label style={S.label}>Country</label>
            <select style={S.select} value={form.country} onChange={e => set("country", e.target.value)}>
              <option value="">Select...</option>
              {COUNTRIES.map(c => <option key={c} value={c} style={{ background: "#0d0d18" }}>{c}</option>)}
            </select>
            {errors.country && <div style={S.err}>{errors.country}</div>}
          </div>
          <div>
            <label style={S.label}>Audience Size</label>
            <select style={S.select} value={form.audience_size} onChange={e => set("audience_size", e.target.value)}>
              <option value="">Select...</option>
              {SIZES.map(s => <option key={s} value={s} style={{ background: "#0d0d18" }}>{s}</option>)}
            </select>
            {errors.audience_size && <div style={S.err}>{errors.audience_size}</div>}
          </div>
        </div>

        {/* Content types */}
        <div style={S.field}>
          <label style={S.label}>Content Types</label>
          <div style={S.checkGrid}>
            {CONTENT.map(c => (
              <button key={c} type="button" onClick={() => toggleContent(c)} style={S.chip(contentTypes.includes(c))}>
                <span style={{ width: 14, height: 14, borderRadius: 2, border: `1px solid ${contentTypes.includes(c) ? "var(--gold)" : "var(--border-mid)"}`, background: contentTypes.includes(c) ? "var(--gold)" : "transparent", flexShrink: 0, display: "inline-block" }} />
                {c}
              </button>
            ))}
          </div>
          {errors.content_types && <div style={{ ...S.err, marginTop: "10px" }}>{errors.content_types}</div>}
        </div>

        <hr style={S.divider} />

        {/* Payout */}
        <div style={S.field}>
          <label style={S.label}>Preferred Payout Method</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" }}>
            {PAYOUTS.map(p => (
              <button key={p} type="button" onClick={() => set("payout_method", p)} style={S.chip(form.payout_method === p)}>
                {p}
              </button>
            ))}
          </div>
          {errors.payout_method && <div style={{ ...S.err, marginTop: "10px" }}>{errors.payout_method}</div>}
        </div>

        {/* Bio */}
        <div style={S.field}>
          <label style={S.label}>Short Bio <span style={{ color: "var(--dim)", fontStyle: "italic", textTransform: "none", letterSpacing: 0 }}>&mdash; optional</span></label>
          <textarea
            value={form.bio}
            onChange={e => set("bio", e.target.value)}
            placeholder="Tell us what you create and why CIPHER is the right home for it..."
            rows={4}
            style={{ ...S.input, resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        {serverErr && (
          <div style={{ background: "rgba(200,80,80,0.08)", border: "1px solid rgba(200,80,80,0.2)", borderRadius: "3px", padding: "14px 18px", color: "rgba(220,100,100,0.9)", fontSize: "13px", marginBottom: "8px" }}>
            {serverErr}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{ ...S.btn, opacity: loading ? 0.6 : 1 }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = loading ? "0.6" : "1"; }}
        >
          {loading ? "Submitting..." : "Submit Application ->"}
        </button>
      </div>
    </div>
  );
}
