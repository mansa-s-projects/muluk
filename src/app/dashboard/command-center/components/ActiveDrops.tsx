"use client";

import { useState, useEffect, memo } from "react";
import { countdown, fmt } from "@/app/dashboard/_lib/helpers";
import { GOLD, G, mono, body, card } from "@/app/dashboard/_lib/tokens";
import type { Drop } from "@/app/dashboard/_lib/types";

const DropCard = memo(function DropCard({ drop }: { drop: Drop }) {
  const [, tick] = useState(0);
  const slotsLeft = drop.max_slots - drop.slots_taken;
  const pct = drop.max_slots > 0 ? (drop.slots_taken / drop.max_slots) * 100 : 0;
  const expiresIn = new Date(drop.expires_at).getTime() - Date.now();
  const isUrgent = slotsLeft <= Math.ceil(drop.max_slots * 0.2) || expiresIn < 3600000;

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      padding: "16px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      borderTop: isUrgent ? `2px solid #ef4444` : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div>
          <div style={{ ...body, fontSize: "13px", color: isUrgent ? "#ef8888" : "#fff", fontWeight: 500, marginBottom: "2px" }}>
            {drop.title}
          </div>
          <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.28)" }}>
            {countdown(drop.expires_at)} · {slotsLeft} slot{slotsLeft !== 1 ? "s" : ""} left
          </div>
        </div>
        <span style={{ ...mono, fontSize: "15px", color: GOLD, fontWeight: 300 }}>
          {fmt(drop.price)}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: "3px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden", marginTop: "10px" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: pct > 80 || isUrgent ? "#ef4444" : GOLD,
          borderRadius: "2px",
          transition: "width 0.5s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
        <span style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>
          {drop.slots_taken}/{drop.max_slots} sold
        </span>
        <span style={{ ...mono, fontSize: "9px", color: isUrgent ? "#ef4444" : "rgba(255,255,255,0.2)" }}>
          {fmt(drop.slots_taken * drop.price)} earned
        </span>
      </div>
    </div>
  );
});

interface Props {
  drops: Drop[];
  loading: boolean;
  onCreateDrop: () => void;
}

export function ActiveDrops({ drops, loading, onCreateDrop }: Props) {
  return (
    <div style={{ ...card, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)" }}>ACTIVE DROPS</span>
        <button type="button" onClick={onCreateDrop}
          style={{ ...mono, fontSize: "10px", color: GOLD, background: "rgba(200,169,110,0.08)", border: "none", borderRadius: "4px", padding: "3px 8px", cursor: "pointer", letterSpacing: "0.06em" }}>
          + NEW
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "28px", textAlign: "center", ...mono, fontSize: "10px", color: "rgba(255,255,255,0.18)", letterSpacing: "0.15em" }}>LOADING…</div>
      ) : drops.length === 0 ? (
        <div style={{ padding: "28px", textAlign: "center" }}>
          <div style={{ ...body, fontSize: "13px", color: "rgba(255,255,255,0.2)", marginBottom: "12px" }}>No active drops</div>
          <button type="button" onClick={onCreateDrop}
            style={{ padding: "8px 18px", background: GOLD, border: "none", borderRadius: "6px", color: "#0a0a0a", fontSize: "12px", fontWeight: 700, cursor: "pointer", ...mono }}>
            Launch a Drop →
          </button>
        </div>
      ) : (
        drops.map((d) => <DropCard key={d.id} drop={d} />)
      )}
    </div>
  );
}
