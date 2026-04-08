import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Params = { params: Promise<{ handle: string }> };

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { handle } = await params;

  if (!handle || handle.length > 50) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }

  const db = getDb();

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, handle, display_name, avatar_url, bio")
    .eq("handle", handle)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const today  = new Date().toISOString().split("T")[0];
  const cutoff = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: slots } = await db
    .from("availability")
    .select("id, slot_date, start_time, duration_minutes, price_cents")
    .eq("creator_id", profile.id)
    .eq("is_booked",  false)
    .eq("is_active",  true)
    .gte("slot_date", today)
    .lte("slot_date", cutoff)
    .order("slot_date",  { ascending: true })
    .order("start_time", { ascending: true });

  return NextResponse.json({ creator: profile, slots: slots ?? [] });
}
