import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const WHOP_API_BASE = "https://api.whop.com/api/v2";

async function provisionBookingCheckout(params: {
  bookingId: string;
  slotId: string;
  creatorName: string;
  dateLabel: string;
  timeLabel: string;
  durationMinutes: number;
  priceCents: number;
  buyerEmail: string;
  redirectUrl: string;
}): Promise<{ whop_checkout_id: string; whop_checkout_url: string } | null> {
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.WHOP_API_KEY;
  if (!apiKey || !companyId) return null;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const productRes = await fetch(`${WHOP_API_BASE}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        company_id: companyId,
        name: `1:1 Session with ${params.creatorName}`,
        description: `${params.dateLabel} at ${params.timeLabel} - ${params.durationMinutes} min`,
        visibility: "hidden",
      }),
    });

    if (!productRes.ok) return null;
    const product = await productRes.json() as { id: string };

    const planRes = await fetch(`${WHOP_API_BASE}/plans`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        product_id: product.id,
        plan_type: "one_time",
        initial_price: (params.priceCents / 100).toFixed(2),
        currency: "usd",
        billing_period: 0,
        redirect_url: params.redirectUrl,
        metadata: {
          booking_payment: "true",
          booking_id: params.bookingId,
          slot_id: params.slotId,
        },
      }),
    });

    if (!planRes.ok) {
      try {
        const deleteRes = await fetch(`${WHOP_API_BASE}/products/${product.id}`, {
          method: "DELETE",
          headers,
        });
        if (!deleteRes.ok) {
          console.error("[bookings] failed to cleanup orphaned Whop product", {
            productId: product.id,
            status: deleteRes.status,
          });
        }
      } catch (deleteErr) {
        console.error("[bookings] failed to cleanup orphaned Whop product", {
          productId: product.id,
          error: deleteErr,
        });
      }
      return null;
    }
    const plan = await planRes.json() as { id: string };

    return {
      whop_checkout_id: plan.id,
      whop_checkout_url: `https://whop.com/checkout/${plan.id}/?email=${encodeURIComponent(params.buyerEmail)}`,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slotId, fanName, fanEmail, handle } = body as {
    slotId:   unknown;
    fanName:  unknown;
    fanEmail: unknown;
    handle:   unknown;
  };

  if (
    typeof slotId   !== "string" || !slotId ||
    typeof fanName  !== "string" || !fanName.trim() ||
    typeof fanEmail !== "string" || !fanEmail.trim() ||
    typeof handle   !== "string" || !handle.trim()
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fanEmail)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Sanitize fanName (prevent excessively long inputs)
  const safeName = fanName.trim().slice(0, 100);

  const db = getDb();

  // Fetch slot — confirm it is still available
  const { data: slot } = await db
    .from("availability")
    .select("id, creator_id, slot_date, start_time, duration_minutes, price_cents, meeting_link, profiles(display_name, handle)")
    .eq("id", slotId)
    .eq("is_booked", false)
    .eq("is_active",  true)
    .maybeSingle();

  if (!slot) {
    return NextResponse.json(
      { error: "This slot is no longer available. Please choose another time." },
      { status: 409 }
    );
  }

  // Insert pending booking
  const { data: booking, error: bookingError } = await db
    .from("bookings")
    .insert({
      availability_id: slot.id,
      creator_id:      slot.creator_id,
      fan_name:        safeName,
      fan_email:       fanEmail.trim().toLowerCase(),
      amount_cents:    slot.price_cents,
      status:          "pending",
    })
    .select("id")
    .single();

  if (bookingError) {
    // 23505 = unique_violation — another request booked the same slot concurrently
    if (bookingError.code === "23505") {
      return NextResponse.json(
        { error: "This slot is no longer available. Please choose another time." },
        { status: 409 }
      );
    }
    console.error("bookings insert error:", bookingError);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  // Build Whop checkout session
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const profilesRaw = slot.profiles as unknown;
  const profile = Array.isArray(profilesRaw)
    ? (profilesRaw[0] as { display_name: string | null; handle: string | null } | undefined)
    : (profilesRaw as { display_name: string | null; handle: string | null } | null);
  const creatorName = profile?.display_name ?? handle;
  const dateLabel = slot.slot_date;
  const timeLabel = (slot.start_time as string).slice(0, 5);

  const checkout = await provisionBookingCheckout({
    bookingId: booking.id,
    slotId: slot.id,
    creatorName,
    dateLabel,
    timeLabel,
    durationMinutes: slot.duration_minutes,
    priceCents: slot.price_cents,
    buyerEmail: fanEmail.trim().toLowerCase(),
    redirectUrl: `${siteUrl}/booking/success?booking=${booking.id}`,
  });

  if (!checkout) {
    await db.from("bookings").delete().eq("id", booking.id);
    return NextResponse.json({ error: "Payment system unavailable" }, { status: 503 });
  }

  const { error: checkoutUpdateError } = await db
    .from("bookings")
    .update({ whop_checkout_id: checkout.whop_checkout_id })
    .eq("id", booking.id);

  if (checkoutUpdateError) {
    console.error("[bookings] failed to persist whop_checkout_id", {
      bookingId: booking.id,
      whopCheckoutId: checkout.whop_checkout_id,
      error: checkoutUpdateError,
    });
    return NextResponse.json({ error: "Failed to persist booking checkout" }, { status: 500 });
  }

  return NextResponse.json({ url: checkout.whop_checkout_url });
}
