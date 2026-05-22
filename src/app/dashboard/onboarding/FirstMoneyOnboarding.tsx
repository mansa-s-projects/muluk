"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type OfferType = "digital_file" | "coaching" | "custom_content" | "subscription";

type CreatedLink = {
  id: string;
  slug: string;
};

const OFFER_TYPES: Array<{ id: OfferType; label: string; detail: string }> = [
  { id: "digital_file", label: "Digital File", detail: "Templates, guides, assets" },
  { id: "coaching", label: "Coaching", detail: "Calls, strategy, implementation" },
  { id: "custom_content", label: "Custom Content", detail: "Personalized creator work" },
  { id: "subscription", label: "Subscription", detail: "Recurring membership access" },
];

export default function FirstMoneyOnboarding({
  defaultTitle,
}: {
  defaultTitle: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [offerType, setOfferType] = useState<OfferType>("digital_file");
  const [title, setTitle] = useState(defaultTitle || "Exclusive Creator Drop");
  const [description, setDescription] = useState("");
  const [contentValue, setContentValue] = useState("");
  const [price, setPrice] = useState("49");
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null);
  const [error, setError] = useState("");

  const progress = `${step + 1}/5`;
  const fullLink = useMemo(() => {
    if (!createdLink?.slug || typeof window === "undefined") return "";
    return `${window.location.origin}/pay/${createdLink.slug}`;
  }, [createdLink]);

  async function createFirstLink() {
    setCreating(true);
    setError("");

    try {
      if (!title.trim()) {
        setError("Title is required.");
        return;
      }

      const parsed = Number(price);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError("Set a valid price.");
        return;
      }

      const response = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || offerTypeLabel(offerType),
          price: Math.round(parsed * 100),
          content_type: "text",
          content_value: contentValue || description || "Exclusive access",
        }),
      });

      const data = (await response.json()) as { id?: string; slug?: string; error?: string };
      if (!response.ok || !data.id || !data.slug) {
        setError(data.error ?? "Failed to generate payment link.");
        return;
      }

      setCreatedLink({ id: data.id, slug: data.slug });

      await fetch("/api/onboarding/first-money-complete", { method: "POST" });
      setStep(4);
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fm-shell">
      <div className="fm-head">
        <p className="fm-eyebrow">White-Glove Onboarding</p>
        <h1 className="fm-title">First Money Moment</h1>
        <p className="fm-sub">{progress} • Build and launch your first offer now.</p>
      </div>

      {step === 0 ? (
        <section className="fm-card">
          <h2>1. What are you selling?</h2>
          <div className="fm-grid">
            {OFFER_TYPES.map((type) => (
              <button
                type="button"
                key={type.id}
                onClick={() => setOfferType(type.id)}
                className={`fm-option ${offerType === type.id ? "active" : ""}`}
              >
                <span>{type.label}</span>
                <small>{type.detail}</small>
              </button>
            ))}
          </div>
          <div className="fm-actions">
            <button className="btn-primary" onClick={() => setStep(1)}>Continue</button>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="fm-card">
          <h2>2. Upload content or paste link</h2>
          <label className="fm-label">Offer title</label>
          <input className="fm-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="fm-label">Offer description</label>
          <textarea className="fm-input fm-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What fans get, in one clear sentence." />
          <label className="fm-label">Content or access link</label>
          <textarea className="fm-input fm-textarea" value={contentValue} onChange={(e) => setContentValue(e.target.value)} placeholder="Paste access link or describe what unlocks after purchase." />
          <div className="fm-actions">
            <button className="btn-ghost" onClick={() => setStep(0)}>Back</button>
            <button className="btn-primary" onClick={() => setStep(2)}>Continue</button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="fm-card">
          <h2>3. Set your price</h2>
          <label className="fm-label">Price in USD</label>
          <input className="fm-input" value={price} type="number" min="1" step="1" onChange={(e) => setPrice(e.target.value)} />
          <p className="fm-tip">Start simple and launch. You can optimize pricing after first traction.</p>
          <div className="fm-actions">
            <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" onClick={() => setStep(3)}>Continue</button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="fm-card">
          <h2>4. Generate your first payment link</h2>
          <div className="fm-summary">
            <p><strong>Offer:</strong> {title}</p>
            <p><strong>Type:</strong> {offerTypeLabel(offerType)}</p>
            <p><strong>Price:</strong> ${price}</p>
          </div>
          {error ? <p className="fm-error">{error}</p> : null}
          <div className="fm-actions">
            <button className="btn-ghost" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" onClick={createFirstLink} disabled={creating}>
              {creating ? "Generating..." : "Generate Payment Link"}
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="fm-card">
          <h2>5. Send this link to your first fan now</h2>
          <p className="fm-tip">This is your activation move. Send it in DM, bio, or private channel immediately.</p>
          {fullLink ? <div className="fm-link">{fullLink}</div> : null}
          <div className="fm-actions">
            <button
              className="btn-primary"
              onClick={() => {
                if (fullLink) navigator.clipboard.writeText(fullLink);
              }}
            >
              Copy Link
            </button>
            <button className="btn-ghost" onClick={() => router.push("/dashboard")}>Go To Dashboard</button>
          </div>
        </section>
      ) : null}

      <style jsx>{`
        .fm-shell {
          max-width: 860px;
          margin: 0 auto;
          padding: 44px 20px 80px;
          color: rgba(255, 255, 255, 0.92);
        }

        .fm-head {
          margin-bottom: 24px;
        }

        .fm-eyebrow {
          margin: 0;
          color: rgba(200, 169, 110, 0.7);
          letter-spacing: 0.24em;
          text-transform: uppercase;
          font-size: 10px;
          font-family: var(--font-mono, 'DM Mono', monospace);
        }

        .fm-title {
          margin: 8px 0 0;
          font-family: var(--font-display, 'Cormorant Garamond', serif);
          font-size: clamp(36px, 6vw, 58px);
          line-height: 0.96;
          font-weight: 300;
          letter-spacing: -0.02em;
          color: #c8a96e;
        }

        .fm-sub {
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
        }

        .fm-card {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 15, 30, 0.85);
          border-radius: 12px;
          padding: 20px;
        }

        .fm-card h2 {
          margin: 0 0 14px;
          font-size: 24px;
          font-family: var(--font-display, 'Cormorant Garamond', serif);
          color: rgba(255, 255, 255, 0.94);
          font-weight: 400;
        }

        .fm-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .fm-option {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 14px;
          text-align: left;
          color: rgba(255, 255, 255, 0.74);
          display: flex;
          flex-direction: column;
          gap: 6px;
          cursor: pointer;
        }

        .fm-option span {
          font-family: var(--font-body, 'Outfit', sans-serif);
          font-size: 14px;
          font-weight: 500;
        }

        .fm-option small {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.44);
        }

        .fm-option.active {
          border-color: rgba(200, 169, 110, 0.4);
          background: rgba(200, 169, 110, 0.12);
          color: #c8a96e;
        }

        .fm-label {
          display: block;
          margin: 12px 0 6px;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(200, 169, 110, 0.72);
          font-family: var(--font-mono, 'DM Mono', monospace);
        }

        .fm-input {
          width: 100%;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.92);
          padding: 11px 12px;
          font-size: 14px;
          outline: none;
        }

        .fm-textarea {
          min-height: 86px;
          resize: vertical;
        }

        .fm-actions {
          margin-top: 16px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-primary,
        .btn-ghost {
          border-radius: 3px;
          padding: 11px 16px;
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .btn-primary {
          border: 0;
          background: #c8a96e;
          color: #0b0700;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-ghost {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: transparent;
          color: rgba(255, 255, 255, 0.62);
        }

        .fm-tip {
          color: rgba(255, 255, 255, 0.48);
          font-size: 13px;
          line-height: 1.6;
          margin: 10px 0 0;
        }

        .fm-summary {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.02);
        }

        .fm-summary p {
          margin: 5px 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.72);
        }

        .fm-link {
          margin-top: 10px;
          border: 1px solid rgba(200, 169, 110, 0.3);
          background: rgba(200, 169, 110, 0.1);
          border-radius: 8px;
          padding: 12px;
          color: #c8a96e;
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 12px;
          word-break: break-all;
        }

        .fm-error {
          margin-top: 10px;
          color: #e37f7f;
          font-size: 13px;
        }

        @media (max-width: 760px) {
          .fm-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function offerTypeLabel(value: OfferType): string {
  const item = OFFER_TYPES.find((entry) => entry.id === value);
  return item?.label ?? "Offer";
}
