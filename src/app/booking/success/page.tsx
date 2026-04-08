import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking Confirmed",
};

interface Props {
  searchParams: Promise<{ booking?: string }>;
}

interface BookingDetails {
  id:                 string;
  fan_name:           string;
  fan_email:          string;
  status:             string;
  amount_cents:       number;
  meeting_link:       string | null;
  availability: {
    slot_date:        string;
    start_time:       string;
    duration_minutes: number;
    profiles: {
      display_name:   string | null;
      handle:         string;
    } | null;
  } | null;
}

async function getBooking(bookingId: string): Promise<BookingDetails | null> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await db
    .from("bookings")
    .select(`
      id,
      fan_name,
      fan_email,
      status,
      amount_cents,
      meeting_link,
      availability (
        slot_date,
        start_time,
        duration_minutes,
        profiles ( display_name, handle )
      )
    `)
    .eq("id", bookingId)
    .maybeSingle();

  return data as BookingDetails | null;
}

function fmtDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour  = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function fmtUSD(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function BookingSuccessPage({ searchParams }: Props) {
  const { booking: bookingId } = await searchParams;
  const booking = bookingId ? await getBooking(bookingId) : null;

  const isConfirmed = booking?.status === "confirmed";
  const av          = booking?.availability;
  const creator     = av?.profiles;

  return (
    <div
      style={{
        minHeight:        "100vh",
        background:       "#020203",
        display:          "flex",
        flexDirection:    "column",
        alignItems:       "center",
        justifyContent:   "center",
        padding:          "60px 16px",
        fontFamily:       "'Outfit', sans-serif",
        color:            "rgba(255,255,255,0.88)",
        backgroundImage:  "url('/noise.png')",
        backgroundRepeat: "repeat",
        backgroundSize:   "128px 128px",
        backgroundBlendMode: "overlay",
      }}
    >
      <div
        style={{
          width:        "100%",
          maxWidth:     460,
          background:   "rgba(15,15,30,0.9)",
          border:       "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding:      "40px 32px",
          position:     "relative",
          textAlign:    "center",
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
            background: "linear-gradient(90deg,transparent,rgba(200,169,110,0.4),transparent)",
          }}
        />

        {/* Check circle */}
        <div
          style={{
            width:        60,
            height:       60,
            borderRadius: "50%",
            background:   "rgba(80,212,138,0.1)",
            border:       "1px solid rgba(80,212,138,0.3)",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            margin:       "0 auto 24px",
            fontSize:     24,
          }}
        >
          ✓
        </div>

        <div
          style={{
            fontFamily:    "'Cormorant Garamond', serif",
            fontSize:      30,
            fontWeight:    400,
            letterSpacing: "-0.02em",
            marginBottom:  8,
          }}
        >
          {isConfirmed ? "Session Confirmed" : "Payment Received"}
        </div>

        <div style={{ fontSize: 14, fontWeight: 300, color: "rgba(255,255,255,0.4)", marginBottom: 32, lineHeight: 1.6 }}>
          {isConfirmed
            ? "Your meeting link is ready below."
            : "Your booking is being confirmed. Check your email shortly."}
        </div>

        {booking && av && (
          <div
            style={{
              background:    "rgba(255,255,255,0.025)",
              border:        "1px solid rgba(255,255,255,0.07)",
              borderRadius:  8,
              padding:       "20px",
              marginBottom:  24,
              textAlign:     "left",
            }}
          >
            {/* Booking rows */}
            <DetailRow label="Fan" value={booking.fan_name} />
            <DetailRow label="Email" value={booking.fan_email} />
            {creator && (
              <DetailRow label="Creator" value={creator.display_name ?? `@${creator.handle}`} />
            )}
            <DetailRow label="Date" value={fmtDate(av.slot_date)} />
            <DetailRow label="Time" value={fmtTime(av.start_time)} />
            <DetailRow label="Duration" value={`${av.duration_minutes} minutes`} />
            <DetailRow label="Amount" value={fmtUSD(booking.amount_cents)} gold last />
          </div>
        )}

        {/* Meeting link */}
        {isConfirmed && booking?.meeting_link && (
          <a
            href={booking.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:       "block",
              width:         "100%",
              background:    "#c8a96e",
              color:         "#0a0800",
              border:        "none",
              borderRadius:  4,
              padding:       "14px 20px",
              fontFamily:    "'DM Mono', monospace",
              fontSize:      11,
              letterSpacing: "0.18em",
              textTransform: "uppercase" as const,
              textDecoration: "none",
              textAlign:     "center",
              marginBottom:  12,
            }}
          >
            Join Meeting →
          </a>
        )}

        {booking && creator && (
          <a
            href={`/book/${creator.handle}`}
            style={{
              display:       "block",
              fontSize:      12,
              color:         "rgba(255,255,255,0.25)",
              fontFamily:    "'DM Mono', monospace",
              letterSpacing: "0.1em",
              textDecoration: "none",
              marginTop:     8,
            }}
          >
            Book another session
          </a>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  gold = false,
  last = false,
}: {
  label: string;
  value: string;
  gold?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display:      "flex",
        justifyContent: "space-between",
        alignItems:   "baseline",
        paddingBottom: last ? 0 : 10,
        marginBottom:  last ? 0 : 10,
        borderBottom:  last ? "none" : "1px solid rgba(255,255,255,0.04)",
        gap:           12,
      }}
    >
      <span
        style={{
          fontFamily:    "'DM Mono', monospace",
          fontSize:      9,
          letterSpacing: "0.15em",
          textTransform: "uppercase" as const,
          color:         "rgba(255,255,255,0.3)",
          flexShrink:    0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize:   13,
          fontWeight: 300,
          color:      gold ? "#c8a96e" : "rgba(255,255,255,0.75)",
          textAlign:  "right",
          overflow:   "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}
