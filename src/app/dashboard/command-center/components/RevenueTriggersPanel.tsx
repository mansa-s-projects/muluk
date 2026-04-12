"use client";

import Link from "next/link";
import { GOLD, mono, body, card } from "@/app/dashboard/_lib/tokens";
import type { RevenueTrigger } from "@/app/dashboard/_lib/types";

const CTA_MAP: Record<string, { label: string; href: string; urgent: boolean }> = {
  drop_expiring:     { label: "Go →",     href: "/dashboard/vault",       urgent: true  },
  hot_member_online: { label: "Message",  href: "/dashboard/direct-line", urgent: false },
  at_risk_vip:       { label: "Re-engage",href: "/dashboard/members",     urgent: true  },
  best_day_gap:      { label: "Go →",     href: "/dashboard/direct-line", urgent: false },
  likely_to_convert: { label: "Message",  href: "/dashboard/direct-line", urgent: false },
  unread_messages:   { label: "Reply",    href: "/dashboard/direct-line", urgent: false },
  no_active_drop:    { label: "Create",   href: "/dashboard/vault",       urgent: false },
  no_recent_content: { label: "Upload",   href: "/dashboard/vault",       urgent: false },
};

function SignalCard({ trigger }: { trigger: RevenueTrigger }) {
  const cta = CTA_MAP[trigger.trigger_type] ?? {
    label: "Go →",
    href: "/dashboard",
    urgent: false,
  };
  return (
    <div style={{
      padding: "16px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      alignItems: "center",
      gap: "14px",
    }}>
      <div style={{
        width: 4,
        alignSelf: "stretch",
        borderRadius: "4px",
        background: cta.urgent ? "#ef4444" : GOLD,
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...body, fontSize: "13px", color: "#fff", fontWeight: 500, marginBottom: "2px" }}>
          {trigger.message}
        </div>
        {trigger.expires_at && (
          <div style={{ ...body, fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
            Expires {new Date(trigger.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
      <Link
        href={cta.href}
        style={{
          display: "inline-flex", alignItems: "center",
          background: GOLD, color: "#0a0a0a", border: "none", borderRadius: "6px",
          padding: "6px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
          letterSpacing: "0.04em", textDecoration: "none", whiteSpace: "nowrap", ...mono,
        }}
      >
        {cta.label}
      </Link>
    </div>
  );
}

interface Props {
  triggers: RevenueTrigger[];
}

export function RevenueTriggersPanel({ triggers }: Props) {
  const active = triggers.filter(
    (t) => t.expires_at === null || new Date(t.expires_at) > new Date()
  );

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "16px 18px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)" }}>
          REVENUE SIGNALS
        </span>
        <span style={{
          ...mono, fontSize: "9px", color: GOLD,
          background: "rgba(200,169,110,0.08)", padding: "3px 7px", borderRadius: "4px",
        }}>
          {active.length} signal{active.length !== 1 ? "s" : ""}
        </span>
      </div>

      {active.map((t) => <SignalCard key={t.id} trigger={t} />)}

      {active.length === 0 && (
        <div style={{
          padding: "32px 18px",
          textAlign: "center",
          color: "rgba(255,255,255,0.2)",
          ...body,
          fontSize: "13px",
        }}>
          All clear — no urgent signals
        </div>
      )}
    </div>
  );
}
