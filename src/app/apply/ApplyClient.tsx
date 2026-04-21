"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Platform = "tiktok" | "instagram" | "youtube" | "twitter" | "other";
type Recommendation = "APPROVE_PRIORITY" | "APPROVE" | "WAITLIST" | "REJECT";

type ApplyPayload = {
  name: string;
  email: string;
  primaryPlatform: Platform;
  handle: string;
  secondaryPlatforms: string[];
  niche: string;
  nicheCustom: string;
  shortDescription: string;
  audienceSize: string;
  monthlyEarnings: string;
  whyJoinMuluk: string;
};

type ApiResponse = {
  success: boolean;
  recommendation: Recommendation;
  message: string;
  redirectTo: string;
  scores: {
    engagement_score: number;
    niche_score: number;
    offer_readiness_score: number;
    overall_score: number;
  };
};

function toDecision(recommendation: Recommendation): "approved" | "waitlist" | "rejected" {
  if (recommendation === "APPROVE" || recommendation === "APPROVE_PRIORITY") {
    return "approved";
  }
  if (recommendation === "WAITLIST") {
    return "waitlist";
  }
  return "rejected";
}

const PLATFORMS: Array<{ id: Platform; label: string }> = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "twitter", label: "Twitter" },
  { id: "other", label: "Other" },
];

const NICHES = [
  { id: "fitness", label: "Fitness" },
  { id: "business", label: "Business" },
  { id: "beauty", label: "Beauty" },
  { id: "coaching", label: "Coaching" },
  { id: "education", label: "Education" },
  { id: "finance", label: "Finance" },
  { id: "fashion", label: "Fashion" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "gaming", label: "Gaming" },
  { id: "other", label: "Other" },
] as const;

const AUDIENCE_OPTIONS = [
  "Under 1K",
  "1K-10K",
  "10K-50K",
  "50K-100K",
  "100K+",
];

function EmptyErrors() {
  return {} as Record<string, string>;
}

export default function ApplyClient() {
  const router = useRouter();
  const [form, setForm] = useState<ApplyPayload>({
    name: "",
    email: "",
    primaryPlatform: "tiktok",
    handle: "",
    secondaryPlatforms: [],
    niche: "fitness",
    nicheCustom: "",
    shortDescription: "",
    audienceSize: "",
    monthlyEarnings: "",
    whyJoinMuluk: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>(EmptyErrors());
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<ApiResponse | null>(null);

  const canShowCustomNiche = form.niche === "other";

  const selectedSecondaryLabel = useMemo(() => {
    if (!form.secondaryPlatforms.length) return "No secondary platforms";
    return form.secondaryPlatforms.join(" · ");
  }, [form.secondaryPlatforms]);

  function setField<K extends keyof ApplyPayload>(key: K, value: ApplyPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSecondary(platform: Platform) {
    if (platform === form.primaryPlatform) return;
    setForm((prev) => {
      const next = new Set(prev.secondaryPlatforms);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return { ...prev, secondaryPlatforms: Array.from(next) };
    });
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = EmptyErrors();

    if (!form.name.trim()) nextErrors.name = "Required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Valid email required";
    }
    if (!form.handle.trim()) nextErrors.handle = "Required";
    if (!form.shortDescription.trim()) nextErrors.shortDescription = "Required";
    if (!form.audienceSize) nextErrors.audienceSize = "Required";
    if (!form.whyJoinMuluk.trim()) nextErrors.whyJoinMuluk = "Required";
    if (form.niche === "other" && !form.nicheCustom.trim()) {
      nextErrors.nicheCustom = "Tell us your niche";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as ApiResponse & { error?: string };
      if (!response.ok) {
        setServerError(data.error ?? "Submission failed. Please try again.");
        return;
      }

      setResult(data);

      if (toDecision(data.recommendation) === "approved") {
        setTimeout(() => router.push("/dashboard/onboarding"), 1300);
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const decision = toDecision(result.recommendation);
    const stateTone =
      decision === "approved"
        ? { color: "#50d48a", accent: "You're in. Let's get your first sale." }
        : decision === "waitlist"
        ? { color: "#c8a96e", accent: "You're on the list. We'll unlock access soon." }
        : { color: "#e37f7f", accent: "Not the right fit right now. Stay close." };

    return (
      <div className="apply-page apply-result">
        <div className="apply-noise" />
        <div className="apply-shell result-shell">
          <p className="eyebrow">Creator Qualification</p>
          <h1 className="title">{stateTone.accent}</h1>
          <p className="subtitle">Your application was scored by MULUK intelligence and routed to the right access state.</p>

          <div className="score-grid">
            <ScoreTile label="Engagement" value={result.scores.engagement_score} />
            <ScoreTile label="Niche" value={result.scores.niche_score} />
            <ScoreTile label="Offer Readiness" value={result.scores.offer_readiness_score} />
            <ScoreTile label="Overall" value={result.scores.overall_score} highlight />
          </div>

          <div className="result-cta-row">
            {decision === "approved" ? (
              <button className="btn-primary" onClick={() => router.push("/dashboard/onboarding")}>Continue To Onboarding</button>
            ) : (
              <button className="btn-primary" onClick={() => router.push("/")}>Back To Home</button>
            )}
            <button className="btn-ghost" onClick={() => setResult(null)}>Edit Application</button>
          </div>

          <p className="result-note" style={{ color: stateTone.color }}>
            Recommendation: {result.recommendation}
          </p>
        </div>
        <ApplyStyles />
      </div>
    );
  }

  return (
    <div className="apply-page">
      <div className="apply-noise" />
      <div className="apply-shell">
        <div className="apply-head">
          <Link href="/" className="brand">MULUK</Link>
          <p className="eyebrow">Creator Application</p>
          <h1 className="title">A monetization layer for creators across all platforms.</h1>
          <p className="subtitle">Apply for gated access. We filter hard, activate fast, and optimize for first-money momentum.</p>
        </div>

        <form className="apply-form" onSubmit={onSubmit}>
          <Field label="Name" error={errors.name}>
            <input value={form.name} onChange={(e) => setField("name", e.target.value)} className="input" placeholder="Full name" />
          </Field>

          <Field label="Email" error={errors.email}>
            <input value={form.email} onChange={(e) => setField("email", e.target.value)} className="input" placeholder="you@domain.com" type="email" />
          </Field>

          <Field label="Primary Platform">
            <div className="chip-row">
              {PLATFORMS.map((platform) => (
                <button
                  type="button"
                  key={platform.id}
                  className={`chip ${form.primaryPlatform === platform.id ? "active" : ""}`}
                  onClick={() => {
                    setField("primaryPlatform", platform.id);
                    setForm((prev) => ({
                      ...prev,
                      secondaryPlatforms: prev.secondaryPlatforms.filter((item) => item !== platform.id),
                    }));
                  }}
                >
                  {platform.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Username / Handle" error={errors.handle}>
            <input value={form.handle} onChange={(e) => setField("handle", e.target.value)} className="input" placeholder="@yourhandle" />
          </Field>

          <Field label="Secondary Platforms (Optional)">
            <div className="chip-row">
              {PLATFORMS.map((platform) => (
                <button
                  type="button"
                  key={`secondary-${platform.id}`}
                  disabled={platform.id === form.primaryPlatform}
                  className={`chip ${form.secondaryPlatforms.includes(platform.id) ? "active" : ""}`}
                  onClick={() => toggleSecondary(platform.id)}
                >
                  {platform.label}
                </button>
              ))}
            </div>
            <p className="field-hint">{selectedSecondaryLabel}</p>
          </Field>

          <Field label="Niche" error={errors.nicheCustom}>
            <select value={form.niche} onChange={(e) => setField("niche", e.target.value)} className="input">
              {NICHES.map((niche) => (
                <option key={niche.id} value={niche.id}>{niche.label}</option>
              ))}
            </select>
          </Field>

          {canShowCustomNiche ? (
            <Field label="Custom Niche" error={errors.nicheCustom}>
              <input value={form.nicheCustom} onChange={(e) => setField("nicheCustom", e.target.value)} className="input" placeholder="Your specific niche" />
            </Field>
          ) : null}

          <Field label="What do you sell or plan to sell?" error={errors.shortDescription}>
            <textarea value={form.shortDescription} onChange={(e) => setField("shortDescription", e.target.value)} className="input textarea" placeholder="Describe your offer and audience outcome." />
          </Field>

          <Field label="Audience Size" error={errors.audienceSize}>
            <select value={form.audienceSize} onChange={(e) => setField("audienceSize", e.target.value)} className="input">
              <option value="">Select range</option>
              {AUDIENCE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>

          <Field label="Monthly Earnings (Optional)">
            <input value={form.monthlyEarnings} onChange={(e) => setField("monthlyEarnings", e.target.value)} className="input" placeholder="$0, $1K, $10K+" />
          </Field>

          <Field label="Why do you want to join MULUK?" error={errors.whyJoinMuluk}>
            <textarea value={form.whyJoinMuluk} onChange={(e) => setField("whyJoinMuluk", e.target.value)} className="input textarea" placeholder="Show intent, urgency, and what you plan to launch first." />
          </Field>

          {serverError ? <p className="server-error">{serverError}</p> : null}

          <div className="cta-row">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Scoring Application..." : "Submit For Qualification"}
            </button>
            <p className="small-note">Decisioning: Approved (80-100), Waitlist (50-79), Reject (0-49)</p>
          </div>
        </form>
      </div>
      <ApplyStyles />
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

function ScoreTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`score-tile ${highlight ? "highlight" : ""}`}>
      <p className="score-label">{label}</p>
      <p className="score-value">{value}</p>
    </div>
  );
}

function ApplyStyles() {
  return (
    <style jsx>{`
      .apply-page {
        min-height: 100vh;
        position: relative;
        background:
          radial-gradient(1100px 580px at 90% -160px, rgba(200, 169, 110, 0.1), transparent 58%),
          radial-gradient(900px 500px at -8% 100%, rgba(200, 169, 110, 0.06), transparent 62%),
          #020203;
        color: rgba(255, 255, 255, 0.92);
        overflow: hidden;
      }

      .apply-noise {
        position: fixed;
        inset: 0;
        pointer-events: none;
        opacity: 0.2;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
      }

      .apply-shell {
        position: relative;
        z-index: 2;
        max-width: 880px;
        margin: 0 auto;
        padding: 58px 24px 100px;
      }

      .brand {
        text-decoration: none;
        color: #c8a96e;
        font-family: var(--font-mono, 'DM Mono', monospace);
        font-size: 15px;
        letter-spacing: 0.24em;
      }

      .apply-head {
        margin-bottom: 28px;
      }

      .eyebrow {
        margin: 18px 0 0;
        font-family: var(--font-mono, 'DM Mono', monospace);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.25em;
        color: rgba(200, 169, 110, 0.7);
      }

      .title {
        margin: 12px 0 0;
        font-family: var(--font-display, 'Cormorant Garamond', serif);
        font-size: clamp(36px, 6vw, 58px);
        line-height: 0.96;
        letter-spacing: -0.02em;
        font-weight: 300;
      }

      .subtitle {
        margin: 14px 0 0;
        font-family: var(--font-body, 'Outfit', sans-serif);
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
        max-width: 680px;
        line-height: 1.7;
      }

      .apply-form {
        margin-top: 30px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background: rgba(13, 13, 24, 0.88);
        border-radius: 14px;
        padding: 22px;
      }

      .field {
        display: block;
        margin-bottom: 16px;
      }

      .field-label {
        display: block;
        margin-bottom: 8px;
        font-family: var(--font-mono, 'DM Mono', monospace);
        font-size: 10px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: rgba(200, 169, 110, 0.78);
      }

      .field-error {
        display: block;
        margin-top: 6px;
        font-size: 12px;
        color: #e37f7f;
        font-family: var(--font-body, 'Outfit', sans-serif);
      }

      .field-hint {
        margin: 6px 0 0;
        color: rgba(255, 255, 255, 0.42);
        font-size: 12px;
        font-family: var(--font-body, 'Outfit', sans-serif);
      }

      .input {
        width: 100%;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.13);
        background: rgba(255, 255, 255, 0.03);
        color: rgba(255, 255, 255, 0.92);
        padding: 12px 12px;
        font-family: var(--font-body, 'Outfit', sans-serif);
        font-size: 14px;
        outline: none;
      }

      .input:focus {
        border-color: rgba(200, 169, 110, 0.45);
        box-shadow: 0 0 0 3px rgba(200, 169, 110, 0.1);
      }

      .textarea {
        min-height: 100px;
        resize: vertical;
      }

      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .chip {
        border: 1px solid rgba(255, 255, 255, 0.13);
        border-radius: 999px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.02);
        color: rgba(255, 255, 255, 0.62);
        font-family: var(--font-mono, 'DM Mono', monospace);
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
      }

      .chip.active {
        border-color: rgba(200, 169, 110, 0.4);
        background: rgba(200, 169, 110, 0.12);
        color: #c8a96e;
      }

      .chip:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .server-error {
        margin: 0 0 10px;
        color: #e37f7f;
        font-size: 13px;
      }

      .cta-row {
        margin-top: 18px;
      }

      .btn-primary,
      .btn-ghost {
        border-radius: 3px;
        padding: 13px 20px;
        font-family: var(--font-mono, 'DM Mono', monospace);
        font-size: 10px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        cursor: pointer;
      }

      .btn-primary {
        border: 0;
        background: #c8a96e;
        color: #0c0800;
      }

      .btn-primary:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .btn-ghost {
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: transparent;
        color: rgba(255, 255, 255, 0.62);
      }

      .small-note {
        margin: 10px 0 0;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.38);
      }

      .apply-result .title {
        max-width: 820px;
      }

      .result-shell {
        text-align: center;
        max-width: 760px;
      }

      .score-grid {
        margin-top: 28px;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }

      .score-tile {
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.02);
        padding: 12px;
      }

      .score-tile.highlight {
        border-color: rgba(200, 169, 110, 0.4);
        background: rgba(200, 169, 110, 0.1);
      }

      .score-label {
        margin: 0;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.52);
        font-family: var(--font-mono, 'DM Mono', monospace);
      }

      .score-value {
        margin: 6px 0 0;
        font-size: 26px;
        line-height: 1;
        color: #c8a96e;
        font-family: var(--font-display, 'Cormorant Garamond', serif);
      }

      .result-cta-row {
        margin-top: 24px;
        display: flex;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .result-note {
        margin-top: 12px;
        font-size: 12px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-family: var(--font-mono, 'DM Mono', monospace);
      }

      @media (max-width: 780px) {
        .apply-shell {
          padding: 42px 16px 90px;
        }

        .apply-form {
          padding: 16px;
        }

        .score-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `}</style>
  );
}
