import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import AvailabilityClient from "./AvailabilityClient";
import BookingsListClient from "./BookingsListClient";
import type { AvailabilitySlot, Booking } from "@/lib/bookings";
import DashboardShell from "@/app/dashboard/components/DashboardShell";

function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function BookingsDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = getServiceDb();

  // Fetch creator's handle for share link
  const { data: profile } = await db
    .from("profiles")
    .select("handle, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const today = new Date().toISOString().split("T")[0];

  // Fetch slots and bookings in parallel
  const [{ data: slots }, { data: bookings }] = await Promise.all([
    db
      .from("availability")
      .select("id, slot_date, start_time, duration_minutes, price_cents, meeting_link, is_booked, is_active, created_at, updated_at")
      .eq("creator_id", user.id)
      .gte("slot_date", today)
      .order("slot_date",  { ascending: true })
      .order("start_time", { ascending: true }),
    db
      .from("bookings")
      .select("id, availability_id, creator_id, fan_name, fan_email, status, amount_cents, meeting_link, notes, whop_checkout_id, whop_payment_id, created_at, updated_at, availability(slot_date, start_time, duration_minutes)")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const normalizedBookings = (bookings ?? []).map((booking) => ({
    ...(booking as Record<string, unknown>),
    creator_id: (booking as { creator_id?: string }).creator_id ?? user.id,
    whop_payment_id: (booking as { whop_payment_id?: string | null }).whop_payment_id ?? null,
  })) as Booking[];

  return (
    <DashboardShell userEmail={user.email ?? ""} userId={user.id} handle={profile?.handle ?? undefined}>
      <div
        style={{
          minHeight:  "100vh",
          background: "#020203",
          fontFamily: "var(--font-body, 'Outfit', sans-serif)",
          color:      "rgba(255,255,255,0.92)",
          padding:    "36px 32px 80px",
        }}
      >
      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <div
          style={{
            fontFamily:    "var(--font-mono, 'DM Mono', monospace)",
            fontSize:      9,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color:         "#7a6030",
            marginBottom:  10,
          }}
        >
          Dashboard · Bookings
        </div>
        <h1
          style={{
            fontFamily:  "var(--font-display, 'Cormorant Garamond', serif)",
            fontSize:    "clamp(28px, 4vw, 42px)",
            fontWeight:  300,
            margin:      0,
            letterSpacing: "-0.02em",
          }}
        >
          1:1 Sessions
        </h1>
        {profile?.handle && (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 8, fontWeight: 300 }}>
            Your public booking page:{" "}
            <span style={{ color: "#c8a96e", fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: 11 }}>
              /book/{profile.handle}
            </span>
          </p>
        )}
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "minmax(320px, 460px) 1fr",
          gap:                 28,
          alignItems:          "start",
        }}
        className="bookings-grid"
      >
        {/* Left: Availability manager */}
        <AvailabilityClient
          creatorId={user.id}
          handle={profile?.handle ?? ""}
          slots={(slots ?? []) as AvailabilitySlot[]}
        />

        {/* Right: Bookings list */}
        <BookingsListClient bookings={normalizedBookings} />
      </div>

      <style>{`
        @media (max-width: 860px) {
          .bookings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      </div>
    </DashboardShell>
  );
}
