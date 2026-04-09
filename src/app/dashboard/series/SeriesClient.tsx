"use client";

import { useState, useCallback } from "react";
import type { Series, SeriesEpisode } from "@/lib/series";
import { formatSeriesPrice, SERIES_STATUS_LABELS, SERIES_STATUS_COLORS } from "@/lib/series";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Props {
  initialSeries:   Series[];
  initialEpisodes: SeriesEpisode[];
  monthlyEarnings: { month: number; total_cents: number; purchase_count: number }[];
  handle:          string;
}

const EMPTY_SERIES_FORM = { title: "", description: "", cover_url: "", price: "" };
const EMPTY_EP_FORM     = { title: "", body: "", media_url: "", is_preview: false };

// ─── small helpers ─────────────────────────────────────────────────────────
function StatCard({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 12, padding: "1.125rem 1.25rem" }}>
      <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.375rem" }}>
        {label}
      </div>
      <div style={{ color: gold ? "var(--gold)" : "var(--white)", fontSize: "1.5rem", fontFamily: "var(--font-display)", fontWeight: 400 }}>
        {value}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.375rem" }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--rim)", borderRadius: 8, padding: "0.625rem 0.875rem", color: "var(--white)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
      />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.375rem" }}>{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--rim)", borderRadius: 8, padding: "0.625rem 0.875rem", color: "var(--white)", fontSize: "0.875rem", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "var(--font-body)" }}
      />
    </label>
  );
}

// ─── main component ─────────────────────────────────────────────────────────
export default function SeriesClient({ initialSeries, initialEpisodes, monthlyEarnings, handle }: Props) {
  const [seriesList, setSeriesList]   = useState<Series[]>(initialSeries);
  const [episodes, setEpisodes]       = useState<SeriesEpisode[]>(initialEpisodes);
  const [selected, setSelected]       = useState<Series | null>(null);
  const [panel, setPanel]             = useState<"detail" | "add-episode" | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [seriesForm, setSeriesForm]   = useState(EMPTY_SERIES_FORM);
  const [editForm, setEditForm]       = useState(EMPTY_SERIES_FORM);
  const [epForm, setEpForm]           = useState(EMPTY_EP_FORM);
  const [loading, setLoading]         = useState(false);
  const [epLoading, setEpLoading]     = useState(false);

  const totalRevenue = monthlyEarnings.reduce((s, m) => s + m.total_cents, 0);
  const totalSales   = seriesList.reduce((s, s2) => s + s2.total_sales, 0);
  const published    = seriesList.filter((s) => s.status === "published").length;
  const drafts       = seriesList.filter((s) => s.status === "draft").length;
  const maxMonth     = Math.max(...monthlyEarnings.map((m) => m.total_cents), 1);

  const selectedEpisodes = selected
    ? episodes.filter((e) => e.series_id === selected.id)
    : [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // ── refresh helpers ───────────────────────────────────────────────────────
  const refreshSeries = useCallback(async () => {
    const res = await fetch("/api/series");
    if (res.ok) {
      const json = await res.json();
      setSeriesList(json.series ?? []);
    }
  }, []);

  const refreshEpisodes = useCallback(async (seriesId: string) => {
    const res = await fetch(`/api/series/${seriesId}`);
    if (res.ok) {
      const json = await res.json();
      const fresh = (json.episodes ?? []) as SeriesEpisode[];
      setEpisodes((prev) => [
        ...prev.filter((e) => e.series_id !== seriesId),
        ...fresh,
      ]);
    }
  }, []);

  // ── create series ─────────────────────────────────────────────────────────
  async function createSeries() {
    if (!seriesForm.title.trim()) return;
    setLoading(true);
    try {
      const parsedPrice = Number.parseFloat(seriesForm.price);
      const priceCents = Number.isFinite(parsedPrice) && parsedPrice > 0
        ? Math.round(parsedPrice * 100)
        : 0;
      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       seriesForm.title.trim(),
          description: seriesForm.description.trim() || undefined,
          cover_url:   seriesForm.cover_url.trim() || undefined,
          price_cents: priceCents,
        }),
      });
      if (res.ok) {
        await refreshSeries();
        setShowCreate(false);
        setSeriesForm(EMPTY_SERIES_FORM);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── save series edits ─────────────────────────────────────────────────────
  async function saveSeriesEdits() {
    if (!selected || !editForm.title.trim()) return;
    setLoading(true);
    try {
      const parsedPrice = Number.parseFloat(editForm.price);
      const priceCents = Number.isFinite(parsedPrice) && parsedPrice > 0
        ? Math.round(parsedPrice * 100)
        : 0;
      const res = await fetch(`/api/series/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       editForm.title.trim(),
          description: editForm.description.trim() || undefined,
          cover_url:   editForm.cover_url.trim() || undefined,
          price_cents: priceCents,
        }),
      });
      if (res.ok) {
        await refreshSeries();
      }
    } finally {
      setLoading(false);
    }
  }

  // ── set series status ─────────────────────────────────────────────────────
  async function setStatus(id: string, status: Series["status"]) {
    setLoading(true);
    try {
      const res = await fetch(`/api/series/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await refreshSeries();
        if (selected?.id === id) {
          setSelected((prev) => prev ? { ...prev, status } : null);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // ── delete series ─────────────────────────────────────────────────────────
  async function deleteSeries(id: string) {
    if (!confirm("Delete this series and all its episodes? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/series/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEpisodes((prev) => prev.filter((e) => e.series_id !== id));
        setSeriesList((prev) => prev.filter((s) => s.id !== id));
        if (selected?.id === id) { setSelected(null); setPanel(null); }
      }
    } finally {
      setLoading(false);
    }
  }

  // ── add episode ───────────────────────────────────────────────────────────
  async function addEpisode() {
    if (!selected || !epForm.title.trim()) return;
    setEpLoading(true);
    try {
      const res = await fetch(`/api/series/${selected.id}/episodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:      epForm.title.trim(),
          body:       epForm.body.trim() || undefined,
          media_url:  epForm.media_url.trim() || undefined,
          is_preview: epForm.is_preview,
        }),
      });
      if (res.ok) {
        await refreshEpisodes(selected.id);
        await refreshSeries();
        setEpForm(EMPTY_EP_FORM);
        setPanel("detail");
      }
    } finally {
      setEpLoading(false);
    }
  }

  // ── delete episode ────────────────────────────────────────────────────────
  async function deleteEpisode(epId: string) {
    if (!selected || !confirm("Remove this episode?")) return;
    setEpLoading(true);
    try {
      const res = await fetch(`/api/series/${selected.id}/episodes/${epId}`, { method: "DELETE" });
      if (res.ok) {
        await refreshEpisodes(selected.id);
        await refreshSeries();
      }
    } finally {
      setEpLoading(false);
    }
  }

  // ── open detail panel ─────────────────────────────────────────────────────
  function openDetail(s: Series) {
    setSelected(s);
    setEditForm({
      title:       s.title,
      description: s.description ?? "",
      cover_url:   s.cover_url ?? "",
      price:       s.price_cents ? (s.price_cents / 100).toFixed(2) : "",
    });
    setPanel("detail");
  }

  const liveUrl = selected && handle ? `${siteUrl}/series/${handle}/${selected.id}` : null;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--void)", padding: "2rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 400, color: "var(--white)", margin: 0 }}>
              Series Drops
            </h1>
            <p style={{ color: "var(--muted)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
              Multi-episode content your fans unlock for life
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ background: "var(--gold)", color: "#0a0800", fontFamily: "var(--font-mono)", fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", padding: "0.75rem 1.5rem", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            + New Series
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <StatCard label="Total Revenue" value={`$${(totalRevenue / 100).toFixed(2)}`} gold />
          <StatCard label="Total Sales"   value={String(totalSales)} />
          <StatCard label="Published"     value={String(published)} />
          <StatCard label="Drafts"        value={String(drafts)} />
        </div>

        {/* Monthly chart */}
        <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 16, padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ color: "var(--white)", fontFamily: "var(--font-display)", fontSize: "1.125rem", fontWeight: 400, margin: 0 }}>
              Monthly Revenue — {new Date().getFullYear()}
            </h3>
            <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
              {monthlyEarnings.reduce((s, m) => s + m.purchase_count, 0)} purchases this year
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 72 }}>
            {MONTH_NAMES.map((abbr, i) => {
              const entry = monthlyEarnings.find((e) => e.month === i + 1);
              const h = entry?.total_cents ? Math.max(4, (entry.total_cents / maxMonth) * 72) : 2;
              return (
                <div key={abbr} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div
                    style={{ width: "100%", height: h, background: entry?.total_cents ? "var(--gold)" : "var(--rim)", borderRadius: 3, transition: "height 0.4s ease", opacity: entry?.total_cents ? 0.8 : 0.4 }}
                    title={entry ? `$${(entry.total_cents / 100).toFixed(0)}` : "$0"}
                  />
                  <span style={{ color: "var(--dim)", fontSize: "0.625rem", fontFamily: "var(--font-mono)" }}>{abbr}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content — two-column when detail open */}
        <div style={{ display: "grid", gridTemplateColumns: panel ? "1fr 420px" : "1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* Series list */}
          <div>
            {seriesList.length === 0 ? (
              <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 16, padding: "3rem", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem", opacity: 0.3 }}>📚</div>
                <p style={{ color: "var(--muted)", margin: 0 }}>No series yet. Create your first drop.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "0.875rem" }}>
                {seriesList.map((s) => {
                  const isActive = selected?.id === s.id;
                  const color = SERIES_STATUS_COLORS[s.status];
                  return (
                    <div
                      key={s.id}
                      onClick={() => openDetail(s)}
                      style={{ background: "var(--card)", border: `1px solid ${isActive ? "var(--gold)" : "var(--rim)"}`, borderRadius: 12, padding: "1.125rem 1.25rem", cursor: "pointer", display: "flex", gap: "1rem", alignItems: "flex-start", transition: "border-color 0.2s" }}
                    >
                      {/* Cover thumbnail */}
                      {s.cover_url ? (
                        <img src={s.cover_url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 8, background: "var(--surface)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", opacity: 0.4 }}>📖</div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <span style={{ color: "var(--white)", fontFamily: "var(--font-display)", fontSize: "1.0625rem", fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.title}
                          </span>
                          <span style={{ background: color.bg, color: color.text, fontSize: "0.625rem", fontFamily: "var(--font-mono)", letterSpacing: "0.15em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 4, flexShrink: 0 }}>
                            {SERIES_STATUS_LABELS[s.status]}
                          </span>
                        </div>
                        {s.description && (
                          <p style={{ color: "var(--muted)", fontSize: "0.8125rem", margin: "0 0 0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.description}
                          </p>
                        )}
                        <div style={{ display: "flex", gap: "1rem" }}>
                          <span style={{ color: "var(--dim)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                            {s.episode_count} episode{s.episode_count !== 1 ? "s" : ""}
                          </span>
                          <span style={{ color: "var(--gold)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                            {formatSeriesPrice(s.price_cents)}
                          </span>
                          <span style={{ color: "var(--dim)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                            {s.total_sales} sale{s.total_sales !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {panel && selected && (
            <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 16, padding: "1.5rem", position: "sticky", top: "2rem" }}>
              {/* Panel header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h3 style={{ color: "var(--white)", fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 400, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "calc(100% - 60px)" }}>
                  {selected.title}
                </h3>
                <button
                  onClick={() => { setSelected(null); setPanel(null); }}
                  style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.25rem", cursor: "pointer", padding: "0 4px" }}
                  aria-label="Close"
                >×</button>
              </div>

              {/* Sub-tabs */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
                {(["detail", "add-episode"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPanel(t)}
                    style={{ background: panel === t ? "var(--gold-faint)" : "none", border: `1px solid ${panel === t ? "var(--gold)" : "var(--rim)"}`, borderRadius: 6, padding: "0.375rem 0.75rem", color: panel === t ? "var(--gold)" : "var(--muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.12em" }}
                  >
                    {t === "detail" ? "Edit" : "+ Episode"}
                  </button>
                ))}
              </div>

              {/* DETAIL TAB */}
              {panel === "detail" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                  {/* Edit form */}
                  <Input label="Title" value={editForm.title} onChange={(v) => setEditForm((p) => ({ ...p, title: v }))} />
                  <Textarea label="Description" value={editForm.description} onChange={(v) => setEditForm((p) => ({ ...p, description: v }))} rows={3} />
                  <Input label="Cover URL" value={editForm.cover_url} onChange={(v) => setEditForm((p) => ({ ...p, cover_url: v }))} placeholder="https://..." />
                  <Input label="Price (USD, 0 = free)" value={editForm.price} onChange={(v) => setEditForm((p) => ({ ...p, price: v }))} type="number" placeholder="0" />
                  <button
                    onClick={saveSeriesEdits}
                    disabled={loading}
                    style={{ background: "var(--surface)", border: "1px solid var(--rim2)", borderRadius: 8, padding: "0.625rem", color: "var(--white)", fontSize: "0.8125rem", cursor: "pointer" }}
                  >
                    {loading ? "Saving…" : "Save Changes"}
                  </button>

                  {/* Status row */}
                  <div style={{ borderTop: "1px solid var(--rim)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Status</div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {(["draft", "published", "archived"] as const).map((st) => {
                        const c = SERIES_STATUS_COLORS[st];
                        const isActive = selected.status === st;
                        return (
                          <button
                            key={st}
                            onClick={() => setStatus(selected.id, st)}
                            disabled={loading || isActive}
                            style={{ background: isActive ? c.bg : "none", border: `1px solid ${isActive ? c.text : "var(--rim)"}`, borderRadius: 6, padding: "0.375rem 0.75rem", color: isActive ? c.text : "var(--dim)", fontSize: "0.6875rem", fontFamily: "var(--font-mono)", cursor: isActive ? "default" : "pointer", textTransform: "uppercase", letterSpacing: "0.12em" }}
                          >
                            {SERIES_STATUS_LABELS[st]}
                          </button>
                        );
                      })}
                    </div>
                    {liveUrl && selected.status === "published" && (
                      <a href={liveUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", fontSize: "0.8125rem", textDecoration: "none" }}>
                        View Live ↗
                      </a>
                    )}
                  </div>

                  {/* Episodes list */}
                  <div style={{ borderTop: "1px solid var(--rim)", paddingTop: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                      <span style={{ color: "var(--muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                        Episodes ({selectedEpisodes.length})
                      </span>
                      <button
                        onClick={() => setPanel("add-episode")}
                        style={{ background: "none", border: "1px solid var(--rim)", borderRadius: 6, padding: "0.25rem 0.625rem", color: "var(--gold)", fontSize: "0.6875rem", fontFamily: "var(--font-mono)", cursor: "pointer" }}
                      >
                        + Add
                      </button>
                    </div>

                    {selectedEpisodes.length === 0 ? (
                      <p style={{ color: "var(--dim)", fontSize: "0.8125rem", textAlign: "center", padding: "1rem 0" }}>
                        No episodes yet
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {selectedEpisodes.map((ep, idx) => (
                          <div key={ep.id} style={{ background: "var(--surface)", borderRadius: 8, padding: "0.625rem 0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ color: "var(--dim)", fontFamily: "var(--font-mono)", fontSize: "0.6875rem", minWidth: 20 }}>
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: "var(--white)", fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {ep.title}
                              </div>
                              {ep.is_preview && (
                                <span style={{ color: "var(--amber)", fontSize: "0.625rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Free Preview</span>
                              )}
                            </div>
                            <button
                              onClick={() => deleteEpisode(ep.id)}
                              disabled={epLoading}
                              style={{ background: "none", border: "none", color: "var(--dim)", fontSize: "0.875rem", cursor: "pointer", padding: "2px 4px" }}
                              aria-label="Delete episode"
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Danger zone */}
                  <div style={{ borderTop: "1px solid var(--rim)", paddingTop: "1rem" }}>
                    <button
                      onClick={() => deleteSeries(selected.id)}
                      disabled={loading}
                      style={{ background: "none", border: "1px solid rgba(224,85,85,0.3)", borderRadius: 8, padding: "0.5rem 1rem", color: "var(--red)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", cursor: "pointer", width: "100%" }}
                    >
                      Delete Series
                    </button>
                  </div>
                </div>
              )}

              {/* ADD EPISODE TAB */}
              {panel === "add-episode" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <Input label="Episode Title" value={epForm.title} onChange={(v) => setEpForm((p) => ({ ...p, title: v }))} placeholder="Episode 1 — The Beginning" />
                  <Textarea label="Content (markdown)" value={epForm.body} onChange={(v) => setEpForm((p) => ({ ...p, body: v }))} placeholder="Write your episode content here..." rows={8} />
                  <Input label="Media URL (optional)" value={epForm.media_url} onChange={(v) => setEpForm((p) => ({ ...p, media_url: v }))} placeholder="https://..." />
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={epForm.is_preview}
                      onChange={(e) => setEpForm((p) => ({ ...p, is_preview: e.target.checked }))}
                      style={{ accentColor: "var(--gold)", width: 14, height: 14 }}
                    />
                    <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>Free preview episode (visible without purchase)</span>
                  </label>
                  <button
                    onClick={addEpisode}
                    disabled={epLoading || !epForm.title.trim()}
                    style={{ background: "var(--gold)", color: "#0a0800", fontFamily: "var(--font-mono)", fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", padding: "0.75rem", border: "none", borderRadius: 4, cursor: "pointer", opacity: (epLoading || !epForm.title.trim()) ? 0.5 : 1 }}
                  >
                    {epLoading ? "Adding…" : "Add Episode"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create series modal */}
      {showCreate && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 16, padding: "1.75rem", width: "100%", maxWidth: 480 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 400, color: "var(--white)", margin: "0 0 1.5rem" }}>
              New Series
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Input label="Title *" value={seriesForm.title} onChange={(v) => setSeriesForm((p) => ({ ...p, title: v }))} placeholder="My Content Series" />
              <Textarea label="Description" value={seriesForm.description} onChange={(v) => setSeriesForm((p) => ({ ...p, description: v }))} placeholder="What's this series about?" rows={3} />
              <Input label="Cover URL" value={seriesForm.cover_url} onChange={(v) => setSeriesForm((p) => ({ ...p, cover_url: v }))} placeholder="https://..." />
              <Input label="Price (USD, leave blank for free)" value={seriesForm.price} onChange={(v) => setSeriesForm((p) => ({ ...p, price: v }))} type="number" placeholder="0" />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button
                onClick={() => { setShowCreate(false); setSeriesForm(EMPTY_SERIES_FORM); }}
                style={{ flex: 1, background: "none", border: "1px solid var(--rim)", borderRadius: 8, padding: "0.75rem", color: "var(--muted)", fontSize: "0.875rem", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={createSeries}
                disabled={loading || !seriesForm.title.trim()}
                style={{ flex: 2, background: "var(--gold)", border: "none", borderRadius: 8, padding: "0.75rem", color: "#0a0800", fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", opacity: (loading || !seriesForm.title.trim()) ? 0.5 : 1 }}
              >
                {loading ? "Creating…" : "Create Series"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
