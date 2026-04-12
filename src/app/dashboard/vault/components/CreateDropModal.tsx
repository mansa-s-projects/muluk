"use client";

import { useState } from "react";
import { useVaultDrops } from "../hooks/useVaultDrops";
import { GOLD, mono, body } from "@/app/dashboard/_lib/tokens";

interface Props {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateDropModal({ userId, onClose, onCreated }: Props) {
  const { create } = useVaultDrops(userId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("29");
  const [slots, setSlots] = useState("10");
  const [hours, setHours] = useState("24");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceVal = parseFloat(price);
    const slotsVal = parseInt(slots, 10);
    const hoursVal = parseInt(hours, 10);
    if (isNaN(priceVal) || priceVal < 0) { setError("Enter a valid price."); return; }
    if (isNaN(slotsVal) || slotsVal < 1) { setError("Minimum 1 slot."); return; }
    if (isNaN(hoursVal) || hoursVal < 1) { setError("Minimum 1 hour."); return; }
    setSaving(true); setError("");
    const expires_at = new Date(Date.now() + hoursVal * 3_600_000).toISOString();
    const err = await create({ title, description, price: priceVal, max_slots: slotsVal, expires_at });
    setSaving(false);
    if (err) { setError(err); return; }
    onCreated();
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", background: "#111",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px",
    color: "#fff", fontSize: "13px", outline: "none",
    boxSizing: "border-box" as const, ...body,
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "grid", placeItems: "center", padding: "24px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "12px", width: "100%", maxWidth: "440px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...mono, fontSize: "11px", letterSpacing: "0.18em", color: GOLD }}>CREATE DROP</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "16px", cursor: "pointer" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", marginBottom: "6px" }}>TITLE *</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Exclusive offer…" style={inputStyle} />
          </div>
          <div>
            <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", marginBottom: "6px" }}>DESCRIPTION</div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What fans get…" style={{ ...inputStyle, resize: "none" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            {([["PRICE $", price, setPrice, "number", "0", "0.01"], ["SLOTS", slots, setSlots, "number", "1", "1"], ["HOURS", hours, setHours, "number", "1", "1"]] as const).map(([label, val, setter, type, min, step]) => (
              <div key={label}>
                <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", marginBottom: "6px" }}>{label}</div>
                <input type={type} min={min} step={step} value={val} onChange={(e) => setter(e.target.value)} style={{ ...inputStyle, ...mono }} />
              </div>
            ))}
          </div>
          {error && (
            <div style={{ ...body, fontSize: "12px", color: "#ef4444", background: "rgba(239,68,68,0.08)", borderRadius: "6px", padding: "8px 12px" }}>{error}</div>
          )}
          <button type="submit" disabled={saving || !title.trim()}
            style={{ padding: "12px", background: saving || !title.trim() ? "rgba(200,169,110,0.3)" : GOLD, border: "none", borderRadius: "7px", color: "#0a0a0a", fontSize: "12px", fontWeight: 700, cursor: saving || !title.trim() ? "not-allowed" : "pointer", ...mono, letterSpacing: "0.06em" }}>
            {saving ? "Creating…" : "LAUNCH DROP"}
          </button>
        </form>
      </div>
    </div>
  );
}
