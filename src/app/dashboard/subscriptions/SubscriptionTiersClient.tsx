"use client";

import { useState } from "react";

type Tier = {
  id: string;
  title: string;
  price_label: string | null;
  description: string | null;
  whop_link: string | null;
  status: string;
};

type Props = { userId: string; initialTiers: Tier[] };

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;
const G    = "#c8a96e";

function formatCents(label: string | null) {
  if (!label) return "—";
  return label;
}

export default function SubscriptionTiersClient({ initialTiers }: Props) {
  const [tiers, setTiers]     = useState<Tier[]>(initialTiers);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: "",
    priceLabel: "",       // e.g. "$15/month"
    description: "",
    whopLink: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.title.trim())      { setError("Title required"); return; }
    if (!form.priceLabel.trim()) { setError("Price required (e.g. $15/month)"); return; }
    if (!form.whopLink.trim())   { setError("Whop subscription link required"); return; }
    if (!form.whopLink.startsWith("https://")) { setError("Whop link must start with https://"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/offers/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       form.title.trim(),
          description: form.description.trim() || null,
          price_label: form.priceLabel.trim(),
          whop_link:   form.whopLink.trim(),
          status:      "published",
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create tier"); return; }

      setTiers((prev) => [json.offer as Tier, ...prev]);
      setForm({ title: "", priceLabel: "", description: "", whopLink: "" });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error — please retry");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (tier: Tier) => {
    const next = tier.status === "published" ? "draft" : "published";
    const res = await fetch("/api/offers/manage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tier.id, status: next }),
    });
    if (res.ok) {
      setTiers((prev) => prev.map((t) => t.id === tier.id ? { ...t, status: next } : t));
    }
  };

  const card: React.CSSProperties = {
    background: "#111",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "10px",
    padding: "24px",
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "#0a0a0a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const label: React.CSSProperties = {
    ...mono,
    fontSize: "9px",
    letterSpacing: "0.18em",
    color: "rgba(255,255,255,0.3)",
    marginBottom: "6px",
    display: "block",
    textTransform: "uppercase",
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ ...mono, fontSize: "11px", letterSpacing: "0.22em", color: G, margin: "0 0 4px" }}>SUBSCRIPTION TIERS</h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", margin: 0 }}>
          Create monthly subscription offers. Fans subscribe once and get access forever — until they cancel.
        </p>
      </div>

      {/* ── Create form ─────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: "32px" }}>
        <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", marginBottom: "20px" }}>
          NEW TIER
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <span style={label}>Tier Name</span>
              <input
                style={input}
                placeholder="e.g. Inner Circle"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <span style={label}>Price Label</span>
              <input
                style={input}
                placeholder="e.g. $15/month"
                value={form.priceLabel}
                onChange={(e) => setForm((f) => ({ ...f, priceLabel: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <span style={label}>What they get (description)</span>
            <textarea
              style={{ ...input, height: "72px", resize: "vertical" }}
              placeholder="DM access, early vault drops, exclusive posts…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <span style={label}>Whop Subscription Link</span>
            <input
              style={input}
              placeholder="https://whop.com/checkout/..."
              value={form.whopLink}
              onChange={(e) => setForm((f) => ({ ...f, whopLink: e.target.value }))}
            />
            <div style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)", marginTop: "6px" }}>
              Create a recurring membership product in your Whop dashboard, then paste the checkout link here.
            </div>
          </div>

          {error && (
            <div style={{ ...mono, fontSize: "11px", color: "#e88888", marginBottom: "14px" }}>{error}</div>
          )}
          {success && (
            <div style={{ ...mono, fontSize: "11px", color: "#4cc88c", marginBottom: "14px" }}>Tier created and live.</div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              ...mono,
              fontSize: "10px",
              letterSpacing: "0.18em",
              padding: "12px 28px",
              background: saving ? "rgba(200,169,110,0.15)" : G,
              color: saving ? "rgba(200,169,110,0.4)" : "#0a0800",
              border: "none",
              borderRadius: "6px",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {saving ? "SAVING…" : "CREATE TIER"}
          </button>
        </form>
      </div>

      {/* ── Existing tiers ──────────────────────────────────────────── */}
      {tiers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>
          No subscription tiers yet. Create one above.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {tiers.map((tier) => (
            <div
              key={tier.id}
              style={{
                ...card,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                opacity: tier.status === "draft" ? 0.5 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px", color: "#fff", fontWeight: 500 }}>{tier.title}</span>
                  <span style={{ ...mono, fontSize: "9px", color: G }}>{formatCents(tier.price_label)}</span>
                  <span style={{
                    ...mono,
                    fontSize: "8px",
                    letterSpacing: "0.12em",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    background: tier.status === "published" ? "rgba(76,200,140,0.1)" : "rgba(255,255,255,0.04)",
                    color: tier.status === "published" ? "#4cc88c" : "rgba(255,255,255,0.25)",
                    border: `1px solid ${tier.status === "published" ? "rgba(76,200,140,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                    {tier.status.toUpperCase()}
                  </span>
                </div>
                {tier.description && (
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>{tier.description}</div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                {tier.whop_link && (
                  <a
                    href={tier.whop_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...mono, fontSize: "9px", letterSpacing: "0.12em", padding: "7px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", color: "rgba(255,255,255,0.4)", textDecoration: "none" }}
                  >
                    PREVIEW
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => toggleStatus(tier)}
                  style={{ ...mono, fontSize: "9px", letterSpacing: "0.12em", padding: "7px 12px", background: "transparent", border: `1px solid ${tier.status === "published" ? "rgba(232,136,136,0.25)" : "rgba(76,200,140,0.25)"}`, borderRadius: "5px", color: tier.status === "published" ? "#e88888" : "#4cc88c", cursor: "pointer" }}
                >
                  {tier.status === "published" ? "UNPUBLISH" : "PUBLISH"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
