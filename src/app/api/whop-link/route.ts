import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { provisionWhopCheckout } from "@/lib/whop";

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/whop-link
 * Public endpoint for fan checkout URL provisioning by content item.
 *
 * Body: { content_id: string }
 * Returns: { checkout_url: string, whop_product_id: string | null }
 */
export async function POST(req: Request) {
  let body: { content_id?: unknown };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contentId = typeof body.content_id === "string" ? body.content_id.trim() : "";
  if (!UUID_RE.test(contentId)) {
    return NextResponse.json({ error: "content_id must be a valid UUID" }, { status: 400 });
  }

  const db = getDb();

  const { data: content, error: contentErr } = await db
    .from("content_items_v2")
    .select("id, creator_id, title, description, price, currency, is_active, whop_checkout_url, whop_product_id")
    .eq("id", contentId)
    .maybeSingle();

  if (contentErr) {
    console.error("[whop-link] DB error fetching content:", contentErr);
    return NextResponse.json({ error: "Failed to fetch content", details: contentErr.message }, { status: 500 });
  }
  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  if (!content.is_active) {
    return NextResponse.json({ error: "Content is not available" }, { status: 410 });
  }

  if (!Number.isInteger(content.price) || content.price < 50) {
    return NextResponse.json({ error: "Invalid content pricing" }, { status: 422 });
  }

  if (content.whop_checkout_url) {
    return NextResponse.json({
      checkout_url: content.whop_checkout_url,
      whop_product_id: content.whop_product_id ?? null,
    });
  }

  const { data: creator } = await db
    .from("creator_applications")
    .select("handle")
    .eq("user_id", content.creator_id)
    .eq("status", "approved")
    .maybeSingle();

  const redirectUrl = creator?.handle
    ? `${SITE_URL}/@${creator.handle}?payment=success`
    : `${SITE_URL}/?payment=success`;

  let checkout;
  try {
    checkout = await provisionWhopCheckout({
      title: content.title,
      description: content.description ?? undefined,
      price_cents: content.price,
      redirect_url: redirectUrl,
    });
  } catch (checkoutErr) {
    console.error("[whop-link] checkout provisioning threw", checkoutErr);
    return NextResponse.json({ error: "Unable to provision checkout" }, { status: 503 });
  }

  if (!checkout) {
    return NextResponse.json({ error: "Unable to provision checkout" }, { status: 503 });
  }

  const { data: updatedRows, error: updateError } = await db
    .from("content_items_v2")
    .update({
      whop_product_id: checkout.whop_product_id,
      whop_checkout_url: checkout.whop_checkout_url,
    })
    .eq("id", content.id)
    .is("whop_checkout_url", null)
    .select("id, whop_checkout_url, whop_product_id");

  if (updateError) {
    console.error("[whop-link] failed to persist checkout:", updateError);
    return NextResponse.json({ error: "Failed to persist checkout" }, { status: 500 });
  }

  if (!updatedRows || updatedRows.length === 0) {
    const { data: current, error: rereadError } = await db
      .from("content_items_v2")
      .select("whop_checkout_url, whop_product_id")
      .eq("id", content.id)
      .maybeSingle();

    if (rereadError || !current?.whop_checkout_url) {
      return NextResponse.json({ error: "Unable to resolve checkout" }, { status: 500 });
    }

    return NextResponse.json({
      checkout_url: current.whop_checkout_url,
      whop_product_id: current.whop_product_id ?? null,
    });
  }

  return NextResponse.json({
    checkout_url: checkout.whop_checkout_url,
    whop_product_id: checkout.whop_product_id,
  });
}
