"use client";

import { useState, useCallback } from "react";
import type { BrandDeal } from "@/lib/brand-deals";
import { formatDealAmount, DEAL_STATUS_LABELS, DEAL_STATUS_COLORS } from "@/lib/brand-deals";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const KANBAN_COLS: Array<{ status: BrandDeal["status"]; label: string }> = [
  { status: "pending",   label: "Pending" },
  { status: "active",    label: "Active" },
  { status: "delivered", label: "Delivered" },
  { status: "paid",      label: "Paid" },
  { status: "cancelled", label: "Cancelled" },
];

interface Props {
  initialDeals: BrandDeal[];
  monthlyEarnings: { month: number; total_cents: number }[];
}

const EMPTY_FORM = {
  brand_name: "", contact_name: "", contact_email: "",
  amount_cents: "", currency: "USD", deadline: "",
  deliverables: "", notes: "", tags: "",
};

export default function DealsClient({ initialDeals, monthlyEarnings }: Props) {
  const [deals, setDeals]           = useState<BrandDeal[]>(initialDeals);
  const [selected, setSelected]     = useState<BrandDeal | null>(null);
  const [creating, setCreating]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [loading, setLoading]       = useState(false);
  const [view, setView]             = useState<"kanban" | "list">("kanban");

  const totalPaid = deals
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + d.amount_cents, 0);

  const totalPipeline = deals
    .filter((d) => ["pending", "active", "delivered"].includes(d.status))
    .reduce((s, d) => s + d.amount_cents, 0);

  const maxMonth = Math.max(...monthlyEarnings.map((m) => m.total_cents), 1);

  const refreshDeals = useCallback(async () => {
    const res = await fetch("/api/deals");
    if (res.ok) {
      const json = await res.json();
      setDeals(json.deals ?? []);
    }
  }, []);

  async function createDeal() {
    if (!form.brand_name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/deals", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name:    form.brand_name.trim(),
          contact_name:  form.contact_name.trim() || undefined,
          contact_email: form.contact_email.trim() || undefined,
          amount_cents: (() => {
            const parsed = Number.parseFloat(form.amount_cents);
            return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100);
          })(),
          currency:      form.currency,
          deadline:      form.deadline || undefined,
          deliverables:  form.deliverables.trim() || undefined,
          notes:         form.notes.trim() || undefined,
          tags:          form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        }),
      });
      if (res.ok) {
        await refreshDeals();
        setCreating(false);
        setForm(EMPTY_FORM);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      if (res.ok) {
        await refreshDeals();
        if (selected?.id === id) {
          setSelected((prev) => prev ? { ...prev, status: status as BrandDeal["status"] } : null);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteDeal(id: string) {
    if (!confirm("Delete this deal?")) return;
    try {
      const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `Delete failed (${res.status})`);
      }
      await refreshDeals();
      setSelected(null);
    } catch (error) {
      console.error("[deals] delete failed", error);
      alert(error instanceof Error ? error.message : "Failed to delete deal");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)", padding: "2rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 400, color: "var(--white)", margin: 0 }}>
              Brand Deal Tracker
            </h1>
            <p style={{ color: "var(--muted)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
              Manage your sponsorships and partnerships
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => setView(view === "kanban" ? "list" : "kanban")}
              style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 8, padding: "0.5rem 1rem", color: "var(--muted)", cursor: "pointer", fontSize: "0.8125rem" }}
            >
              {view === "kanban" ? "List View" : "Kanban View"}
            </button>
            <button
              onClick={() => setCreating(true)}
              style={{ background: "var(--gold)", border: "none", borderRadius: 8, padding: "0.5rem 1.25rem", color: "var(--void)", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" }}
            >
              + Add Deal
            </button>
          </div>
        </div>

        {/* ── Earnings Strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "1rem", marginBottom: "2rem" }}>
          <StatCard label="Total Paid" value={formatDealAmount(totalPaid)} gold />
          <StatCard label="Pipeline Value" value={formatDealAmount(totalPipeline)} />
          <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Monthly Earnings — {new Date().getFullYear()}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
              {MONTH_NAMES.map((m, i) => {
                const entry = monthlyEarnings.find((e) => e.month === i + 1);
                const h = entry ? Math.max(4, (entry.total_cents / maxMonth) * 48) : 2;
                return (
                  <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div
                      title={`${m}: ${formatDealAmount(entry?.total_cents ?? 0)}`}
                      style={{ width: "100%", height: h, background: entry?.total_cents ? "var(--gold)" : "var(--rim)", borderRadius: 2, transition: "height 0.3s" }}
                    />
                    <span style={{ color: "var(--dim)", fontSize: "0.55rem" }}>{m[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Kanban / List ── */}
        {view === "kanban" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", overflowX: "auto" }}>
            {KANBAN_COLS.map((col) => {
              const colDeals = deals.filter((d) => d.status === col.status);
              return (
                <div key={col.status} style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 12, padding: "1rem", minHeight: 200 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                    <span style={{ color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{col.label}</span>
                    <span style={{ color: "var(--dim)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{colDeals.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {colDeals.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setSelected(d)}
                        style={{ background: "var(--surface)", border: "1px solid var(--rim)", borderRadius: 8, padding: "0.75rem", cursor: "pointer", transition: "border-color 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--rim2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--rim)")}
                      >
                        <div style={{ color: "var(--white)", fontSize: "0.875rem", marginBottom: "0.25rem", fontWeight: 500 }}>{d.brand_name}</div>
                        <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                          {formatDealAmount(d.amount_cents, d.currency)}
                        </div>
                        {d.deadline && (
                          <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                            Due {new Date(d.deadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 16, overflow: "hidden" }}>
            {deals.length === 0 ? (
              <div style={{ padding: "4rem", textAlign: "center", color: "var(--muted)" }}>No deals yet. Add your first one.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--rim)" }}>
                    {["Brand", "Value", "Status", "Deadline", ""].map((h) => (
                      <th key={h} style={{ padding: "0.875rem 1.25rem", textAlign: "left", color: "var(--muted)", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setSelected(d)}
                      style={{ borderBottom: "1px solid var(--rim)", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--lift)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ color: "var(--white)", fontSize: "0.875rem", fontWeight: 500 }}>{d.brand_name}</div>
                        {d.contact_name && <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{d.contact_name}</div>}
                      </td>
                      <td style={{ padding: "1rem 1.25rem", color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
                        {formatDealAmount(d.amount_cents, d.currency)}
                      </td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <span style={{ background: `${DEAL_STATUS_COLORS[d.status]}22`, border: `1px solid ${DEAL_STATUS_COLORS[d.status]}55`, borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: "0.75rem", color: DEAL_STATUS_COLORS[d.status] }}>
                          {DEAL_STATUS_LABELS[d.status]}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1.25rem", color: "var(--muted)", fontSize: "0.8125rem" }}>
                        {d.deadline ? new Date(d.deadline).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <button onClick={(e) => { e.stopPropagation(); deleteDeal(d.id); }} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: "0.875rem" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Deal Detail Drawer ── */}
      {selected && !creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "flex-end", zIndex: 50 }} onClick={() => setSelected(null)}>
          <div style={{ width: 440, background: "var(--surface)", borderLeft: "1px solid var(--rim)", padding: "2rem", overflowY: "auto", height: "100vh" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.25rem", marginBottom: "1.5rem" }}>✕</button>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "var(--white)", marginBottom: "0.5rem" }}>{selected.brand_name}</h2>
            <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "1.25rem", marginBottom: "1rem" }}>
              {formatDealAmount(selected.amount_cents, selected.currency)}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {KANBAN_COLS.map((col) => (
                <button
                  key={col.status}
                  disabled={loading}
                  onClick={() => updateStatus(selected.id, col.status)}
                  style={{
                    background: selected.status === col.status ? `${DEAL_STATUS_COLORS[col.status]}22` : "var(--card)",
                    border: `1px solid ${selected.status === col.status ? DEAL_STATUS_COLORS[col.status] : "var(--rim)"}`,
                    borderRadius: 6, padding: "0.3rem 0.75rem", fontSize: "0.75rem",
                    color: selected.status === col.status ? DEAL_STATUS_COLORS[col.status] : "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  {col.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {selected.contact_name  && <DRow label="Contact"     value={selected.contact_name} />}
              {selected.contact_email && <DRow label="Email"       value={selected.contact_email} />}
              {selected.deadline      && <DRow label="Deadline"    value={new Date(selected.deadline).toLocaleDateString()} />}
            </div>
            {selected.deliverables && (
              <Section title="Deliverables">{selected.deliverables}</Section>
            )}
            {selected.notes && (
              <Section title="Notes">{selected.notes}</Section>
            )}
            {selected.tags && selected.tags.length > 0 && (
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {selected.tags.map((t) => (
                  <span key={t} style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 20, padding: "0.2rem 0.6rem", color: "var(--muted)", fontSize: "0.75rem" }}>{t}</span>
                ))}
              </div>
            )}
            <button onClick={() => deleteDeal(selected.id)} style={{ marginTop: "2rem", width: "100%", background: "var(--red-d)", border: "1px solid var(--red)", borderRadius: 8, padding: "0.75rem", color: "var(--red)", cursor: "pointer", fontSize: "0.875rem" }}>
              Delete Deal
            </button>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: "1rem" }} onClick={() => setCreating(false)}>
          <div style={{ background: "var(--card)", border: "1px solid var(--rim2)", borderRadius: 20, padding: "2rem", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--white)", marginBottom: "1.5rem" }}>New Brand Deal</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Field label="Brand Name *" value={form.brand_name} onChange={(v) => setForm({ ...form, brand_name: v })} placeholder="ACME Corp" />
              <Field label="Contact Name" value={form.contact_name} onChange={(v) => setForm({ ...form, contact_name: v })} placeholder="Jane Smith" />
              <Field label="Contact Email" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} placeholder="jane@acme.com" type="email" />
              <Field label="Deal Value (USD)" value={form.amount_cents} onChange={(v) => setForm({ ...form, amount_cents: v })} placeholder="5000" type="number" mono />
              <Field label="Deadline" value={form.deadline} onChange={(v) => setForm({ ...form, deadline: v })} type="date" />
              <Field label="Deliverables" value={form.deliverables} onChange={(v) => setForm({ ...form, deliverables: v })} placeholder="1 IG post, 2 stories" textarea />
              <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Negotiated 30% upfront" textarea />
              <Field label="Tags (comma-separated)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} placeholder="sponsored, fitness, Q2" />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button onClick={() => setCreating(false)} style={{ flex: 1, background: "none", border: "1px solid var(--rim)", borderRadius: 8, padding: "0.75rem", color: "var(--muted)", cursor: "pointer" }}>Cancel</button>
              <button disabled={loading || !form.brand_name.trim()} onClick={createDeal} style={{ flex: 2, background: "var(--gold)", border: "none", borderRadius: 8, padding: "0.75rem", color: "var(--void)", fontWeight: 600, cursor: "pointer" }}>
                {loading ? "Saving…" : "Create Deal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 12, padding: "1.25rem" }}>
      <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ color: gold ? "var(--gold)" : "var(--white)", fontFamily: "var(--font-mono)", fontSize: "1.5rem" }}>{value}</div>
    </div>
  );
}

function DRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>{label}</span>
      <span style={{ color: "var(--white)", fontSize: "0.875rem" }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
      <p style={{ color: "var(--white)", fontSize: "0.875rem", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{children}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", mono, textarea }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean; textarea?: boolean;
}) {
  const inputStyle = {
    width: "100%", background: "var(--deep)", border: "1px solid var(--rim2)", borderRadius: 8,
    padding: "0.75rem", color: "var(--white)", fontSize: "0.9rem", outline: "none",
    boxSizing: "border-box" as const, fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
  };
  return (
    <div>
      <label style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} style={inputStyle} />
      )}
    </div>
  );
}
