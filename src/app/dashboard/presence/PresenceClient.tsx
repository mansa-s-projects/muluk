"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Design tokens ─────────────────────────────────────────────────────────
const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;
const disp = { fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" } as const;

// ─── Types ─────────────────────────────────────────────────────────────────
export type FanRow = {
  fan_code_id: string;
  code: string;
  last_seen_at: string;
  is_online: boolean;
  is_recent: boolean;
  current_page: string | null;
  lifetime_spend: number;
  purchase_count: number;
};

export type ActivityRow = {
  id: string;
  fan_code_id: string;
  code: string;
  activity_type: string;
  page: string | null;
  content_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PresenceStats = {
  online_now: number;
  recently_active: number;
  vault_viewers: number;
  high_value_online: number;
};

export type PresenceData = {
  fans: FanRow[];
  activity: ActivityRow[];
  stats: PresenceStats;
  fetched_at: string;
};

type FilterTab = "all" | "online" | "recent" | "spenders" | "vault";

// ─── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  if (delta < 10_000) return "just now";
  if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

function formatAmount(cents: number): string {
  if (cents === 0) return "—";
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(0)}`;
}

function humanizeActivity(type: string, page: string | null): string {
  const pagePart = page ? ` · ${page.replace(/^\//, "").split("/")[0] || "home"}` : "";
  const map: Record<string, string> = {
    page_view: `viewed page${pagePart}`,
    vault_view: "opened Vault",
    tip_click: "tapped Tip Jar",
    message_open: "opened Messages",
    booking_view: "viewed Bookings",
    series_view: "viewed Series",
    content_unlock: "unlocked content",
    checkout_open: "opened checkout",
  };
  return map[type] ?? type;
}

function codeLabel(code: string): string {
  return code.replace("FAN-", "").slice(0, 6).toLowerCase();
}

function pageLabel(page: string | null): string {
  if (!page) return "—";
  const clean = page.replace(/^\/[^/]+\//, "").replace(/^\//, "") || "home";
  return clean.slice(0, 20);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "var(--card, #0f0f1e)",
        border: "1px solid rgba(255,255,255,0.055)",
        borderRadius: "10px",
        padding: "18px 20px",
        position: "relative",
        overflow: "hidden",
        flex: "1 1 0",
        minWidth: "120px",
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: "26px",
          fontWeight: 500,
          color: accent ?? "var(--white, rgba(255,255,255,0.92))",
          lineHeight: 1,
          marginBottom: "6px",
        }}
      >
        {value}
      </div>
      <div
        style={{
          ...mono,
          fontSize: "9px",
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.28)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function _Skeleton({ width, height = 14 }: { width: number | string; height?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: "3px",
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s infinite",
      }}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
interface Props {
  userId: string;
  initialData: PresenceData;
}

export default function PresenceClient({ userId, initialData }: Props) {
  const [data, setData] = useState<PresenceData>(initialData);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const realtimeRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch from API ──────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (filterOverride?: FilterTab) => {
      const activeFilter = filterOverride ?? filter;
      // For spenders/vault, fetch all and filter locally
      const apiFilter =
        activeFilter === "spenders" || activeFilter === "vault" ? "all" : activeFilter;
      try {
        const res = await fetch(`/api/creator/presence?filter=${apiFilter}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PresenceData;
        setData(json);
        setLastUpdated(new Date());
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    },
    [filter]
  );

  // ── Realtime subscription ───────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`fan-presence-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fan_presence",
          filter: `creator_id=eq.${userId}`,
        },
        () => {
          // Refetch on any presence change — keeps data fresh
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fan_activity",
          filter: `creator_id=eq.${userId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    realtimeRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchData]);

  // ── Polling fallback (60s) ──────────────────────────────────────────────
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => fetchData(), 60_000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchData]);

  // ── Manual refresh ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  };

  // ── Filter logic ────────────────────────────────────────────────────────
  const filteredFans = data.fans.filter((f) => {
    if (filter === "online") return f.is_online;
    if (filter === "recent") return f.is_recent;
    if (filter === "spenders") return f.lifetime_spend > 0;
    if (filter === "vault") return f.current_page?.toLowerCase().includes("vault");
    return true;
  });

  const FILTER_TABS: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All Fans", count: data.fans.length },
    { key: "online", label: "Online Now", count: data.stats.online_now },
    { key: "recent", label: "Recently Active", count: data.stats.recently_active },
    { key: "vault", label: "Viewing Vault", count: data.stats.vault_viewers },
    { key: "spenders", label: "Spenders" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--void, #020203)",
        padding: "32px 36px",
        maxWidth: "1100px",
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-online {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "28px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              ...mono,
              fontSize: "9px",
              letterSpacing: "0.25em",
              color: "rgba(200,169,110,0.55)",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            Command Center
          </div>
          <h1
            style={{
              ...disp,
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 300,
              color: "var(--white, rgba(255,255,255,0.92))",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Live Fan Presence
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              ...mono,
              fontSize: "10px",
              color: "rgba(255,255,255,0.22)",
            }}
          >
            updated {timeAgo(lastUpdated.toISOString())}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            style={{
              ...mono,
              fontSize: "10px",
              letterSpacing: "0.14em",
              padding: "8px 14px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "4px",
              color: loading ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.48)",
              cursor: loading ? "default" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {loading ? "…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "28px",
          flexWrap: "wrap",
        }}
      >
        <StatCard
          label="Online Now"
          value={data.stats.online_now}
          accent="var(--green, #50d48a)"
        />
        <StatCard
          label="Recently Active"
          value={data.stats.recently_active}
          accent="var(--gold, #c8a96e)"
        />
        <StatCard
          label="Viewing Vault"
          value={data.stats.vault_viewers}
          accent="var(--blue, #5b8de8)"
        />
        <StatCard
          label="High Value Online"
          value={data.stats.high_value_online}
          accent="var(--amber, #e8a830)"
        />
      </div>

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            ...mono,
            fontSize: "11px",
            padding: "10px 14px",
            background: "rgba(224,85,85,0.08)",
            border: "1px solid rgba(224,85,85,0.22)",
            borderRadius: "6px",
            color: "var(--red, #e05555)",
            marginBottom: "20px",
          }}
        >
          {error} — data may be stale
        </div>
      )}

      {/* ── Main layout: fan list + activity feed ─────────────────────── */}
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        {/* ── Fan List ───────────────────────────────────────────────── */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          {/* Filter tabs */}
          <div
            style={{
              display: "flex",
              gap: "2px",
              marginBottom: "14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.055)",
              borderRadius: "7px",
              padding: "3px",
              flexWrap: "wrap",
            }}
          >
            {FILTER_TABS.map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  style={{
                    ...mono,
                    fontSize: "10px",
                    letterSpacing: "0.1em",
                    padding: "6px 11px",
                    borderRadius: "5px",
                    border: "none",
                    cursor: "pointer",
                    background: active ? "rgba(200,169,110,0.13)" : "transparent",
                    color: active ? "var(--gold, #c8a96e)" : "rgba(255,255,255,0.38)",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      style={{
                        marginLeft: "6px",
                        opacity: 0.65,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Fan table */}
          <div
            style={{
              background: "var(--card, #0f0f1e)",
              border: "1px solid rgba(255,255,255,0.055)",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "24px 1fr 120px 80px 70px",
                gap: "0 12px",
                padding: "10px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.055)",
                ...mono,
                fontSize: "9px",
                letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.22)",
                textTransform: "uppercase",
              }}
            >
              <span />
              <span>Fan</span>
              <span>Current Page</span>
              <span>Spend</span>
              <span style={{ textAlign: "right" }}>Seen</span>
            </div>

            {filteredFans.length === 0 ? (
              <div
                style={{
                  padding: "48px 16px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    ...disp,
                    fontSize: "22px",
                    fontStyle: "italic",
                    color: "rgba(255,255,255,0.18)",
                    marginBottom: "8px",
                  }}
                >
                  No fans here yet
                </div>
                <div
                  style={{
                    ...mono,
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.14)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {filter === "online"
                    ? "No fans online right now"
                    : filter === "recent"
                      ? "No fans active in the last 15 minutes"
                      : filter === "vault"
                        ? "No fans currently viewing your Vault"
                        : filter === "spenders"
                          ? "No paying fans yet"
                          : "No fan presence data yet"}
                </div>
              </div>
            ) : (
              filteredFans.map((fan) => (
                <FanRow key={fan.fan_code_id} fan={fan} />
              ))
            )}
          </div>
        </div>

        {/* ── Activity Feed ──────────────────────────────────────────── */}
        <div
          style={{
            width: "300px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: "9px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(200,169,110,0.45)",
              marginBottom: "10px",
            }}
          >
            Live Activity
          </div>

          <div
            style={{
              background: "var(--card, #0f0f1e)",
              border: "1px solid rgba(255,255,255,0.055)",
              borderRadius: "10px",
              overflow: "hidden",
              maxHeight: "520px",
              overflowY: "auto",
            }}
          >
            {data.activity.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  ...mono,
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.14)",
                  letterSpacing: "0.1em",
                }}
              >
                No activity yet
              </div>
            ) : (
              data.activity.map((evt) => (
                <ActivityItem key={evt.id} evt={evt} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Fan row ────────────────────────────────────────────────────────────────
function FanRow({ fan }: { fan: FanRow }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr 120px 80px 70px",
        gap: "0 12px",
        padding: "11px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        alignItems: "center",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {/* Online dot */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <OnlineDot online={fan.is_online} />
      </div>

      {/* Code */}
      <div>
        <span
          style={{
            ...mono,
            fontSize: "12px",
            color: fan.is_online
              ? "var(--white, rgba(255,255,255,0.92))"
              : "rgba(255,255,255,0.48)",
            letterSpacing: "0.06em",
          }}
        >
          {codeLabel(fan.code)}
        </span>
        {fan.purchase_count > 0 && (
          <span
            style={{
              ...mono,
              fontSize: "8px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              padding: "1px 5px",
              marginLeft: "7px",
              borderRadius: "2px",
              background: "rgba(200,169,110,0.1)",
              color: "var(--gold, #c8a96e)",
              border: "1px solid rgba(200,169,110,0.2)",
            }}
          >
            VIP
          </span>
        )}
      </div>

      {/* Current page */}
      <div
        style={{
          ...mono,
          fontSize: "10px",
          color: "rgba(255,255,255,0.32)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {pageLabel(fan.current_page)}
      </div>

      {/* Spend */}
      <div
        style={{
          ...mono,
          fontSize: "11px",
          color:
            fan.lifetime_spend > 0
              ? "var(--gold, #c8a96e)"
              : "rgba(255,255,255,0.18)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatAmount(fan.lifetime_spend)}
      </div>

      {/* Last seen */}
      <div
        style={{
          ...mono,
          fontSize: "10px",
          color: "rgba(255,255,255,0.22)",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {timeAgo(fan.last_seen_at)}
      </div>
    </div>
  );
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: online ? "var(--green, #50d48a)" : "rgba(255,255,255,0.12)",
        boxShadow: online ? "0 0 6px rgba(80,212,138,0.6)" : "none",
        animation: online ? "pulse-online 2.4s ease-in-out infinite" : "none",
        flexShrink: 0,
      }}
    />
  );
}

// ─── Activity item ──────────────────────────────────────────────────────────
function ActivityItem({ evt }: { evt: ActivityRow }) {
  const dotColor: Record<string, string> = {
    vault_view: "var(--blue, #5b8de8)",
    tip_click: "var(--gold, #c8a96e)",
    content_unlock: "var(--green, #50d48a)",
    checkout_open: "var(--amber, #e8a830)",
    message_open: "var(--purple, #a078e0)",
  };

  const color = dotColor[evt.activity_type] ?? "rgba(255,255,255,0.22)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "9px",
        padding: "10px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Color dot */}
      <div
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          marginTop: "4px",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
          <span
            style={{
              ...mono,
              fontSize: "11px",
              color: "rgba(255,255,255,0.65)",
              fontWeight: 500,
            }}
          >
            {codeLabel(evt.code)}
          </span>
          <span
            style={{
              ...mono,
              fontSize: "10px",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            {humanizeActivity(evt.activity_type, evt.page)}
          </span>
        </div>
        <div
          style={{
            ...mono,
            fontSize: "9px",
            color: "rgba(255,255,255,0.2)",
            marginTop: "2px",
          }}
        >
          {timeAgo(evt.created_at)}
        </div>
      </div>
    </div>
  );
}
