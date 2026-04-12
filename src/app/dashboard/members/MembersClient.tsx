"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { useMembers } from "./hooks/useMembers";
import { fmt, timeAgo } from "@/app/dashboard/_lib/helpers";
import { GOLD, G, mono, body } from "@/app/dashboard/_lib/tokens";
import type { Member, BehaviorStatus, ChurnLabel, FilterTab } from "@/app/dashboard/_lib/types";

// ─── Avatar ───────────────────────────────────────────────────────────────────
function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function Avatar({ name, url, size = 36 }: { name: string | null; url: string | null; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: url ? "transparent" : "rgba(200,169,110,0.1)",
      border: "1px solid rgba(200,169,110,0.18)",
      display: "grid", placeItems: "center", flexShrink: 0, overflow: "hidden",
      ...mono, fontSize: size * 0.33, color: GOLD,
    }}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt={name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initials(name)
      }
    </div>
  );
}

const STATUS_CFG: Record<BehaviorStatus, { color: string; bg: string; label: string }> = {
  hot:     { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   label: "HOT" },
  warm:    { color: G,         bg: "rgba(200,169,110,0.1)", label: "WARM" },
  at_risk: { color: "#f97316", bg: "rgba(249,115,22,0.1)",  label: "AT RISK" },
  cold:    { color: "rgba(255,255,255,0.25)", bg: "rgba(255,255,255,0.05)", label: "COLD" },
};

const CHURN_COLOR: Record<ChurnLabel, string> = {
  healthy:  "rgba(34,197,94,0.7)",
  cooling:  "rgba(249,115,22,0.7)",
  silent:   "#ef4444",
  churning: "#ef4444",
};

function StatusBadge({ status }: { status: BehaviorStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.cold;
  return (
    <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.12em", color: cfg.color, background: cfg.bg, padding: "3px 7px", borderRadius: "4px", fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

// ─── Member card ──────────────────────────────────────────────────────────────
const MemberCard = memo(function MemberCard({
  member, onMessage, onOffer, onTagVip,
}: {
  member: Member;
  onMessage: (id: string) => void;
  onOffer: (id: string) => void;
  onTagVip: (id: string) => void;
}) {
  const isVip = member.tier === "vip";
  const churnLabel = member.churn_label;
  const showChurn = churnLabel && churnLabel !== "healthy";

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "44px 1fr auto auto auto auto", alignItems: "center", gap: "14px", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Avatar name={member.display_name} url={member.avatar_url} />

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
          <span style={{ ...body, fontSize: "14px", color: "#fff", fontWeight: 500 }}>
            {member.display_name ?? "Anonymous"}
          </span>
          <StatusBadge status={member.status} />
          {isVip && (
            <span style={{ ...mono, fontSize: "8px", color: GOLD, letterSpacing: "0.12em" }}>◈ VIP</span>
          )}
          {showChurn && (
            <span style={{ ...mono, fontSize: "8px", color: CHURN_COLOR[churnLabel!], letterSpacing: "0.1em", opacity: 0.85 }}>
              {churnLabel!.toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.28)", letterSpacing: "0.05em" }}>
          {member.purchase_count} purchase{member.purchase_count !== 1 ? "s" : ""} · {timeAgo(member.last_active_at)}
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div style={{ ...mono, fontSize: "15px", color: GOLD, fontWeight: 300 }}>{fmt(member.total_spent)}</div>
        <div style={{ ...body, fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>total spent</div>
      </div>

      <button type="button" onClick={() => onMessage(member.fan_id)}
        style={{ padding: "7px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "rgba(255,255,255,0.5)", fontSize: "12px", cursor: "pointer", ...body, whiteSpace: "nowrap", transition: "all 0.15s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)"; e.currentTarget.style.color = GOLD; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
      >
        Message
      </button>

      <button type="button" onClick={() => onOffer(member.fan_id)}
        style={{ padding: "7px 14px", background: GOLD, border: "none", borderRadius: "6px", color: "#0a0a0a", fontSize: "12px", fontWeight: 600, cursor: "pointer", ...mono, whiteSpace: "nowrap" }}>
        Send Offer
      </button>

      <button type="button" onClick={() => onTagVip(member.fan_id)}
        title={isVip ? "Already VIP" : "Tag as VIP"}
        style={{ padding: "7px 10px", background: isVip ? "rgba(200,169,110,0.1)" : "transparent", border: `1px solid ${isVip ? "rgba(200,169,110,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: "6px", color: isVip ? GOLD : "rgba(255,255,255,0.3)", fontSize: "12px", cursor: isVip ? "default" : "pointer", whiteSpace: "nowrap", ...mono, transition: "all 0.15s" }}>
        ◈
      </button>
    </div>
  );
});

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const TABS: { key: FilterTab; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "hot",     label: "VIP / Hot" },
  { key: "warm",    label: "Active" },
  { key: "at_risk", label: "At Risk" },
  { key: "cold",    label: "Cold" },
];

// ─── Main export ──────────────────────────────────────────────────────────────
export default function MembersClient({ userId }: { userId: string }) {
  const router = useRouter();
  const { members, loading, search, setSearch, filter, setFilter, totalSpent, tagVip } = useMembers(userId);

  const handleMessage = (fanId: string) => router.push(`/dashboard/direct-line?to=${fanId}`);
  const handleOffer   = (fanId: string) => router.push(`/dashboard/direct-line?to=${fanId}&offer=1`);

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h1 style={{ ...mono, fontSize: "11px", letterSpacing: "0.22em", color: GOLD, margin: "0 0 4px" }}>MEMBERS</h1>
          <p style={{ ...body, fontSize: "13px", color: "rgba(255,255,255,0.3)", margin: 0 }}>
            {members.length} members · {fmt(totalSpent)} total revenue
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <input
            type="text"
            placeholder="Search members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 14px 10px 36px", background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box", ...body }}
          />
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", fontSize: "14px", pointerEvents: "none" }}>◎</span>
        </div>

        <div style={{ display: "flex", background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", overflow: "hidden" }}>
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setFilter(t.key)}
              style={{ padding: "8px 16px", background: filter === t.key ? "rgba(200,169,110,0.1)" : "transparent", border: "none", borderRight: "1px solid rgba(255,255,255,0.06)", color: filter === t.key ? GOLD : "rgba(255,255,255,0.4)", fontSize: "12px", cursor: "pointer", ...body, fontWeight: filter === t.key ? 500 : 400, transition: "all 0.15s", whiteSpace: "nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div style={{ display: "grid", gridTemplateColumns: "44px 1fr auto auto auto auto", gap: "14px", padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {["", "MEMBER", "SPENT", "", "", ""].map((h, i) => (
          <div key={i} style={{ ...mono, fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.2)", textAlign: i >= 2 ? "right" : "left" }}>{h}</div>
        ))}
      </div>

      {/* Member list */}
      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "rgba(255,255,255,0.2)", ...mono, fontSize: "11px", letterSpacing: "0.15em" }}>LOADING…</div>
        ) : members.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "rgba(255,255,255,0.2)", ...body, fontSize: "14px" }}>
            {search || filter !== "all" ? "No members match your filters" : "No members yet"}
          </div>
        ) : (
          members.map((m) => (
            <MemberCard key={m.fan_id} member={m} onMessage={handleMessage} onOffer={handleOffer} onTagVip={tagVip} />
          ))
        )}
      </div>
    </div>
  );
}
