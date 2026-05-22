"use client";

import { useState } from "react";

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

const EMPTY_FORM = {
  title: "",
  description: "",
  price: "",
  content_type: "text" as "text" | "file",
  content_value: "",
  file_url: "",
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "9px",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.35)",
  display: "block",
  marginBottom: "8px",
};

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "4px",
  color: "rgba(255,255,255,0.88)",
  fontFamily: "var(--font-body)",
  fontSize: "14px",
  fontWeight: 300,
  outline: "none",
  boxSizing: "border-box",
};

function LinkCard({
  link,
  onCopy,
  copied,
  onReprovision,
  reprovisioning,
  reprovisionError,
}: {
  link: PayLink;
  onCopy: (link: PayLink) => void;
  copied: string | null;
  onReprovision: (link: PayLink) => void;
  reprovisioning: string | null;
  reprovisionError: Record<string, string>;
}) {
  const revenue = (link.purchase_count ?? 0) * link.price;
  const status = link.is_live ? "LIVE" : link.is_active ? "ACTIVE" : "DRAFT";
  const statusColor = link.is_live ? "#4ade80" : link.is_active ? "#c8a96e" : "rgba(255,255,255,0.25)";

  return (
    <div
      style={{
        background: "var(--card, #111120)",
        border: "1px solid rgba(255,255,255,0.055)",
        borderRadius: "10px",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.18), transparent)" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h3 style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 400, color: "rgba(255,255,255,0.88)", margin: 0 }}>{link.title}</h3>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: statusColor, border: `1px solid ${statusColor}`, borderRadius: "2px", padding: "2px 7px", flexShrink: 0 }}>
              {status}
            </span>
          </div>

          {link.description && (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 300, color: "rgba(255,255,255,0.35)", margin: "0 0 14px" }}>{link.description}</p>
          )}

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {[
              { label: "price", value: formatCents(link.price), color: "var(--gold, #c8a96e)" },
              { label: "views", value: String(link.view_count ?? 0), color: "rgba(255,255,255,0.7)" },
              { label: "sales", value: String(link.purchase_count ?? 0), color: "rgba(255,255,255,0.7)" },
              { label: "revenue", value: formatCents(revenue), color: revenue > 0 ? "#4ade80" : "rgba(255,255,255,0.3)" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "17px", color, letterSpacing: "-0.01em" }}>{value}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginTop: "2px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
          {!link.whop_checkout_url && (
            <button
              onClick={() => onReprovision(link)}
              disabled={reprovisioning === link.id}
              style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", padding: "9px 16px", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.25)", color: "var(--gold, #c8a96e)", borderRadius: "3px", cursor: reprovisioning === link.id ? "not-allowed" : "pointer", opacity: reprovisioning === link.id ? 0.6 : 1, whiteSpace: "nowrap" }}
            >
              {reprovisioning === link.id ? "Connecting..." : "âš¡ Connect Whop"}
            </button>
          )}
          <button
            onClick={() => onCopy(link)}
            disabled={!link.slug && !link.whop_checkout_url}
            style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", padding: "9px 16px", background: copied === link.id ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${copied === link.id ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}`, color: copied === link.id ? "#4ade80" : "rgba(255,255,255,0.45)", borderRadius: "3px", cursor: (!link.slug && !link.whop_checkout_url) ? "not-allowed" : "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}
          >
            {copied === link.id ? "Copied âœ“" : "Copy Link"}
          </button>
        </div>
      </div>

      {reprovisionError[link.id] && (
        <div style={{ marginTop: "12px", fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(224,85,85,0.8)", letterSpacing: "0.08em" }}>
          {reprovisionError[link.id]}
        </div>
      )}
    </div>
  );
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

  const totalRevenue = links.reduce((s, l) => s + (l.purchase_count ?? 0) * l.price, 0);

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

  return (
    <>
      <style>{`
        @keyframes fadeUpPL { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes breathePL { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:0.9;transform:scale(1.1)} }
        .pl-page { animation: fadeUpPL 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      <div className="pl-page" style={{ minHeight: "100vh", background: "var(--void, #020203)", position: "relative", overflowX: "hidden" }}>
        {/* Gold orb */}
        <div style={{ position: "absolute", top: "-200px", right: "-100px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(200,169,110,0.06) 0%, transparent 65%)", filter: "blur(80px)", pointerEvents: "none", animation: "breathePL 9s ease-in-out infinite" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", padding: "48px 32px 80px" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "48px", flexWrap: "wrap", gap: "24px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <span style={{ display: "block", width: "24px", height: "1px", background: "rgba(200,169,110,0.5)" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(200,169,110,0.6)" }}>PAY LINKS</span>
              </div>
              <h1 style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', serif)", fontSize: "clamp(30px, 3vw, 44px)", fontWeight: 300, color: "rgba(255,255,255,0.92)", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                Get paid, <em style={{ fontStyle: "italic", color: "var(--gold, #c8a96e)" }}>instantly</em>
              </h1>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 300, color: "rgba(255,255,255,0.35)", marginTop: "8px" }}>
                {links.length} link{links.length !== 1 ? "s" : ""} Â· {formatCents(totalRevenue)} total revenue
              </p>
            </div>
            <button
              onClick={() => { setCreating(true); setError(null); }}
              style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "#0a0800", background: "var(--gold, #c8a96e)", border: "none", borderRadius: "3px", padding: "14px 24px", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              + New Link
            </button>
          </div>

          {/* Create panel */}
          {creating && (
            <div style={{ marginBottom: "36px", background: "var(--card, #111120)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "12px", padding: "30px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.4), transparent)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ display: "block", width: "20px", height: "1px", background: "rgba(200,169,110,0.5)" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(200,169,110,0.7)" }}>NEW PAY LINK</span>
                </div>
                <button onClick={() => { setCreating(false); setError(null); }} style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em" }}>ESC</button>
              </div>

              {error && (
                <div style={{ marginBottom: "18px", padding: "12px 14px", background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.2)", borderRadius: "4px", fontFamily: "var(--font-mono)", fontSize: "11px", color: "rgba(224,85,85,0.9)" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. 1-on-1 Coaching Call" style={inputBase} />
                </div>
                <div>
                  <label style={labelStyle}>Price (USD) *</label>
                  <input type="number" min="0.50" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="9.99" style={inputBase} />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Description</label>
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does the buyer get?" style={inputBase} />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Content Type</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["text", "file"] as const).map((t) => (
                    <button key={t} onClick={() => setForm((f) => ({ ...f, content_type: t }))} style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", padding: "8px 16px", background: form.content_type === t ? "rgba(200,169,110,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${form.content_type === t ? "rgba(200,169,110,0.35)" : "rgba(255,255,255,0.08)"}`, color: form.content_type === t ? "var(--gold, #c8a96e)" : "rgba(255,255,255,0.35)", borderRadius: "3px", cursor: "pointer" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {form.content_type === "text" ? (
                <div style={{ marginBottom: "22px" }}>
                  <label style={labelStyle}>Content *</label>
                  <textarea value={form.content_value} onChange={(e) => setForm((f) => ({ ...f, content_value: e.target.value }))} placeholder="The content delivered after purchaseâ€¦" rows={3} style={{ ...inputBase, resize: "vertical" }} />
                </div>
              ) : (
                <div style={{ marginBottom: "22px" }}>
                  <label style={labelStyle}>File URL *</label>
                  <input value={form.file_url} onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))} placeholder="https://â€¦" style={inputBase} />
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={createLink} disabled={saving} style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "#0a0800", background: saving ? "rgba(200,169,110,0.5)" : "var(--gold, #c8a96e)", border: "none", borderRadius: "3px", padding: "13px 24px", cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Creating..." : "Create Link â†’"}
                </button>
                <button onClick={() => { setCreating(false); setError(null); }} style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", padding: "13px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)", borderRadius: "3px", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Links list / empty state */}
          {links.length === 0 && !creating ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", gap: "16px" }}>
              <div style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', serif)", fontSize: "52px", color: "rgba(200,169,110,0.12)", fontWeight: 300, lineHeight: 1 }}>â—ª</div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 300, color: "rgba(255,255,255,0.35)", margin: 0 }}>No pay links yet</p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 300, color: "rgba(255,255,255,0.18)", margin: 0, textAlign: "center", maxWidth: "300px", lineHeight: 1.6 }}>
                Create your first link to start selling content directly to fans.
              </p>
              <button
                onClick={() => { setCreating(true); setError(null); }}
                style={{ marginTop: "8px", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(200,169,110,0.7)", background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "3px", padding: "12px 22px", cursor: "pointer" }}
              >
                Create first link â†’
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {links.map((link) => (
                <LinkCard key={link.id} link={link} onCopy={copyLink} copied={copied} onReprovision={reprovision} reprovisioning={reprovisioning} reprovisionError={reprovisionError} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
