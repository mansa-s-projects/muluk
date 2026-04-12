"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmt, timeAgo, dateLabel } from "@/app/dashboard/_lib/helpers";
import { GOLD, G, mono, body } from "@/app/dashboard/_lib/tokens";
import type { Conversation, BehaviorStatus, ChurnLabel } from "@/app/dashboard/_lib/types";

interface FanDetails {
  total_spent: number;
  purchase_count: number;
  last_purchase_at: string | null;
  joined_at: string | null;
  status: BehaviorStatus;
  churn_label: ChurnLabel | null;
  score: number;
  tier: string | null;
}

const STATUS_CONFIG: Record<BehaviorStatus, { color: string; bg: string; label: string }> = {
  hot:     { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   label: "HOT — High Value" },
  warm:    { color: G,         bg: "rgba(200,169,110,0.08)", label: "WARM — Active" },
  at_risk: { color: "#f97316", bg: "rgba(249,115,22,0.08)",  label: "AT RISK — Cooling" },
  cold:    { color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", label: "COLD — Inactive" },
};

const CHURN_CONFIG: Record<ChurnLabel, { color: string; label: string }> = {
  healthy:  { color: "rgba(34,197,94,0.7)",  label: "Healthy engagement" },
  cooling:  { color: "rgba(249,115,22,0.8)", label: "Engagement cooling" },
  silent:   { color: "#ef4444",              label: "Gone silent" },
  churning: { color: "#ef4444",              label: "Churning" },
};

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ ...mono, fontSize: "8px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.2)", marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ ...mono, fontSize: "15px", color: gold ? GOLD : "#fff", fontWeight: 300 }}>{value}</div>
    </div>
  );
}

interface Props {
  conv: Conversation;
  userId: string;
  onSendOffer: () => void;
}

export function FanContext({ conv, userId, onSendOffer }: Props) {
  const supabase = createClient();
  const [details, setDetails] = useState<FanDetails | null>(null);

  useEffect(() => {
    async function load() {
      // NOTE: behavior_scores uses fan_id (not user_id) — corrected column name
      const [scoreRes, memRes, purchaseRes] = await Promise.allSettled([
        supabase
          .from("behavior_scores")
          .select("status, churn_label, score")
          .eq("creator_id", userId)
          .eq("fan_id", conv.fan_id)
          .maybeSingle(),
        supabase
          .from("memberships")
          .select("total_spent, purchase_count, joined_at, tier")
          .eq("creator_id", userId)
          .eq("fan_id", conv.fan_id)
          .maybeSingle(),
        supabase
          .from("purchases")
          .select("completed_at")
          .eq("creator_id", userId)
          .eq("fan_id", conv.fan_id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1),
      ]);

      const score = scoreRes.status   === "fulfilled" ? scoreRes.value.data   : null;
      const mem   = memRes.status     === "fulfilled" ? memRes.value.data     : null;
      const last  = purchaseRes.status === "fulfilled" ? purchaseRes.value.data : null;

      setDetails({
        total_spent:      mem?.total_spent    ?? conv.total_spent,
        purchase_count:   mem?.purchase_count ?? 0,
        last_purchase_at: last?.[0]?.completed_at ?? null,
        joined_at:        mem?.joined_at      ?? null,
        status:           (score?.status as BehaviorStatus) ?? conv.status,
        churn_label:      (score?.churn_label as ChurnLabel) ?? null,
        score:            score?.score ?? 0,
        tier:             mem?.tier    ?? null,
      });
    }
    load();
  }, [conv.fan_id, userId, supabase, conv.total_spent, conv.status]);

  const status = details?.status ?? conv.status;
  const cfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.cold;
  const churnCfg = details?.churn_label ? CHURN_CONFIG[details.churn_label] : null;

  return (
    <div style={{
      width: "220px", flexShrink: 0,
      borderLeft: "1px solid rgba(255,255,255,0.06)",
      padding: "20px 16px",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Fan identity */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(200,169,110,0.1)",
          border: "1px solid rgba(200,169,110,0.2)",
          display: "grid", placeItems: "center",
          ...mono, fontSize: 14, color: GOLD,
          overflow: "hidden", marginBottom: "10px",
        }}>
          {conv.avatar_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={conv.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (conv.display_name?.[0]?.toUpperCase() ?? "?")}
        </div>

        <div style={{ ...body, fontSize: "13px", color: "#fff", fontWeight: 500, marginBottom: "6px" }}>
          {conv.display_name ?? "Anonymous"}
        </div>

        <div style={{
          ...mono, fontSize: "9px", letterSpacing: "0.12em",
          color: cfg.color, background: cfg.bg,
          padding: "3px 7px", borderRadius: "4px",
          display: "inline-block", marginBottom: "4px",
        }}>
          {cfg.label}
        </div>

        {churnCfg && details?.churn_label !== "healthy" && (
          <div style={{ ...mono, fontSize: "8px", color: churnCfg.color, marginTop: "4px", letterSpacing: "0.1em" }}>
            ◑ {churnCfg.label}
          </div>
        )}

        {details?.tier === "vip" && (
          <div style={{ ...mono, fontSize: "9px", color: GOLD, marginTop: "4px", letterSpacing: "0.1em" }}>
            ◈ VIP
          </div>
        )}
      </div>

      {/* Stats */}
      <div>
        <Stat label="TOTAL SPENT"    value={fmt(details?.total_spent ?? conv.total_spent)} gold />
        <Stat label="PURCHASES"      value={String(details?.purchase_count ?? 0)} />
        {details?.last_purchase_at && (
          <Stat label="LAST PURCHASE" value={timeAgo(details.last_purchase_at)} />
        )}
        {details?.joined_at && (
          <Stat label="MEMBER SINCE"  value={dateLabel(details.joined_at)} />
        )}
        {details && (
          <Stat label="BEHAVIOR SCORE" value={String(details.score)} />
        )}
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <button type="button" onClick={onSendOffer}
          style={{ padding: "9px 12px", background: GOLD, border: "none", borderRadius: "6px", color: "#0a0a0a", fontSize: "11px", fontWeight: 700, cursor: "pointer", ...mono, letterSpacing: "0.06em" }}>
          + SEND OFFER
        </button>
        <a
          href="/dashboard/members"
          style={{ display: "block", padding: "9px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "rgba(255,255,255,0.4)", fontSize: "11px", cursor: "pointer", ...body, textAlign: "center", textDecoration: "none" }}
        >
          View in Members
        </a>
      </div>
    </div>
  );
}
