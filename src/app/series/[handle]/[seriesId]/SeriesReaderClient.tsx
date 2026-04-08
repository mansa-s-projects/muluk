"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PublicEpisode } from "@/lib/series";
import { formatSeriesPrice } from "@/lib/series";

interface Props {
  handle: string;
  seriesId: string;
}

interface SeriesMeta {
  id: string;
  title: string;
  description: string;
  cover_url: string | null;
  price_cents: number;
  episode_count: number;
}

type ReaderState =
  | { phase: "loading" }
  | { phase: "success"; series: SeriesMeta; episodes: PublicEpisode[] }
  | { phase: "pending" }
  | { phase: "refunded" }
  | { phase: "no_access"; series: SeriesMeta }
  | { phase: "not_found" }
  | { phase: "error"; message: string };

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(url);
}

export default function SeriesReaderClient({ handle, seriesId }: Props) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [state, setState]   = useState<ReaderState>({ phase: "loading" });
  const [buying, setBuying] = useState(false);
  const [email, setEmail]   = useState("");
  const [name, setName]     = useState("");

  async function load() {
    setState({ phase: "loading" });
    try {
      const url = token
        ? `/api/series/${seriesId}/read?token=${encodeURIComponent(token)}`
        : `/api/series/${seriesId}/read`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setState({ phase: "success", series: data.series, episodes: data.episodes });
        return;
      }

      if (res.status === 402 && data.pending) {
        setState({ phase: "pending" });
        return;
      }

      if (res.status === 403 && data.refunded) {
        setState({ phase: "refunded" });
        return;
      }

      if (res.status === 401 || res.status === 403 || res.status === 402) {
        // Try to get series metadata for the buy CTA
        try {
          const pubRes = await fetch(`/api/series/public/${handle}`);
          if (pubRes.ok) {
            const pubData = await pubRes.json();
            const found = (pubData.series ?? []).find((s: SeriesMeta) => s.id === seriesId);
            if (found) {
              setState({ phase: "no_access", series: found });
              return;
            }
          }
        } catch { /* fall through */ }
        setState({ phase: "no_access", series: { id: seriesId, title: "This Series", description: "", cover_url: null, price_cents: 0, episode_count: 0 } });
        return;
      }

      if (res.status === 404) {
        setState({ phase: "not_found" });
        return;
      }

      setState({ phase: "error", message: data.error ?? "Something went wrong" });
    } catch {
      setState({ phase: "error", message: "Network error. Please try again." });
    }
  }

  useEffect(() => { load(); }, [seriesId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function buySeries() {
    setBuying(true);
    try {
      const res = await fetch(`/api/series/${seriesId}/buy`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fan_email: email || undefined, fan_name: name || undefined }),
      });
      if (!res.ok) throw new Error("Could not initiate purchase");
      const data = await res.json();
      if (data.checkout_url)  window.location.href = data.checkout_url;
      else if (data.redirect_url) window.location.href = data.redirect_url;
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setBuying(false);
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (state.phase === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--void)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.2em" }}>
          LOADING…
        </span>
      </div>
    );
  }

  // ─── Shared outer shell ──────────────────────────────────────────────────────
  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: "100vh", background: "var(--void)", padding: "2rem 1rem 6rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <a
          href={`/series/${handle}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.15em", textDecoration: "none", marginBottom: "2.5rem" }}
        >
          ← ALL SERIES
        </a>
        {children}
      </div>
    </div>
  );

  // ─── Not found ──────────────────────────────────────────────────────────────
  if (state.phase === "not_found") {
    return shell(
      <div style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📖</div>
        <p style={{ color: "var(--muted)", fontFamily: "var(--font-body)" }}>Series not found.</p>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────
  if (state.phase === "error") {
    return shell(
      <div style={{ textAlign: "center", paddingTop: "4rem" }}>
        <p style={{ color: "var(--red)", fontFamily: "var(--font-body)", marginBottom: "1rem" }}>{state.message}</p>
        <button
          onClick={load}
          style={{ background: "var(--card)", border: "1px solid var(--rim)", color: "var(--muted)", padding: "0.5rem 1.25rem", borderRadius: 6, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.85rem" }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ─── Payment pending ────────────────────────────────────────────────────────
  if (state.phase === "pending") {
    return shell(
      <div style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem" }}>⏳</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "#fff", marginBottom: "0.5rem" }}>
          Payment Processing
        </h2>
        <p style={{ color: "var(--muted)", fontFamily: "var(--font-body)", marginBottom: "2rem", lineHeight: 1.6 }}>
          Your payment is being confirmed. This usually takes a moment.
        </p>
        <button
          onClick={load}
          style={{ background: "var(--gold)", border: "none", color: "#000", padding: "0.65rem 1.75rem", borderRadius: 6, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.9rem", fontWeight: 600, letterSpacing: "0.04em" }}
        >
          Refresh
        </button>
      </div>
    );
  }

  // ─── Refunded ───────────────────────────────────────────────────────────────
  if (state.phase === "refunded") {
    return shell(
      <div style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem" }}>🔒</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "#fff", marginBottom: "0.5rem" }}>
          Access Revoked
        </h2>
        <p style={{ color: "var(--muted)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
          This purchase was refunded and access has been removed.
        </p>
      </div>
    );
  }

  // ─── No access — buy CTA ────────────────────────────────────────────────────
  if (state.phase === "no_access") {
    const s = state.series;
    const isFree = s.price_cents === 0;
    return shell(
      <div>
        {/* Hero */}
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", marginBottom: "2.5rem", flexWrap: "wrap" }}>
          {s.cover_url ? (
            <img
              src={s.cover_url}
              alt={s.title}
              style={{ width: 120, height: 160, objectFit: "cover", borderRadius: 8, border: "1px solid var(--rim)", flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 120, height: 160, background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", flexShrink: 0 }}>
              📖
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem,4vw,2.25rem)", color: "#fff", margin: "0 0 0.5rem" }}>
              {s.title}
            </h1>
            {s.description && (
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body)", lineHeight: 1.65, margin: "0 0 1rem", fontSize: "0.95rem" }}>
                {s.description}
              </p>
            )}
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", color: "var(--gold)", letterSpacing: "0.05em" }}>
                {formatSeriesPrice(s.price_cents)}
              </span>
              <span style={{ color: "var(--dim)", fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                {s.episode_count} EPISODE{s.episode_count !== 1 ? "S" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Buy card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 10, padding: "1.75rem" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", color: "#fff", margin: "0 0 1.25rem" }}>
            {isFree ? "Read for Free" : "Unlock Full Series"}
          </h3>
          {!isFree && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ background: "var(--surface)", border: "1px solid var(--rim)", borderRadius: 6, padding: "0.6rem 0.875rem", color: "#fff", fontFamily: "var(--font-body)", fontSize: "0.9rem", outline: "none" }}
              />
              <input
                type="email"
                placeholder="Email for receipt (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ background: "var(--surface)", border: "1px solid var(--rim)", borderRadius: 6, padding: "0.6rem 0.875rem", color: "#fff", fontFamily: "var(--font-body)", fontSize: "0.9rem", outline: "none" }}
              />
            </div>
          )}
          <button
            onClick={buySeries}
            disabled={buying}
            style={{ width: "100%", background: buying ? "var(--rim)" : "var(--gold)", border: "none", color: "#000", padding: "0.75rem", borderRadius: 6, cursor: buying ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.04em" }}
          >
            {buying ? "Redirecting…" : isFree ? "Read Now" : `Get Access — ${formatSeriesPrice(s.price_cents)}`}
          </button>
        </div>
      </div>
    );
  }

  // ─── Success — episode reader ────────────────────────────────────────────────
  const { series: s, episodes } = state;

  return shell(
    <div>
      {/* Series header */}
      <div style={{ marginBottom: "3rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem,5vw,2.75rem)", color: "#fff", margin: "0 0 0.5rem", lineHeight: 1.2 }}>
          {s.title}
        </h1>
        {s.description && (
          <p style={{ color: "var(--muted)", fontFamily: "var(--font-body)", lineHeight: 1.65, margin: "0 0 1rem", fontSize: "0.95rem", maxWidth: 600 }}>
            {s.description}
          </p>
        )}
        <span style={{ color: "var(--dim)", fontFamily: "var(--font-mono)", fontSize: "0.72rem", letterSpacing: "0.12em" }}>
          {episodes.length} EPISODE{episodes.length !== 1 ? "S" : ""}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--rim)", marginBottom: "3rem" }} />

      {/* Episodes */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3.5rem" }}>
        {episodes.map((ep, i) => (
          <article key={ep.id}>
            {/* Episode header */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--gold)", letterSpacing: "0.18em", flexShrink: 0 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {ep.is_preview && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--amber)", background: "rgba(232,168,48,0.12)", border: "1px solid rgba(232,168,48,0.3)", padding: "0.1rem 0.5rem", borderRadius: 4, letterSpacing: "0.12em" }}>
                  FREE PREVIEW
                </span>
              )}
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "#fff", margin: 0, lineHeight: 1.3 }}>
                {ep.title}
              </h2>
            </div>

            {/* Body */}
            {ep.body && (
              <div
                style={{
                  fontFamily:   "var(--font-body)",
                  fontSize:     "0.97rem",
                  color:        "rgba(255,255,255,0.82)",
                  lineHeight:   1.75,
                  whiteSpace:   "pre-wrap",
                  wordBreak:    "break-word",
                }}
              >
                {ep.body}
              </div>
            )}

            {/* Media */}
            {ep.media_url && (
              <div style={{ marginTop: "1.5rem" }}>
                {isImageUrl(ep.media_url) ? (
                  <img
                    src={ep.media_url}
                    alt={ep.title}
                    style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--rim)" }}
                  />
                ) : (
                  <a
                    href={ep.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "0.8rem", letterSpacing: "0.1em", textDecoration: "underline" }}
                  >
                    VIEW ATTACHMENT ↗
                  </a>
                )}
              </div>
            )}

            {/* Episode divider */}
            {i < episodes.length - 1 && (
              <div style={{ height: 1, background: "var(--rim)", marginTop: "3.5rem" }} />
            )}
          </article>
        ))}
      </div>

      {/* End of series */}
      {episodes.length > 0 && (
        <div style={{ marginTop: "4rem", textAlign: "center" }}>
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--rim) 50%, transparent)", marginBottom: "2rem" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--dim)", letterSpacing: "0.2em" }}>
            END OF SERIES
          </span>
        </div>
      )}
    </div>
  );
}
