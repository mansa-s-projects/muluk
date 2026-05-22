"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Design tokens (inline — matches MULUK system) ───────────────────────────
const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'DM Mono', monospace)",
};
const disp: React.CSSProperties = {
  fontFamily: "var(--font-display, 'Cormorant Garamond', serif)",
};

const baseInput: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "6px",
  color: "rgba(255,255,255,0.92)",
  padding: "12px 16px",
  fontSize: "14px",
  fontFamily: "var(--font-body, 'Outfit', sans-serif)",
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color 0.15s",
};

const errInput: React.CSSProperties = {
  ...baseInput,
  borderColor: "rgba(224,85,85,0.55)",
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  ...mono,
  fontSize: "10px",
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  color: "rgba(200,169,110,0.65)",
  marginBottom: "7px",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type OfferRow = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  price_label: string | null;
  thumbnail_url: string | null;
  preview_content: string | null;
  unlock_content: string | null;
  whop_link: string | null;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

type FormState = {
  title: string;
  description: string;
  price_label: string;
  whop_link: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

type Props = {
  onSuccess?: (offer: OfferRow) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY: FormState = {
  title: "",
  description: "",
  price_label: "",
  whop_link: "",
};

const URL_RE = /^https?:\/\/.+/;

// ─── Component ────────────────────────────────────────────────────────────────

export default function OfferForm({ onSuccess }: Props) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Generic field updater — clears its field error on change
  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: undefined }));
    if (globalError) setGlobalError(null);
  }

  // ── Client-side validation ──────────────────────────────────────────────────
  function validate(): boolean {
    const errs: FieldErrors = {};

    const title = form.title.trim();
    if (!title) {
      errs.title = "Title is required";
    } else if (title.length > 200) {
      errs.title = "Title must be 200 characters or fewer";
    }

    if (form.whop_link.trim() && !URL_RE.test(form.whop_link.trim())) {
      errs.whop_link = "Must be a valid https:// URL";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Supabase insert ──────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setGlobalError(null);

    const supabase = createClient();

    // 1. Confirm the session is active and grab the authenticated user
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      setGlobalError("You must be signed in to create an offer.");
      setSubmitting(false);
      return;
    }

    // 2. Insert into offers — creator_id is set to the authenticated user's id.
    //    RLS policy "creators_manage_own_offers" ensures no other user can read
    //    or mutate this row server-side even if creator_id were tampered with.
    const { data: insertedOffer, error: insertErr } = await supabase
      .from("offers")
      .insert({
        creator_id:  user.id,
        title:       form.title.trim(),
        description: form.description.trim() || null,
        price_label: form.price_label.trim() || null,
        whop_link:   form.whop_link.trim()   || null,
        status:      "draft",
      })
      .select(
        "id, creator_id, title, description, price_label, thumbnail_url, " +
        "preview_content, unlock_content, whop_link, status, created_at, updated_at"
      )
      .single();

    setSubmitting(false);

    if (insertErr) {
      // Surface the Postgres constraint message when relevant, otherwise generic
      const msg =
        insertErr.message.includes("check")
          ? "One of the values you entered is invalid. Please review and try again."
          : insertErr.message;
      setGlobalError(msg);
      return;
    }

    const offer = insertedOffer as unknown as OfferRow;

    setSuccess(true);
    setForm(EMPTY);

    if (onSuccess) {
      onSuccess(offer);
    } else {
      // Default: navigate to the new offer's edit page
      router.push(`/dashboard/offers/${offer.id}`);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        background: "#0f0f1e",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "14px",
        padding: "32px",
        maxWidth: "560px",
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.25em", color: "rgba(200,169,110,0.5)", marginBottom: "8px" }}>
          NEW OFFER
        </div>
        <h2 style={{ ...disp, fontSize: "26px", fontWeight: 300, color: "rgba(255,255,255,0.92)", margin: 0, lineHeight: 1.2 }}>
          Create an offer
        </h2>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "6px", fontFamily: "var(--font-body, 'Outfit', sans-serif)" }}>
          Draft saved automatically. Publish when you&apos;re ready.
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Title */}
        <div>
          <label style={fieldLabel} htmlFor="offer-title">Title *</label>
          <input
            id="offer-title"
            type="text"
            autoComplete="off"
            maxLength={200}
            placeholder="e.g. Exclusive Trading Signals"
            value={form.title}
            onChange={e => field("title", e.target.value)}
            style={fieldErrors.title ? errInput : baseInput}
          />
          {fieldErrors.title
            ? <FieldError msg={fieldErrors.title} />
            : <CharCount value={form.title} max={200} />}
        </div>

        {/* Description */}
        <div>
          <label style={fieldLabel} htmlFor="offer-desc">Description</label>
          <textarea
            id="offer-desc"
            rows={4}
            maxLength={2000}
            placeholder="What do fans get? Be specific — this is your sales copy."
            value={form.description}
            onChange={e => field("description", e.target.value)}
            style={{ ...baseInput, resize: "vertical", minHeight: "96px" }}
          />
          <CharCount value={form.description} max={2000} />
        </div>

        {/* Price label + Whop link */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div>
            <label style={fieldLabel} htmlFor="offer-price">Price</label>
            <input
              id="offer-price"
              type="text"
              maxLength={50}
              placeholder="$29/mo"
              value={form.price_label}
              onChange={e => field("price_label", e.target.value)}
              style={baseInput}
            />
          </div>
          <div>
            <label style={fieldLabel} htmlFor="offer-whop">Whop Link</label>
            <input
              id="offer-whop"
              type="url"
              placeholder="https://whop.com/..."
              value={form.whop_link}
              onChange={e => field("whop_link", e.target.value)}
              style={fieldErrors.whop_link ? errInput : baseInput}
            />
            {fieldErrors.whop_link && <FieldError msg={fieldErrors.whop_link} />}
          </div>
        </div>

        {/* Global error */}
        {globalError && (
          <div style={{
            padding: "12px 16px",
            background: "rgba(224,85,85,0.08)",
            border: "1px solid rgba(224,85,85,0.3)",
            borderRadius: "6px",
            ...mono,
            fontSize: "11px",
            color: "#e05555",
            letterSpacing: "0.06em",
          }}>
            {globalError}
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div style={{
            padding: "12px 16px",
            background: "rgba(80,212,138,0.07)",
            border: "1px solid rgba(80,212,138,0.25)",
            borderRadius: "6px",
            ...mono,
            fontSize: "11px",
            color: "#50d48a",
            letterSpacing: "0.06em",
          }}>
            ✓ Offer created — redirecting…
          </div>
        )}

        {/* Submit */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingTop: "4px" }}>
          <button
            type="submit"
            disabled={submitting || success}
            style={{
              padding: "13px 28px",
              background: submitting || success
                ? "rgba(200,169,110,0.35)"
                : "var(--gold, #c8a96e)",
              border: "none",
              borderRadius: "6px",
              color: "#0a0800",
              ...mono,
              fontSize: "11px",
              letterSpacing: "0.18em",
              fontWeight: 600,
              cursor: submitting || success ? "not-allowed" : "pointer",
              transition: "background 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {submitting && <Spinner />}
            {submitting ? "SAVING…" : "CREATE OFFER"}
          </button>
          <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
            Saved as draft
          </div>
        </div>
      </form>
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10px", color: "#e05555", marginTop: "4px", letterSpacing: "0.08em" }}>
      {msg}
    </div>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const pct = value.length / max;
  return (
    <div style={{
      fontFamily: "var(--font-mono, monospace)",
      fontSize: "10px",
      color: pct > 0.9 ? "#e8a830" : "rgba(255,255,255,0.2)",
      marginTop: "4px",
      textAlign: "right",
    }}>
      {value.length}/{max}
    </div>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{
        display: "inline-block",
        width: "11px",
        height: "11px",
        border: "1.5px solid rgba(10,8,0,0.3)",
        borderTopColor: "#0a0800",
        borderRadius: "50%",
        animation: "_spin 0.65s linear infinite",
        flexShrink: 0,
      }} />
    </>
  );
}
