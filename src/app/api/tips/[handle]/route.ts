import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { provisionTipCheckout } from "@/lib/tips";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Params = { params: Promise<{ handle: string }> };

/** GET /api/tips/[handle] — public Wall of Love (paid tips, newest first) */
export async function GET(req: Request, { params }: Params) {
  const { handle } = await params;
  const { searchParams } = new URL(req.url);
  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = getServiceClient();

  // Resolve creator
  const { data: creator } = await supabase
    .from("creator_applications")
    .select("user_id")
    .eq("handle", handle)
    .eq("status", "approved")
    .maybeSingle();

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const { data: tips, count, error } = await supabase
    .from("tips")
    .select(
      "id, display_name, is_anonymous, amount_cents, message, paid_at",
      { count: "exact" }
    )
    .eq("creator_id", creator.user_id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[api/tips/[handle]] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch tips" }, { status: 500 });
  }

  // Mask anonymous tips
  const publicTips = (tips ?? []).map((t) => ({
    id:           t.id,
    display_name: t.is_anonymous ? null : t.display_name,
    amount_cents: t.amount_cents,
    message:      t.message,
    paid_at:      t.paid_at,
  }));

  return NextResponse.json({
    tips:  publicTips,
    total: count ?? 0,
    page,
    pages: Math.ceil((count ?? 0) / limit),
  });
}

/** POST /api/tips/[handle] — fan creates a tip and gets Whop checkout URL */
export async function POST(req: Request, { params }: Params) {
  const { handle } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amountCents = typeof body.amount_cents === "number" ? Math.round(body.amount_cents) : 0;
  if (amountCents < 100) {
    return NextResponse.json({ error: "Minimum tip is $1.00" }, { status: 422 });
  }

  const displayName  = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 80) : "";
  const isAnonymous  = body.is_anonymous === true;
  const message      = typeof body.message === "string" ? body.message.trim().slice(0, 500) : null;
  const fanEmail     = typeof body.fan_email === "string" ? body.fan_email.trim().toLowerCase() : null;

  // Basic email validation if provided
  if (fanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fanEmail)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 422 });
  }

  if (!isAnonymous && !displayName) {
    return NextResponse.json({ error: "display_name required unless anonymous" }, { status: 422 });
  }

  const supabase = getServiceClient();

  // Resolve creator
  const { data: creator } = await supabase
    .from("creator_applications")
    .select("user_id")
    .eq("handle", handle)
    .eq("status", "approved")
    .maybeSingle();

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? "https://muluk.vip";
  const redirectUrl = `${siteUrl}/tips/${handle}/success`;

  // Insert tip record first to get ID
  const { data: tip, error: insertError } = await supabase
    .from("tips")
    .insert({
      creator_id:   creator.user_id,
      display_name: isAnonymous ? null : displayName,
      is_anonymous: isAnonymous,
      fan_email:    fanEmail,
      amount_cents: amountCents,
      message:      message || null,
      status:       "pending",
    })
    .select("id, access_token")
    .single();

  if (insertError || !tip) {
    console.error("[api/tips/[handle]] insert error:", insertError);
    return NextResponse.json({ error: "Failed to create tip" }, { status: 500 });
  }

  // Provision Whop checkout
  const checkout = await provisionTipCheckout({
    tipId:        tip.id,
    creatorHandle: handle,
    amountCents,
    redirectUrl,
    fanEmail:     fanEmail ?? undefined,
  });

  if (!checkout) {
    // Cleanup orphaned tip and surface a clear error
    await supabase.from("tips").delete().eq("id", tip.id);
    return NextResponse.json({ error: "Failed to provision payment" }, { status: 502 });
  }

  // Store Whop IDs on the tip
  const { error: updateError } = await supabase
    .from("tips")
    .update({
      whop_product_id:  checkout.whop_product_id,
      whop_checkout_id: checkout.whop_checkout_id,
    })
    .eq("id", tip.id);

  if (updateError) {
    console.error("[api/tips/[handle]] failed to persist checkout ids", {
      tipId: tip.id,
      whopCheckoutId: checkout.whop_checkout_id,
      error: updateError.message,
    });
    return NextResponse.json({ error: "Failed to persist checkout" }, { status: 500 });
  }

  return NextResponse.json({
    id:          tip.id,
    access_token: tip.access_token,
    checkout_url: checkout.whop_checkout_url,
  }, { status: 201 });
}
