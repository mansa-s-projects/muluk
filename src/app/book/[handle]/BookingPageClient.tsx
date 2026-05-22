"use client";

import { useState, useMemo } from "react";
import type { AvailabilitySlot } from "@/lib/bookings";
import { fmtDate, fmtDayOfWeek, fmtTime, fmtUSD } from "@/lib/bookings";

interface Creator {
  id:            string;
  handle:        string;
  display_name?: string | null;
  avatar_url?:   string | null;
  bio?:          string | null;
}

interface Props {
  handle:         string;
  initialCreator: Creator | null;
  initialSlots:   AvailabilitySlot[];
}

type Step = "date" | "slot" | "form" | "paying";

const inputStyle: React.CSSProperties = {
  background:   "rgba(255,255,255,0.03)",
  border:       "1px solid rgba(255,255,255,0.09)",
  borderRadius: 4,
  color:        "rgba(255,255,255,0.92)",
  fontFamily:   "var(--font-body,'Outfit',sans-serif)",
  fontSize:     14,
  fontWeight:   300,
  padding:      "12px 16px",
  outline:      "none",
  width:        "100%",
  boxSizing:    "border-box" as const,
};

export default function BookingPageClient({ handle, initialCreator, initialSlots }: Props) {
  const [slots]             = useState<AvailabilitySlot[]>(initialSlots);
  const [creator]           = useState<Creator | null>(initialCreator);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [step,         setStep]         = useState<Step>("date");
  const [fanName,      setFanName]      = useState("");
  const [fanEmail,     setFanEmail]     = useState("");
  const [paying,       setPaying]       = useState(false);
  const [error,        setError]        = useState("");

  // Group slots by date
  const byDate = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of slots) {
      const list = map.get(slot.slot_date) ?? [];
      list.push(slot);
      map.set(slot.slot_date, list);
    }
    return map;
  }, [slots]);

  const availableDates = Array.from(byDate.keys()).sort();

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedSlot) return;

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(fanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (fanName.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }

    setPaying(true);
    try {
      const res = await fetch("/api/bookings/create", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          slotId:   selectedSlot.id,
          fanName:  fanName.trim(),
          fanEmail: fanEmail.trim().toLowerCase(),
          handle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPaying(false);
    }
  }

  const displayName = creator?.display_name ?? creator?.handle ?? handle;

  return (
    <div
      style={{
        minHeight:       "100vh",
        background:      "#020203",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        padding:         "60px 16px 80px",
        fontFamily:      "var(--font-body,'Outfit',sans-serif)",
        color:           "rgba(255,255,255,0.88)",
        backgroundImage: "url('/noise.png')",
        backgroundRepeat: "repeat",
        backgroundSize:  "128px 128px",
        backgroundBlendMode: "overlay",
      }}
    >
      {/* Header */}
      <div
        style={{
          width:        "100%",
          maxWidth:     480,
          marginBottom: 40,
          textAlign:    "center",
        }}
      >
        {creator?.avatar_url && (
          <img
            src={creator.avatar_url}
            alt={displayName}
            width={56}
            height={56}
            style={{
              borderRadius:  "50%",
              objectFit:     "cover",
              border:        "1px solid rgba(200,169,110,0.3)",
              marginBottom:  16,
            }}
          />
        )}
        <div
          style={{
            fontFamily:    "var(--font-display,'Cormorant Garamond',serif)",
            fontSize:      28,
            fontWeight:    400,
            letterSpacing: "-0.02em",
            marginBottom:  8,
          }}
        >
          Book a Session
        </div>
        <div
          style={{
            fontSize:   14,
            fontWeight: 300,
            color:      "rgba(255,255,255,0.4)",
          }}
        >
          1-on-1 with <span style={{ color: "#c8a96e" }}>{displayName}</span>
        </div>
        {creator?.bio && (
          <div
            style={{
              marginTop:  12,
              fontSize:   13,
              fontWeight: 300,
              color:      "rgba(255,255,255,0.35)",
              lineHeight: 1.6,
            }}
          >
            {creator.bio}
          </div>
        )}
      </div>

      {/* Card */}
      <div
        style={{
          width:        "100%",
          maxWidth:     480,
          background:   "rgba(15,15,30,0.85)",
          border:       "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          overflow:     "hidden",
          position:     "relative",
        }}
      >
        {/* Top shimmer */}
        <div
          style={{
            position:   "absolute",
            top:        0,
            left:       "15%",
            right:      "15%",
            height:     1,
            background: "linear-gradient(90deg,transparent,rgba(200,169,110,0.35),transparent)",
          }}
        />

        {/* ── Step: Choose date ── */}
        {step === "date" && (
          <div style={{ padding: "28px 24px" }}>
            <SectionLabel>Select a Date</SectionLabel>
            {availableDates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>
                No upcoming availability. Check back soon.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {availableDates.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setSelectedDate(d); setStep("slot"); }}
                    style={{
                      display:        "flex",
                      justifyContent: "space-between",
                      alignItems:     "center",
                      padding:        "14px 18px",
                      background:     "rgba(255,255,255,0.025)",
                      border:         "1px solid rgba(255,255,255,0.07)",
                      borderRadius:   7,
                      color:          "rgba(255,255,255,0.82)",
                      cursor:         "pointer",
                      textAlign:      "left",
                      transition:     "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
                  >
                    <div>
                      <div style={{ fontFamily: "var(--font-body,'Outfit',sans-serif)", fontSize: 14, fontWeight: 400 }}>
                        {fmtDate(d)}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                        {fmtDayOfWeek(d)} · {(byDate.get(d) ?? []).length} slot{(byDate.get(d) ?? []).length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 18 }}>›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Choose time slot ── */}
        {step === "slot" && selectedDate && (
          <div style={{ padding: "28px 24px" }}>
            <BackButton onClick={() => { setStep("date"); setSelectedDate(null); setSelectedSlot(null); }} />
            <SectionLabel>{fmtDate(selectedDate)} · {fmtDayOfWeek(selectedDate)}</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(byDate.get(selectedDate) ?? []).map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => { setSelectedSlot(slot); setStep("form"); }}
                  style={{
                    display:        "flex",
                    justifyContent: "space-between",
                    alignItems:     "center",
                    padding:        "14px 18px",
                    background:     "rgba(255,255,255,0.025)",
                    border:         "1px solid rgba(255,255,255,0.07)",
                    borderRadius:   7,
                    color:          "rgba(255,255,255,0.82)",
                    cursor:         "pointer",
                    transition:     "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
                >
                  <div>
                    <div style={{ fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: 14, letterSpacing: "0.04em" }}>
                      {fmtTime(slot.start_time)}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                      {slot.duration_minutes} min session
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#c8a96e", fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: 14 }}>
                      {fmtUSD(slot.price_cents)}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>pay to book</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Fan details form ── */}
        {step === "form" && selectedSlot && (
          <div style={{ padding: "28px 24px" }}>
            <BackButton onClick={() => { setStep("slot"); setSelectedSlot(null); }} />

            {/* Summary bar */}
            <div
              style={{
                padding:      "12px 16px",
                background:   "rgba(200,169,110,0.07)",
                border:       "1px solid rgba(200,169,110,0.15)",
                borderRadius: 6,
                marginBottom: 24,
                display:      "flex",
                justifyContent: "space-between",
                alignItems:   "center",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: 12, color: "#c8a96e" }}>
                  {fmtDate(selectedSlot.slot_date)} · {fmtTime(selectedSlot.start_time)}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                  {selectedSlot.duration_minutes} min with {displayName}
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: 16, color: "#c8a96e" }}>
                {fmtUSD(selectedSlot.price_cents)}
              </div>
            </div>

            <form onSubmit={handlePay}>
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="fan-name"
                  style={{
                    display:       "block",
                    marginBottom:  6,
                    fontFamily:    "var(--font-mono,'DM Mono',monospace)",
                    fontSize:      9,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase" as const,
                    color:         "rgba(255,255,255,0.35)",
                  }}
                >
                  Your Name *
                </label>
                <input
                  id="fan-name"
                  type="text"
                  value={fanName}
                  onChange={(e) => setFanName(e.target.value)}
                  placeholder="Full name"
                  required
                  autoComplete="name"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="fan-email"
                  style={{
                    display:       "block",
                    marginBottom:  6,
                    fontFamily:    "var(--font-mono,'DM Mono',monospace)",
                    fontSize:      9,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase" as const,
                    color:         "rgba(255,255,255,0.35)",
                  }}
                >
                  Email *
                </label>
                <input
                  id="fan-email"
                  type="email"
                  value={fanEmail}
                  onChange={(e) => setFanEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 4, fontWeight: 300 }}>
                  Meeting link sent here after payment
                </div>
              </div>

              {error && (
                <div
                  style={{
                    marginBottom:  16,
                    padding:       "10px 14px",
                    background:    "rgba(224,85,85,0.08)",
                    border:        "1px solid rgba(224,85,85,0.2)",
                    borderRadius:  4,
                    fontSize:      12,
                    color:         "#e05555",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={paying}
                style={{
                  width:         "100%",
                  background:    paying ? "rgba(200,169,110,0.4)" : "#c8a96e",
                  color:         "#0a0800",
                  border:        "none",
                  borderRadius:  4,
                  padding:       "14px",
                  fontFamily:    "var(--font-mono,'DM Mono',monospace)",
                  fontSize:      11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase" as const,
                  cursor:        paying ? "not-allowed" : "pointer",
                  transition:    "opacity 0.2s",
                  fontWeight:    500,
                }}
              >
                {paying ? "Redirecting to payment…" : `Pay ${fmtUSD(selectedSlot.price_cents)} to Book`}
              </button>

              <div
                style={{
                  marginTop:  12,
                  textAlign:  "center",
                  fontSize:   10,
                  color:      "rgba(255,255,255,0.2)",
                  fontFamily: "var(--font-mono,'DM Mono',monospace)",
                  letterSpacing: "0.08em",
                }}
              >
                Secured by Whop · No login required
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily:    "var(--font-mono,'DM Mono',monospace)",
        fontSize:      9,
        letterSpacing: "0.2em",
        textTransform: "uppercase" as const,
        color:         "rgba(255,255,255,0.3)",
        marginBottom:  16,
      }}
    >
      {children}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background:    "transparent",
        border:        "none",
        color:         "rgba(255,255,255,0.3)",
        cursor:        "pointer",
        fontFamily:    "var(--font-mono,'DM Mono',monospace)",
        fontSize:      10,
        letterSpacing: "0.12em",
        padding:       "0 0 16px 0",
        display:       "flex",
        alignItems:    "center",
        gap:           6,
      }}
    >
      ‹ Back
    </button>
  );
}
