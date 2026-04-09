import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const serviceDb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST /api/dashboard/bookings/slots — create a slot
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { slot_date, start_time, duration_minutes, price_cents, meeting_link } = body as {
    slot_date:        string;
    start_time:       string;
    duration_minutes: number;
    price_cents:      number;
    meeting_link?:    string | null;
  };

  if (
    slot_date == null ||
    start_time == null ||
    duration_minutes == null ||
    price_cents == null
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate date is not in the past — both sides normalized to UTC calendar dates
  const todayUTC = new Date().toISOString().split("T")[0];
  const slotDateUTC = new Date(slot_date + "T00:00:00Z").toISOString().split("T")[0];
  if (slotDateUTC < todayUTC) {
    return NextResponse.json({ error: "Slot date cannot be in the past" }, { status: 400 });
  }

  const db = serviceDb();

  const { data: slot, error } = await db
    .from("availability")
    .insert({
      creator_id:       user.id,
      slot_date,
      start_time,
      duration_minutes,
      price_cents,
      meeting_link:     meeting_link ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A slot already exists at this date and time" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create slot" }, { status: 500 });
  }

  return NextResponse.json({ slot });
}
