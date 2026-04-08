"use client";

import type { Booking } from "@/lib/bookings";
import { fmtDate, fmtTime, fmtUSD, STATUS_COLORS, STATUS_LABELS } from "@/lib/bookings";

interface Props {
  bookings: (Booking & {
    availability?: {
      slot_date:        string;
      start_time:       string;
      duration_minutes: number;
    } | null;
  })[];
}

export default function BookingsListClient({ bookings }: Props) {
  if (bookings.length === 0) {
    return (
      <div
        style={{
          background:   "#0f0f1e",
          border:       "1px solid rgba(255,255,255,0.055)",
          borderRadius: 10,
          padding:      "48px 24px",
          textAlign:    "center",
        }}
      >
        <div
          style={{
            fontFamily:   "var(--font-display,'Cormorant Garamond',serif)",
            fontSize:     18,
            fontWeight:   300,
            color:        "rgba(255,255,255,0.25)",
            marginBottom: 8,
          }}
        >
          No bookings yet
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", fontWeight: 300 }}>
          Share your booking page to receive fan sessions.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background:   "#0f0f1e",
        border:       "1px solid rgba(255,255,255,0.055)",
        borderRadius: 10,
        overflow:     "hidden",
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

      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          padding:        "20px 24px 14px",
          borderBottom:   "1px solid rgba(255,255,255,0.055)",
        }}
      >
        <h2
          style={{
            fontFamily:    "var(--font-display,'Cormorant Garamond',serif)",
            fontSize:      20,
            fontWeight:    400,
            margin:        0,
            letterSpacing: "-0.01em",
          }}
        >
          Bookings
        </h2>
        <span
          style={{
            fontFamily:    "var(--font-mono,'DM Mono',monospace)",
            fontSize:      9,
            letterSpacing: "0.15em",
            color:         "rgba(255,255,255,0.3)",
          }}
        >
          {bookings.length} total
        </span>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {bookings.map((b) => (
          <BookingCard key={b.id} booking={b} />
        ))}
      </div>
    </div>
  );
}

function BookingCard({ booking: b }: { booking: Props["bookings"][number] }) {
  const statusColor = STATUS_COLORS[b.status] ?? "rgba(255,255,255,0.3)";
  const statusLabel = STATUS_LABELS[b.status] ?? b.status;
  const av          = b.availability;

  return (
    <div
      style={{
        padding:      "14px 14px",
        background:   "rgba(255,255,255,0.02)",
        border:       "1px solid rgba(255,255,255,0.055)",
        borderRadius: 8,
        borderLeft:   `2px solid ${statusColor}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        {/* Left: fan info */}
        <div>
          <div
            style={{
              fontFamily:   "var(--font-body,'Outfit',sans-serif)",
              fontSize:     14,
              fontWeight:   400,
              color:        "rgba(255,255,255,0.85)",
              marginBottom: 2,
            }}
          >
            {b.fan_name}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 300 }}>
            {b.fan_email}
          </div>
        </div>

        {/* Right: status badge + amount */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              display:       "inline-block",
              padding:       "2px 9px",
              borderRadius:  100,
              border:        `1px solid ${statusColor}`,
              color:         statusColor,
              fontSize:      9,
              fontFamily:    "var(--font-mono,'DM Mono',monospace)",
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              marginBottom:  4,
            }}
          >
            {statusLabel}
          </div>
          {b.amount_cents != null && (
            <div style={{ fontSize: 12, color: "#c8a96e", fontFamily: "var(--font-mono,'DM Mono',monospace)" }}>
              {fmtUSD(b.amount_cents)}
            </div>
          )}
        </div>
      </div>

      {/* Session time */}
      {av && (
        <div
          style={{
            marginTop:     8,
            paddingTop:    8,
            borderTop:     "1px solid rgba(255,255,255,0.04)",
            fontFamily:    "var(--font-mono,'DM Mono',monospace)",
            fontSize:      10,
            color:         "rgba(255,255,255,0.35)",
            letterSpacing: "0.08em",
          }}
        >
          {fmtDate(av.slot_date)} · {fmtTime(av.start_time)} · {av.duration_minutes} min
        </div>
      )}

      {/* Meeting link (confirmed only) */}
      {b.status === "confirmed" && b.meeting_link && (
        <a
          href={b.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display:       "block",
            marginTop:     8,
            paddingTop:    8,
            borderTop:     "1px solid rgba(255,255,255,0.04)",
            fontSize:      11,
            color:         "#50d48a",
            fontFamily:    "var(--font-mono,'DM Mono',monospace)",
            textDecoration: "none",
            overflow:      "hidden",
            textOverflow:  "ellipsis",
            whiteSpace:    "nowrap",
          }}
        >
          ↗ {b.meeting_link}
        </a>
      )}
    </div>
  );
}
