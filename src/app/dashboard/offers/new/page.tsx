"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ─── Styles ───────────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono, 'DM Mono', monospace)",
  fontSize: "9px",
  letterSpacing: "0.22em",
  textTransform: "uppercase" as const,
  color: "rgba(200,169,110,0.65)",
  marginBottom: "8px",
};

const inputBase: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "4px",
  color: "rgba(255,255,255,0.92)",
  padding: "13px 16px",
  fontSize: "14px",
  fontFamily: "var(--font-body, 'Outfit', sans-serif)",
  fontWeight: 300,
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color 0.2s, box-shadow 0.2s",
};

function Field({
  lbl,
  value,
  onChange,
  placeholder,
  textarea,
  errMsg,
}: {
  lbl: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  errMsg?: string;
}) {
  const [focused, setFocused] = useState(false);
  const style = focused
    ? { ...inputBase, borderColor: "rgba(200,169,110,0.45)", boxShadow: "0 0 0 3px rgba(200,169,110,0.07)" }
    : errMsg
    ? { ...inputBase, borderColor: "rgba(224,85,85,0.5)" }
    : inputBase;
  return (
    <div>
      <span style={labelStyle}>{lbl}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={4}
          style={{ ...style, resize: "vertical" as const, minHeight: "100px" }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={style}
        />
      )}
      {errMsg && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(224,85,85,0.85)", marginTop: "6px" }}>
          {errMsg}
        </div>
      )}
    </div>
  );
}

function PreviewCard({ title, description, priceLabel }: { title: string; description: string; priceLabel: string }) {
  const hasTitle = title.trim().length > 0;
  return (
    <div style={{ background: "var(--card, #111120)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.4), transparent)" }} />
      <div style={{ height: "150px", background: "linear-gradient(135deg, rgba(200,169,110,0.06), rgba(91,141,232,0.04))", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "26px", color: "rgba(200,169,110,0.25)" }}>◈</span>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', serif)", fontSize: "21px", fontWeight: 400, color: hasTitle ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.2)", marginBottom: "9px", lineHeight: 1.2, transition: "color 0.2s" }}>
          {hasTitle ? title : "Your Offer Title"}
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 300, color: description.trim() ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)", lineHeight: 1.65, marginBottom: "18px", transition: "color 0.2s" }}>
          {description.trim() || "A short description of what fans get."}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "19px", fontWeight: 500, color: priceLabel.trim() ? "var(--gold, #c8a96e)" : "rgba(200,169,110,0.3)", letterSpacing: "-0.01em", transition: "color 0.2s" }}>
            {priceLabel.trim() || "$—"}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "#0a0800", background: "var(--gold, #c8a96e)", padding: "9px 16px", borderRadius: "3px", opacity: hasTitle ? 1 : 0.35, transition: "opacity 0.2s" }}>
            Unlock →
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [whopLink, setWhopLink] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  function validate() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required";
    else if (title.trim().length > 200) errs.title = "Max 200 characters";
    if (whopLink.trim() && !/^https?:\/\/.+/.test(whopLink.trim()))
      errs.whopLink = "Must start with https://";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setGlobalError(null);

    const supabase = createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      setGlobalError("You must be signed in to create an offer.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("offers")
      .insert({
        creator_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        price_label: priceLabel.trim() || null,
        whop_link: whopLink.trim() || null,
        status: "published",
      })
      .select("id")
      .single();

    setLoading(false);

    if (error) { setGlobalError(error.message); return; }
    if (!data?.id) { setGlobalError("Offer created but no ID returned."); return; }

    router.push(`/offer/${data.id}`);
  }

  return (
    <>
      <style>{`
        @keyframes fadeUpOffer { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes breatheOffer { 0%,100% { opacity:0.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.08); } }
        .offer-new-page { animation: fadeUpOffer 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      <div className="offer-new-page" style={{ minHeight: "100vh", background: "var(--void, #020203)", position: "relative", overflowX: "hidden" }}>
        {/* Gold orb */}
        <div style={{ position: "absolute", top: "-300px", left: "50%", transform: "translateX(-50%)", width: "800px", height: "800px", borderRadius: "50%", background: "radial-gradient(circle, rgba(200,169,110,0.055) 0%, transparent 65%)", filter: "blur(100px)", pointerEvents: "none", animation: "breatheOffer 9s ease-in-out infinite" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", padding: "48px 32px 80px" }}>
          {/* Back */}
          <Link href="/dashboard/offers" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", textDecoration: "none", marginBottom: "40px" }}>
            ← Back
          </Link>

          {/* Header */}
          <div style={{ marginBottom: "44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <span style={{ display: "block", width: "24px", height: "1px", background: "rgba(200,169,110,0.5)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(200,169,110,0.6)" }}>NEW OFFER</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', serif)", fontSize: "clamp(32px, 3.5vw, 48px)", fontWeight: 300, color: "rgba(255,255,255,0.92)", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              Create an <em style={{ fontStyle: "italic", color: "var(--gold, #c8a96e)" }}>offer</em>
            </h1>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 300, color: "rgba(255,255,255,0.35)", marginTop: "10px" }}>
              Package your value. The preview updates in real-time.
            </p>
          </div>

          {/* Split layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "28px", alignItems: "start" }}>
            {/* Form panel */}
            <div style={{ background: "var(--card, #111120)", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "12px", padding: "34px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.28), transparent)" }} />

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                <Field lbl="Offer Title *" value={title} onChange={(v) => { setTitle(v); setErrors(p => ({ ...p, title: "" })); }} placeholder="e.g. 1-on-1 Strategy Session" errMsg={errors.title} />
                <Field lbl="Description" value={description} onChange={setDescription} placeholder="What do fans get? Be specific — it converts better." textarea />
                <Field lbl="Price Label" value={priceLabel} onChange={setPriceLabel} placeholder="$49 / Free / $99/mo" />
                <Field lbl="Checkout Link (Whop)" value={whopLink} onChange={(v) => { setWhopLink(v); setErrors(p => ({ ...p, whopLink: "" })); }} placeholder="https://whop.com/checkout/..." errMsg={errors.whopLink} />

                <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)" }} />

                {globalError && (
                  <div style={{ padding: "12px 16px", background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.2)", borderRadius: "4px", fontFamily: "var(--font-mono)", fontSize: "11px", color: "rgba(224,85,85,0.9)" }}>
                    {globalError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "#0a0800", background: loading ? "rgba(200,169,110,0.5)" : "var(--gold, #c8a96e)", border: "none", borderRadius: "3px", padding: "15px 28px", cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s", width: "100%" }}
                >
                  {loading ? "Launching..." : "Launch Offer →"}
                </button>
              </form>
            </div>

            {/* Preview panel */}
            <div style={{ position: "sticky", top: "24px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: "14px", textAlign: "center" }}>
                FAN PREVIEW
              </div>
              <PreviewCard title={title} description={description} priceLabel={priceLabel} />
              <p style={{ marginTop: "14px", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 300, color: "rgba(255,255,255,0.18)", textAlign: "center", lineHeight: 1.5 }}>
                This is how your offer appears to fans.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}