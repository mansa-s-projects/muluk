import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { provisionSeriesPurchaseCheckout } from "@/lib/series";

function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Params = { params: Promise<{ id: string }> };

// ── POST /api/series/[id]/buy — fan: initiate purchase ────────────────────────

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const db = getServiceDb();

  // Load series + creator handle
  const { data: series } = await db
    .from("series")
    .select("id, creator_id, title, price_cents, status")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (!series) return NextResponse.json({ error: "Series not found" }, { status: 404 });

  const { data: creator } = await db
    .from("creator_applications")
    .select("handle")
    .eq("user_id", series.creator_id as string)
    .eq("status", "approved")
    .maybeSingle();

  const fanEmail = typeof body.fan_email === "string" ? body.fan_email.trim() || undefined : undefined;
  const fanName  = typeof body.fan_name  === "string" ? body.fan_name.trim()  || undefined : undefined;
  const handle   = (creator?.handle as string) ?? "creator";

  const priceCents = series.price_cents as number;

  // Create pending purchase row to get an access_token
  const { data: purchase, error: insertErr } = await db
    .from("series_purchases")
    .insert({
      series_id:  id,
      creator_id: series.creator_id,
      fan_email:  fanEmail ?? null,
      fan_name:   fanName  ?? null,
      status:     "pending",
    })
    .select()
    .single();

  if (insertErr || !purchase) {
    return NextResponse.json({ error: "Could not create purchase" }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  if (!/^https?:\/\//.test(siteUrl)) {
    console.error("[series/buy] NEXT_PUBLIC_SITE_URL is missing or invalid");
    return NextResponse.json({ error: "Server misconfigured: NEXT_PUBLIC_SITE_URL is required" }, { status: 500 });
  }
  const redirectUrl = `${siteUrl}/series/${handle}/${id}?token=${purchase.access_token as string}`;

  // Free series — mark paid immediately, skip Whop
  if (priceCents === 0) {
    const { error: freeUpdateError, data: freeUpdated } = await db
      .from("series_purchases")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", purchase.id as string)
      .select("id");

    if (freeUpdateError || !freeUpdated || freeUpdated.length === 0) {
      console.error("[series/buy] failed to mark free purchase as paid", {
        purchaseId: purchase.id,
        error: freeUpdateError,
      });
      return NextResponse.json({ error: "Failed to finalize free purchase" }, { status: 500 });
    }

    return NextResponse.json({
      id:           purchase.id,
      access_token: purchase.access_token,
      checkout_url: redirectUrl,
      free:         true,
    });
  }

  const checkout = await provisionSeriesPurchaseCheckout({
    purchaseId:    purchase.id as string,
    accessToken:   purchase.access_token as string,
    seriesTitle:   series.title as string,
    creatorHandle: handle,
    priceCents,
    redirectUrl,
    fanEmail,
  });

  if (!checkout) {
    await db.from("series_purchases").delete().eq("id", purchase.id as string);
    return NextResponse.json({ error: "Payment gateway unavailable" }, { status: 502 });
  }

  await db
    .from("series_purchases")
    .update({ whop_plan_id: checkout.whop_plan_id })
    .eq("id", purchase.id as string);

  return NextResponse.json({
    id:           purchase.id,
    access_token: purchase.access_token,
    checkout_url: checkout.whop_checkout_url,
  }, { status: 201 });
}
