"use client";

import { useState } from "react";
import type { AvailabilitySlot } from "@/lib/bookings";
import { fmtDate, fmtTime, fmtUSD } from "@/lib/bookings";

interface Props {
  creatorId: string;
  handle:    string;
  slots:     AvailabilitySlot[];
}

const DURATIONS = [30, 45, 60, 90, 120];

const inputStyle: React.CSSProperties = {
  background:   "rgba(255,255,255,0.03)",
  border:       "1px solid rgba(255,255,255,0.09)",
  borderRadius: 3,
  color:        "rgba(255,255,255,0.92)",
  fontFamily:   "var(--font-body,'Outfit',sans-serif)",
  fontSize:     13,
  fontWeight:   300,
  padding:      "10px 14px",
  outline:      "none",
  width:        "100%",
  boxSizing:    "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily:    "var(--font-mono,'DM Mono',monospace)",
  fontSize:      9,
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  color:         "rgba(255,255,255,0.35)",
  display:       "block",
  marginBottom:  6,
};

export default function AvailabilityClient({ creatorId, handle, slots: initialSlots }: Props) {
  const [slots,     setSlots]     = useState<AvailabilitySlot[]>(initialSlots);
  const [date,      setDate]      = useState("");
  const [time,      setTime]      = useState("10:00");
  const [duration,  setDuration]  = useState(60);
  const [priceDol,  setPriceDol]  = useState("150");
  const [meetLink,  setMeetLink]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error,     setError]     = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const price = parseInt(priceDol, 10);
    if (!date || !time || isNaN(price) || price < 1) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/bookings/slots", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          slot_date:        date,
          start_time:       time,
          duration_minutes: duration,
          price_cents:      price * 100,
          meeting_link:     meetLink.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to add slot");
      }
      const { slot } = await res.json();
      setSlots((s) => [...s, slot].sort((a, b) =>
        a.slot_date.localeCompare(b.slot_date) || a.start_time.localeCompare(b.start_time)
      ));
      setDate("");
      setMeetLink("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/dashboard/bookings/slots/${id}`, { method: "DELETE" });
      setSlots((s) => s.filter((slot) => slot.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const availableSlots = slots.filter((s) => !s.is_booked && s.is_active);
  const bookedSlots    = slots.filter((s) => s.is_booked);

  return (
    <div>
      {/* ── Add slot form ── */}
      <div
        style={{
          background:   "#0f0f1e",
          border:       "1px solid rgba(255,255,255,0.055)",
          borderRadius: 10,
          padding:      "24px",
          marginBottom: 20,
          position:     "relative",
        }}
      >
        {/* Top shimmer */}
        <div
          style={{
            position:   "absolute",
            top:        0,
            left:       "10%",
            right:      "10%",
            height:     1,
            background: "linear-gradient(90deg,transparent,rgba(200,169,110,0.3),transparent)",
          }}
        />

        <h2
          style={{
            fontFamily:   "var(--font-display,'Cormorant Garamond',serif)",
            fontSize:     20,
            fontWeight:   400,
            margin:       "0 0 20px",
            letterSpacing: "-0.01em",
          }}
        >
          Add Availability Slot
        </h2>

        <form onSubmit={handleAdd}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Date */}
            <div>
              <label style={labelStyle}>Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
                style={{
                  ...inputStyle,
                  colorScheme: "dark",
                }}
              />
            </div>

            {/* Time */}
            <div>
              <label style={labelStyle}>Start Time *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                style={{ ...inputStyle, colorScheme: "dark" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Duration */}
            <div>
              <label style={labelStyle}>Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d} style={{ background: "#0f0f1e" }}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label style={labelStyle}>Price (USD) *</label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position:  "absolute",
                    left:      14,
                    top:       "50%",
                    transform: "translateY(-50%)",
                    color:     "rgba(255,255,255,0.3)",
                    fontSize:  13,
                    pointerEvents: "none",
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={priceDol}
                  onChange={(e) => setPriceDol(e.target.value)}
                  min="1"
                  max="10000"
                  required
                  style={{ ...inputStyle, paddingLeft: 26 }}
                />
              </div>
            </div>
          </div>

          {/* Meeting link */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Meeting Link (optional)</label>
            <input
              type="url"
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="https://zoom.us/j/..."
              style={inputStyle}
            />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", fontWeight: 300, marginTop: 4, display: "block" }}>
              Revealed to fan only after payment
            </span>
          </div>

          {error && (
            <div
              style={{
                fontSize:  12,
                color:     "#e05555",
                marginBottom: 14,
                padding:   "8px 12px",
                background: "rgba(224,85,85,0.08)",
                borderRadius: 3,
                border:    "1px solid rgba(224,85,85,0.2)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              width:         "100%",
              background:    saving ? "rgba(200,169,110,0.4)" : "#c8a96e",
              color:         "#0a0800",
              border:        "none",
              borderRadius:  3,
              padding:       "12px",
              fontFamily:    "var(--font-mono,'DM Mono',monospace)",
              fontSize:      10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor:        saving ? "not-allowed" : "pointer",
              transition:    "opacity 0.2s",
            }}
          >
            {saving ? "Adding…" : "Add Slot"}
          </button>
        </form>
      </div>

      {/* ── Available slots list ── */}
      {availableSlots.length > 0 && (
        <div
          style={{
            background:   "#0f0f1e",
            border:       "1px solid rgba(255,255,255,0.055)",
            borderRadius: 10,
            padding:      "20px 24px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily:    "var(--font-mono,'DM Mono',monospace)",
              fontSize:      9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color:         "#7a6030",
              marginBottom:  16,
            }}
          >
            Available Slots — {availableSlots.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {availableSlots.map((slot) => (
              <SlotRow
                key={slot.id}
                slot={slot}
                isDeleting={deletingId === slot.id}
                onDelete={() => handleDelete(slot.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Booked slots ── */}
      {bookedSlots.length > 0 && (
        <div
          style={{
            background:   "#0f0f1e",
            border:       "1px solid rgba(255,255,255,0.055)",
            borderRadius: 10,
            padding:      "20px 24px",
          }}
        >
          <div
            style={{
              fontFamily:    "var(--font-mono,'DM Mono',monospace)",
              fontSize:      9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color:         "#50d48a",
              marginBottom:  16,
            }}
          >
            Booked — {bookedSlots.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bookedSlots.map((slot) => (
              <SlotRow key={slot.id} slot={slot} isDeleting={false} onDelete={() => {}} booked />
            ))}
          </div>
        </div>
      )}

      {slots.length === 0 && (
        <div
          style={{
            textAlign:  "center",
            padding:    "40px 20px",
            color:      "rgba(255,255,255,0.22)",
            fontSize:   13,
            fontWeight: 300,
          }}
        >
          No upcoming slots. Add your first availability above.
        </div>
      )}
    </div>
  );
}

function SlotRow({
  slot,
  isDeleting,
  onDelete,
  booked = false,
}: {
  slot:       AvailabilitySlot;
  isDeleting: boolean;
  onDelete:   () => void;
  booked?:    boolean;
}) {
  return (
    <div
      style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        padding:        "10px 14px",
        background:     "rgba(255,255,255,0.02)",
        border:         "1px solid rgba(255,255,255,0.055)",
        borderRadius:   6,
        gap:            12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily:    "var(--font-mono,'DM Mono',monospace)",
            fontSize:      11,
            color:         booked ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.72)",
            letterSpacing: "0.04em",
          }}
        >
          {fmtDate(slot.slot_date)} · {fmtTime(slot.start_time)}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontWeight: 300, marginTop: 2 }}>
          {slot.duration_minutes} min · {fmtUSD(slot.price_cents)}
          {slot.meeting_link && (
            <span style={{ marginLeft: 8, color: "#50d48a" }}>✓ link set</span>
          )}
        </div>
      </div>
      {!booked && (
        <button
          onClick={onDelete}
          disabled={isDeleting}
          style={{
            background:  "transparent",
            border:      "1px solid rgba(224,85,85,0.2)",
            color:       "rgba(224,85,85,0.5)",
            borderRadius: 3,
            padding:     "4px 10px",
            fontSize:    10,
            cursor:      isDeleting ? "not-allowed" : "pointer",
            fontFamily:  "var(--font-mono,'DM Mono',monospace)",
            letterSpacing: "0.1em",
            flexShrink:  0,
          }}
        >
          {isDeleting ? "…" : "Remove"}
        </button>
      )}
      {booked && (
        <div
          style={{
            fontSize:      9,
            fontFamily:    "var(--font-mono,'DM Mono',monospace)",
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
            color:         "#50d48a",
            border:        "1px solid rgba(80,212,138,0.2)",
            borderRadius:  100,
            padding:       "3px 8px",
            flexShrink:    0,
          }}
        >
          Booked
        </div>
      )}
    </div>
  );
}
