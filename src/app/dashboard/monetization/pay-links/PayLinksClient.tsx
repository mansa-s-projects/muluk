"use client";

import { useState } from "react";

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;

interface PayLink {
  id: string;
  title: string;
  description: string | null;
  price: number;
  content_type: string;
  is_active: boolean;
  is_live: boolean | null;
  view_count: number | null;
  purchase_count: number | null;
  slug: string | null;
  whop_checkout_url: string | null;
  created_at: string;
}

interface Props {
  initialLinks: PayLink[];
}

const EMPTY_FORM = { title: "", description: "", price: "", content_type: "text" as "text" | "file", content_value: "", file_url: "" };

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PayLinksClient({ initialLinks }: Props) {
  const [links, setLinks] = useState<PayLink[]>(initialLinks);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [reprovisioning, setReprovisioning] = useState<string | null>(null);
  const [reprovisionError, setReprovisionError] = useState<Record<string, string>>({});

  async function createLink() {
    if (!form.title.trim()) { setError("Title is required"); return; }
    const priceNum = Math.round(parseFloat(form.price) * 100);
    if (isNaN(priceNum) || priceNum < 50) { setError("Minimum price is $0.50"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          price: priceNum,
          content_type: form.content_type,
          content_value: form.content_type === "text" ? form.content_value : undefined,
          file_url: form.content_type === "file" ? form.file_url : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create"); return; }
      // Refresh list
      const listRes = await fetch("/api/payment-links");
      if (listRes.ok) {
        const listJson = await listRes.json();
        setLinks(listJson.items ?? []);
      }
      setForm(EMPTY_FORM);
      setCreating(false);
    } finally {
      setSaving(false);
    }
  }

  async function reprovision(link: PayLink) {
    setReprovisioning(link.id);
    setReprovisionError((prev) => ({ ...prev, [link.id]: "" }));
    try {
      const res = await fetch(`/api/payment-links/${link.id}/reprovision`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setReprovisionError((prev) => ({ ...prev, [link.id]: json.error ?? "Provisioning failed" }));
        return;
      }
      // Refresh list
      const listRes = await fetch("/api/payment-links");
      if (listRes.ok) {
        const listJson = await listRes.json();
        setLinks(listJson.items ?? []);
      }
    } finally {
      setReprovisioning(null);
    }
  }

  function copyLink(link: PayLink) {
    const url = link.whop_checkout_url ?? (link.slug ? `${window.location.origin}/pay/${link.slug}` : null);
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(link.id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const totalRevenue = links.reduce((s, l) => s + (l.purchase_count ?? 0) * l.price, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--void, #08080f)", padding: "2rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ ...mono, fontSize: "1.5rem", fontWeight: 500, color: "#fff", margin: 0, letterSpacing: "0.05em" }}>Pay Links</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "4px" }}>{links.length} link{links.length !== 1 ? "s" : ""} · {formatCents(totalRevenue)} total revenue</p>
          </div>
          <button
            onClick={() => { setCreating(true); setError(null); }}
            style={{ ...mono, fontSize: "12px", letterSpacing: "0.08em", padding: "10px 18px", background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.3)", color: "#c8a96e", borderRadius: "6px", cursor: "pointer" }}
          >
            + New Pay Link
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div style={{ marginBottom: "2rem", padding: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "10px" }}>
            <div style={{ ...mono, fontSize: "11px", color: "rgba(200,169,110,0.6)", letterSpacing: "0.12em", marginBottom: "16px" }}>NEW PAY LINK</div>
            {error && <div style={{ marginBottom: "12px", padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", fontSize: "12px", color: "#f87171" }}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>TITLE *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. 1-on-1 Coaching Call" style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>PRICE (USD) *</label>
                <input type="number" min="0.50" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="9.99" style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>DESCRIPTION</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does the buyer get?" style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>CONTENT TYPE</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["text", "file"] as const).map((t) => (
                  <button key={t} onClick={() => setForm((f) => ({ ...f, content_type: t }))} style={{ ...mono, fontSize: "11px", padding: "6px 14px", background: form.content_type === t ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${form.content_type === t ? "rgba(200,169,110,0.4)" : "rgba(255,255,255,0.1)"}`, color: form.content_type === t ? "#c8a96e" : "rgba(255,255,255,0.4)", borderRadius: "5px", cursor: "pointer" }}>{t.toUpperCase()}</button>
                ))}
              </div>
            </div>
            {form.content_type === "text" ? (
              <div style={{ marginBottom: "12px" }}>
                <label style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>CONTENT *</label>
                <textarea value={form.content_value} onChange={(e) => setForm((f) => ({ ...f, content_value: e.target.value }))} placeholder="The content delivered after purchase…" rows={3} style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
              </div>
            ) : (
              <div style={{ marginBottom: "12px" }}>
                <label style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>FILE URL *</label>
                <input value={form.file_url} onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))} placeholder="https://…" style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={createLink} disabled={saving} style={{ ...mono, fontSize: "12px", letterSpacing: "0.08em", padding: "10px 20px", background: "rgba(200,169,110,0.15)", border: "1px solid rgba(200,169,110,0.35)", color: "#c8a96e", borderRadius: "6px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Creating…" : "Create Link"}</button>
              <button onClick={() => { setCreating(false); setError(null); }} style={{ ...mono, fontSize: "12px", padding: "10px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Links list */}
        {links.length === 0 && !creating ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "14px" }}>
            <div style={{ ...mono, fontSize: "28px", marginBottom: "12px" }}>◪</div>
            <p>No pay links yet.</p>
            <p style={{ fontSize: "12px", marginTop: "8px" }}>Create a link to start selling content directly to fans.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {links.map((link) => (
              <div key={link.id} style={{ padding: "16px 20px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "14px", color: "#fff", fontWeight: 500 }}>{link.title}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: link.is_live ? "#4ade80" : link.is_active ? "#facc15" : "#666", display: "inline-block" }} />
                        <span style={{ ...mono, fontSize: "9px", color: link.is_live ? "#4ade80" : link.is_active ? "#facc15" : "rgba(255,255,255,0.3)" }}>{link.is_live ? "LIVE" : link.is_active ? "ACTIVE" : "DRAFT"}</span>
                      </span>
                    </div>
                    {link.description && <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>{link.description}</p>}
                    <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                      <span style={{ ...mono, fontSize: "12px", color: "#c8a96e" }}>{formatCents(link.price)}</span>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>{link.view_count ?? 0} views</span>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>{link.purchase_count ?? 0} sales</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    {!link.whop_checkout_url && (
                      <button
                        onClick={() => reprovision(link)}
                        disabled={reprovisioning === link.id}
                        title="Auto-create Whop product & checkout URL"
                        style={{ ...mono, fontSize: "11px", padding: "8px 14px", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.25)", color: "#c8a96e", borderRadius: "6px", cursor: reprovisioning === link.id ? "not-allowed" : "pointer", letterSpacing: "0.06em", whiteSpace: "nowrap", opacity: reprovisioning === link.id ? 0.6 : 1 }}
                      >
                        {reprovisioning === link.id ? "Provisioning…" : "⚡ Connect Whop"}
                      </button>
                    )}
                    <button
                      onClick={() => copyLink(link)}
                      disabled={!link.slug && !link.whop_checkout_url}
                      style={{ ...mono, fontSize: "11px", padding: "8px 14px", background: copied === link.id ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${copied === link.id ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}`, color: copied === link.id ? "#4ade80" : "rgba(255,255,255,0.5)", borderRadius: "6px", cursor: (!link.slug && !link.whop_checkout_url) ? "not-allowed" : "pointer", letterSpacing: "0.06em", whiteSpace: "nowrap" }}
                    >
                      {copied === link.id ? "Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>
                {reprovisionError[link.id] && (
                  <div style={{ marginTop: "8px", ...mono, fontSize: "10px", color: "#f87171", letterSpacing: "0.08em" }}>
                    {reprovisionError[link.id]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
