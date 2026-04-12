"use client";

import { useMemo } from "react";
import { timeAgo } from "@/app/dashboard/_lib/helpers";
import { GOLD, G, mono, body, card } from "@/app/dashboard/_lib/tokens";
import type { FeedEvent } from "@/app/dashboard/_lib/types";

const EVENT_LABELS: Record<string, { icon: string; label: (m: Record<string, unknown>) => string }> = {
  purchase: { icon: "◈", label: (m) => `Purchased ${String(m.drop_title ?? "a drop")}` },
  message:  { icon: "◎", label: () => "Sent a message" },
  view:     { icon: "◉", label: () => "Viewed your page" },
  login:    { icon: "◍", label: () => "Logged in" },
  drop_click: { icon: "▲", label: (m) => `Clicked ${String(m.drop_title ?? "a drop")}` },
  open_asset: { icon: "◈", label: (m) => `Opened ${String(m.asset_name ?? "an asset")}` },
};

function FeedItem({ item, onClick }: { item: FeedEvent; onClick: (item: FeedEvent) => void }) {
  const cfg = EVENT_LABELS[item.type] ?? { icon: "·", label: () => item.type };
  const isPurchase = item.type === "purchase";

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      style={{
        width: "100%", textAlign: "left",
        display: "flex", alignItems: "center", gap: "12px",
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)",
        cursor: "pointer", transition: "background 0.12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ ...mono, fontSize: "14px", color: isPurchase ? GOLD : "rgba(255,255,255,0.25)", flexShrink: 0 }}>
        {cfg.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...body, fontSize: "12px", color: isPurchase ? "#fff" : "rgba(255,255,255,0.6)", fontWeight: isPurchase ? 500 : 400 }}>
          {cfg.label(item.metadata)}
        </div>
        <div style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)", marginTop: "1px" }}>
          {timeAgo(item.created_at)}
        </div>
      </div>
      {isPurchase && (
        <span style={{ ...mono, fontSize: "11px", color: GOLD, flexShrink: 0 }}>
          {String(item.metadata.amount ?? "")}
        </span>
      )}
    </button>
  );
}

interface Props {
  feed: FeedEvent[];
  loading: boolean;
  onItemClick?: (item: FeedEvent) => void;
}

export function LiveActivityFeed({ feed, loading, onItemClick }: Props) {
  const handleClick = useMemo(() => onItemClick ?? (() => {}), [onItemClick]);

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)" }}>LIVE ACTIVITY</span>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", ...mono, fontSize: "10px", color: "rgba(255,255,255,0.18)", letterSpacing: "0.15em" }}>LOADING…</div>
        ) : feed.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", ...body, fontSize: "13px", color: "rgba(255,255,255,0.2)" }}>No activity yet</div>
        ) : (
          feed.map((item) => <FeedItem key={item.id} item={item} onClick={handleClick} />)
        )}
      </div>
    </div>
  );
}
