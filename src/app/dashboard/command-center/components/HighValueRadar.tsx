"use client";

import { useEffect, memo } from "react";
import { useRouter } from "next/navigation";
import { fmt, timeAgo } from "@/app/dashboard/_lib/helpers";
import { GOLD, G, mono, body, card } from "@/app/dashboard/_lib/tokens";
import type { Member, RadarTab } from "@/app/dashboard/_lib/types";

const TABS: { key: RadarTab; label: string }[] = [
  { key: "top_spenders",   label: "Top Spenders" },
  { key: "most_active",    label: "Most Active" },
  { key: "at_risk",        label: "At Risk" },
  { key: "likely_convert", label: "Likely to Buy" },
];

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const STATUS_COLOR: Record<string, string> = {
  hot:     "#ef4444",
  warm:    G,
  at_risk: "#f97316",
  cold:    "rgba(255,255,255,0.2)",
};

const MemberRow = memo(function MemberRow({ member, onMessage, onOffer }: {
  member: Member;
  onMessage: (id: string) => void;
  onOffer: (id: string) => void;
}) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.12s" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: "rgba(200,169,110,0.1)",
        border: "1px solid rgba(200,169,110,0.2)",
        display: "grid", placeItems: "center", flexShrink: 0,
        ...{ fontFamily: "var(--font-mono, 'DM Mono', monospace)" },
        fontSize: 10, color: GOLD, overflow: "hidden",
      }}>
        {member.avatar_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={member.avatar_url} alt={member.display_name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : initials(member.display_name)
        }
      </div>

      {/* Name + status dot */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "1px" }}>
          <span style={{ ...{ fontFamily: "var(--font-body, 'Outfit', sans-serif)" }, fontSize: "12px", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {member.display_name ?? "Anonymous"}
          </span>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_COLOR[member.status], flexShrink: 0, display: "inline-block" }} />
        </div>
        <div style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>
          {timeAgo(member.last_active_at)}
        </div>
      </div>

      {/* Spend */}
      <span style={{ ...mono, fontSize: "12px", color: GOLD, fontWeight: 300, flexShrink: 0 }}>
        {fmt(member.total_spent)}
      </span>

      {/* Inline actions */}
      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
        <button type="button" onClick={() => onMessage(member.fan_id)}
          style={{ padding: "4px 8px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "rgba(255,255,255,0.45)", fontSize: "10px", cursor: "pointer", ...body }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)"; e.currentTarget.style.color = GOLD; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
        >
          Msg
        </button>
        <button type="button" onClick={() => onOffer(member.fan_id)}
          style={{ padding: "4px 8px", background: GOLD, border: "none", borderRadius: "4px", color: "#0a0a0a", fontSize: "10px", fontWeight: 700, cursor: "pointer", ...mono }}
        >
          Offer
        </button>
      </div>
    </div>
  );
});

interface Props {
  tab: RadarTab;
  data: Member[];
  loading: boolean;
  onTabChange: (t: RadarTab) => void;
}

export function HighValueRadar({ tab, data, loading, onTabChange }: Props) {
  const router = useRouter();

  const handleMessage = (fanId: string) => router.push(`/dashboard/direct-line?to=${fanId}`);
  const handleOffer   = (fanId: string) => router.push(`/dashboard/direct-line?to=${fanId}&offer=1`);

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column" }}>
      {/* Header + tabs */}
      <div style={{ padding: "14px 16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)", display: "block", marginBottom: "12px" }}>
          HIGH-VALUE RADAR
        </span>
        <div style={{ display: "flex", gap: "0" }}>
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => onTabChange(t.key)}
              style={{
                padding: "7px 12px",
                background: tab === t.key ? "rgba(200,169,110,0.08)" : "transparent",
                border: "none",
                borderBottom: `2px solid ${tab === t.key ? GOLD : "transparent"}`,
                color: tab === t.key ? GOLD : "rgba(255,255,255,0.35)",
                fontSize: "11px", cursor: "pointer", ...body,
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", ...mono, fontSize: "10px", color: "rgba(255,255,255,0.18)", letterSpacing: "0.15em" }}>LOADING…</div>
        ) : data.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", ...body, fontSize: "13px", color: "rgba(255,255,255,0.2)" }}>No members yet</div>
        ) : (
          data.map((m) => <MemberRow key={m.fan_id} member={m} onMessage={handleMessage} onOffer={handleOffer} />)
        )}
      </div>
    </div>
  );
}
