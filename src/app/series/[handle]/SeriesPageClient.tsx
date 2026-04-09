"use client";

import { useEffect, useState } from "react";
import type { PublicSeries, PublicEpisode } from "@/lib/series";
import { formatSeriesPrice } from "@/lib/series";

interface Props {
  handle: string;
}

interface SeriesWithPreviews extends PublicSeries {
  preview_episodes: PublicEpisode[];
}

export default function SeriesPageClient({ handle }: Props) {
  const [seriesList, setSeriesList] = useState<SeriesWithPreviews[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [buying, setBuying]         = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/series/public/${handle}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => setSeriesList(d.series ?? []))
      .catch(() => setError("Creator not found."))
      .finally(() => setLoading(false));
  }, [handle]);

  async function buySeries(seriesId: string, email?: string, name?: string) {
    setBuying(seriesId);
    try {
      const res = await fetch(`/api/series/${seriesId}/buy`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fan_email: email, fan_name: name }),
      });
      if (!res.ok) throw new Error("Could not initiate purchase");
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        console.error("[series/page] buy succeeded without redirect URL", data);
        alert("Unable to continue to checkout right now. Please try again.");
      }
    } catch (error) {
      console.error("[series/page] buy request failed", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setBuying(null);
    }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--void)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.2em" }}>LOADING…</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "var(--void)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--muted)", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem", opacity: 0.3 }}>📚</div>
        <p>{error}</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <p style={{ color: "var(--dim)", fontFamily: "var(--font-mono)", fontSize: "0.6875rem", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            @{handle}
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,6vw,3.5rem)", fontWeight: 300, color: "var(--white)", margin: 0, letterSpacing: "-0.02em" }}>
            Series Drops
          </h1>
          <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
            Unlock full access to any series below
          </p>
        </div>

        {seriesList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <p style={{ color: "var(--muted)" }}>No series published yet. Check back soon.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {seriesList.map((s) => (
              <SeriesCard key={s.id} series={s} handle={handle} onBuy={buySeries} isBuying={buying === s.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SeriesCard({
  series,
  handle,
  onBuy,
  isBuying,
}: {
  series: SeriesWithPreviews;
  handle: string;
  onBuy: (id: string, email?: string, name?: string) => void;
  isBuying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail]       = useState("");
  const [name, setName]         = useState("");

  const isFree = series.price_cents === 0;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s" }}>
      <div style={{ display: "flex", gap: "1.25rem", padding: "1.5rem", alignItems: "flex-start" }}>

        {/* Cover */}
        {series.cover_url ? (
          <img
            src={series.cover_url}
            alt={series.title}
            style={{ width: 80, height: 80, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: 10, background: "var(--surface)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", opacity: 0.35 }}>
            📖
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.375rem", fontWeight: 400, color: "var(--white)", margin: "0 0 0.25rem", letterSpacing: "-0.01em" }}>
            {series.title}
          </h2>
          {series.description && (
            <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0 0 0.75rem", lineHeight: 1.5 }}>
              {series.description}
            </p>
          )}
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
            <span style={{ color: "var(--gold)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
              {formatSeriesPrice(series.price_cents)}
            </span>
            <span style={{ color: "var(--dim)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
              {series.episode_count} episode{series.episode_count !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div style={{ flexShrink: 0 }}>
          <button
            onClick={() => setExpanded((p) => !p)}
            style={{ background: "var(--gold)", color: "#0a0800", fontFamily: "var(--font-mono)", fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", padding: "0.625rem 1.25rem", border: "none", borderRadius: 4, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {isFree ? "Get Free Access" : `Unlock · ${formatSeriesPrice(series.price_cents)}`}
          </button>
        </div>
      </div>

      {/* Preview episodes */}
      {series.preview_episodes.length > 0 && (
        <div style={{ borderTop: "1px solid var(--rim)", padding: "1rem 1.5rem" }}>
          <p style={{ color: "var(--dim)", fontSize: "0.6875rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.625rem" }}>
            Free Previews
          </p>
          {series.preview_episodes.slice(0, 3).map((ep) => (
            <div key={ep.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
              <span style={{ color: "var(--amber)", fontSize: "0.5625rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", background: "rgba(232,168,48,0.12)", padding: "2px 6px", borderRadius: 3 }}>Preview</span>
              <a
                href={`/series/${handle}/${series.id}?episode=${ep.id}`}
                style={{ color: "var(--muted)", fontSize: "0.8125rem", textDecoration: "none" }}
              >
                {ep.title}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Purchase form */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--rim)", padding: "1.25rem 1.5rem", background: "var(--surface)" }}>
          {!isFree && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.875rem" }}>
              <label style={{ display: "block" }}>
                <div style={{ color: "var(--muted)", fontSize: "0.6875rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.25rem" }}>Name (optional)</div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  style={{ width: "100%", background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 6, padding: "0.5rem 0.75rem", color: "var(--white)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                />
              </label>
              <label style={{ display: "block" }}>
                <div style={{ color: "var(--muted)", fontSize: "0.6875rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.25rem" }}>Email (optional)</div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="For receipt"
                  style={{ width: "100%", background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 6, padding: "0.5rem 0.75rem", color: "var(--white)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                />
              </label>
            </div>
          )}
          <button
            onClick={() => onBuy(series.id, email || undefined, name || undefined)}
            disabled={isBuying}
            style={{ width: "100%", background: "var(--gold)", color: "#0a0800", fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", padding: "0.75rem", border: "none", borderRadius: 6, cursor: "pointer", opacity: isBuying ? 0.6 : 1 }}
          >
            {isBuying ? "Processing…" : isFree ? "Get Free Access →" : `Pay ${formatSeriesPrice(series.price_cents)} →`}
          </button>
        </div>
      )}
    </div>
  );
}
