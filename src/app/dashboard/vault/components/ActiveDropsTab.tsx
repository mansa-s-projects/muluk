"use client";

import { useState, useEffect, memo } from "react";
import { useVaultDrops } from "../hooks/useVaultDrops";
import { CreateDropModal } from "./CreateDropModal";
import { countdown, fmt, timeAgo, dateLabel } from "@/app/dashboard/_lib/helpers";
import { GOLD, G, mono, body } from "@/app/dashboard/_lib/tokens";
import type { Drop } from "@/app/dashboard/_lib/types";
import type { DropSocialProof } from "../hooks/useVaultDrops";

// ─── Social Proof Badge ───────────────────────────────────────────────────────
function SocialProofBadge({ proof }: { proof: DropSocialProof | undefined }) {
  if (!proof || (!proof.viewersNow && !proof.lastPurchaseAt)) return null;
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
      {proof.viewersNow > 0 && (
        <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.1em", color: "#22c55e", background: "rgba(34,197,94,0.08)", padding: "3px 8px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
          {proof.viewersNow} viewing now
        </span>
      )}
      {proof.lastPurchaseAt && (
        <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.1em", color: GOLD, background: "rgba(200,169,110,0.08)", padding: "3px 8px", borderRadius: "4px" }}>
          Last purchased {timeAgo(proof.lastPurchaseAt)}
        </span>
      )}
    </div>
  );
}

// ─── Active Drop Card ─────────────────────────────────────────────────────────
const ActiveDropCard = memo(function ActiveDropCard({
  drop, proof, onDeactivate,
}: {
  drop: Drop;
  proof: DropSocialProof | undefined;
  onDeactivate: (id: string) => void;
}) {
  const [, tick] = useState(0);
  const slotsLeft = drop.max_slots - drop.slots_taken;
  const pct = drop.max_slots > 0 ? (drop.slots_taken / drop.max_slots) * 100 : 0;
  const expiresIn = new Date(drop.expires_at).getTime() - Date.now();
  const isUrgent = slotsLeft <= Math.ceil(drop.max_slots * 0.2) || expiresIn < 3_600_000;

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: "#111", border: `1px solid ${isUrgent ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: "10px", padding: "22px", position: "relative", overflow: "hidden" }}>
      {isUrgent && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #ef4444, transparent)" }} />
      )}
      <SocialProofBadge proof={proof} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
        <div>
          <h3 style={{ ...body, fontSize: "15px", color: "#fff", fontWeight: 500, margin: "0 0 4px" }}>{drop.title}</h3>
          {drop.description && <p style={{ ...body, fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: 0 }}>{drop.description}</p>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
          <div style={{ ...mono, fontSize: "22px", color: GOLD, fontWeight: 300 }}>{fmt(drop.price)}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginBottom: "3px" }}>EXPIRES</div>
          <div style={{ ...mono, fontSize: "13px", color: isUrgent ? "#ef4444" : GOLD }}>{countdown(drop.expires_at)}</div>
        </div>
        <div>
          <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginBottom: "3px" }}>SLOTS LEFT</div>
          <div style={{ ...mono, fontSize: "13px", color: slotsLeft < 3 ? "#ef4444" : "#fff" }}>{slotsLeft} / {drop.max_slots}</div>
        </div>
        <div>
          <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginBottom: "3px" }}>REVENUE</div>
          <div style={{ ...mono, fontSize: "13px", color: GOLD }}>{fmt(drop.slots_taken * drop.price)}</div>
        </div>
      </div>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct > 80 ? "#ef4444" : GOLD, borderRadius: "4px", transition: "width 0.5s ease" }} />
        </div>
        <div style={{ ...body, fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "4px" }}>{Math.round(pct)}% sold</div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button"
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/drops/${drop.id}`)}
          style={{ flex: 1, padding: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "rgba(255,255,255,0.4)", fontSize: "11px", cursor: "pointer", ...mono, letterSpacing: "0.06em", transition: "all 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
        >
          COPY LINK
        </button>
        <button type="button" onClick={() => onDeactivate(drop.id)}
          style={{ padding: "8px 14px", background: "transparent", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", color: "rgba(239,68,68,0.5)", fontSize: "11px", cursor: "pointer", ...mono, letterSpacing: "0.06em", transition: "all 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "#ef4444"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(239,68,68,0.5)"; }}
        >
          END
        </button>
      </div>
    </div>
  );
});

// ─── Past Drop Row ────────────────────────────────────────────────────────────
function PastDropRow({ drop }: { drop: Drop }) {
  const fillRate = drop.max_slots > 0 ? Math.round((drop.slots_taken / drop.max_slots) * 100) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", alignItems: "center", gap: "20px", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div>
        <div style={{ ...body, fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>{drop.title}</div>
        <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "2px" }}>{dateLabel(drop.created_at)}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ ...mono, fontSize: "13px", color: GOLD }}>{fmt(drop.slots_taken * drop.price)}</div>
        <div style={{ ...body, fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>revenue</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ ...mono, fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{drop.slots_taken}/{drop.max_slots}</div>
        <div style={{ ...body, fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>slots</div>
      </div>
      <div>
        <div style={{ ...mono, fontSize: "11px", color: fillRate === 100 ? GOLD : "rgba(255,255,255,0.3)", background: fillRate === 100 ? "rgba(200,169,110,0.1)" : "rgba(255,255,255,0.04)", padding: "4px 8px", borderRadius: "4px" }}>
          {fillRate}%
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ActiveDropsTab({ userId }: { userId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const { activeDrops, pastDrops, socialProof, loading, deactivate } = useVaultDrops(userId);

  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Sub-header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <p style={{ ...body, fontSize: "13px", color: "rgba(255,255,255,0.3)", margin: 0 }}>
          {activeDrops.length} active · {pastDrops.length} completed
        </p>
        <button type="button" onClick={() => setShowCreate(true)}
          style={{ padding: "10px 20px", background: GOLD, border: "none", borderRadius: "7px", color: "#0a0a0a", fontSize: "12px", fontWeight: 700, cursor: "pointer", ...mono, letterSpacing: "0.06em" }}>
          + CREATE DROP
        </button>
      </div>

      {/* Active drops */}
      {loading ? (
        <div style={{ padding: "48px", textAlign: "center", ...mono, fontSize: "11px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em" }}>LOADING…</div>
      ) : activeDrops.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "60px", textAlign: "center", marginBottom: "32px" }}>
          <div style={{ ...mono, fontSize: "24px", color: "rgba(200,169,110,0.2)", marginBottom: "12px" }}>▲</div>
          <p style={{ ...body, fontSize: "14px", color: "rgba(255,255,255,0.2)", marginBottom: "20px" }}>No active drops</p>
          <button type="button" onClick={() => setShowCreate(true)}
            style={{ padding: "10px 24px", background: GOLD, border: "none", borderRadius: "7px", color: "#0a0a0a", fontSize: "13px", fontWeight: 700, cursor: "pointer", ...mono }}>
            Launch Your First Drop →
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {activeDrops.map((d) => (
            <ActiveDropCard key={d.id} drop={d} proof={socialProof[d.id]} onDeactivate={deactivate} />
          ))}
        </div>
      )}

      {/* Past drops */}
      {pastDrops.length > 0 && (
        <div>
          <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.2)", marginBottom: "12px" }}>PAST DROPS</div>
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "20px", padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["DROP", "REVENUE", "SLOTS", "FILL"].map((h) => (
                <div key={h} style={{ ...mono, fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.2)" }}>{h}</div>
              ))}
            </div>
            {pastDrops.map((d) => <PastDropRow key={d.id} drop={d} />)}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateDropModal userId={userId} onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />
      )}
    </div>
  );
}
