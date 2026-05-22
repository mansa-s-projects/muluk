/**
 * POST /api/offers/purchase
 *
 * Logs a buy-button click event for an offer. Called client-side
 * before redirecting the user to the Whop checkout link.
 *
 * Body: { offer_id: string }
 * Returns: { ok: true }
 *
 * Intentionally unauthenticated — any visitor can click Buy.
 * Rate-limiting is handled by the edge middleware.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  let body: { offer_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const offerId = typeof body.offer_id === "string" ? body.offer_id.trim() : "";
  if (!offerId) {
    return NextResponse.json({ error: "offer_id is required" }, { status: 400 });
  }

  // Basic UUID format check — prevents injection into Supabase query
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(offerId)) {
    return NextResponse.json({ error: "Invalid offer_id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    // Verify the offer exists and is published before logging
    const { data: offer, error: fetchError } = await supabase
      .from("offers")
      .select("id")
      .eq("id", offerId)
      .eq("status", "published")
      .single();

    if (fetchError || !offer) {
      // Return ok anyway — don't expose whether the offer exists
      return NextResponse.json({ ok: true });
    }

    // Log the buy-click event into offer_events if the table exists.
    // Silently ignore if the table doesn't exist yet.
    await supabase
      .from("offer_events")
      .insert({ offer_id: offerId, event_type: "buy_click" })
      .then(() => null, () => null);
  } catch {
    // Never fail the user's redirect due to a logging error
  }

  return NextResponse.json({ ok: true });
}
