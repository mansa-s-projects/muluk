/**
 * POST /api/offers/[id]/launch
 *
 * Activates an offer_draft by:
 *   1. Provisioning a Whop product + plan (if WHOP_API_KEY is available)
 *   2. Creating or updating the payment_link record with Whop IDs + checkout URL
 *   3. Marking the offer_draft as active
 *
 * Returns: { payment_link_id, pay_url, whop_checkout_url, whop_product_id }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { provisionWhopCheckout } from "@/lib/whop";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

type Params = { params: Promise<{ id: string }> };

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function buildSlug(title: string, id: string): string {
  const safe = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .slice(0, 40);
  // Return safe slug if non-empty, otherwise use ID segment
  return safe ? `${safe}-${id.slice(0, 8)}` : `offer-${id.slice(0, 8)}`;
}

export async function POST(_req: Request, { params }: Params) {
  const { id: offerDraftId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();

  // Load the offer draft
  const { data: offer, error: offerErr } = await db
    .from("offer_drafts")
    .select("*")
    .eq("id", offerDraftId)
    .eq("creator_id", user.id)
    .single();

  if (offerErr || !offer) {
    return NextResponse.json({ error: "Offer draft not found" }, { status: 404 });
  }

  // Check if a payment_link already exists for this offer
  const { data: existingLink } = await db
    .from("payment_links")
    .select("id, whop_checkout_url, whop_product_id, slug")
    .eq("offer_draft_id", offerDraftId)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (existingLink?.whop_checkout_url) {
    // Already provisioned — return existing
    return NextResponse.json({
      payment_link_id:  existingLink.id,
      pay_url:          `${getBaseUrl()}/pay/${existingLink.slug ?? existingLink.id}`,
      whop_checkout_url: existingLink.whop_checkout_url,
      whop_product_id:  existingLink.whop_product_id ?? null,
      already_live:     true,
    });
  }

  const slug = buildSlug(offer.title, offerDraftId);
  const finalSlug = existingLink?.slug || slug;
  const baseUrl = getBaseUrl();
  const payPageUrl = `${baseUrl}/pay/${finalSlug}`;

  // Provision Whop product + plan
  const whop = await provisionWhopCheckout({
    title:       offer.title,
    description: offer.description ?? offer.title,
    price_cents: offer.price,
    redirect_url: `${payPageUrl}?success=1`,
  });

  const { data: savedLink, error: saveErr } = await db
    .from("payment_links")
    .upsert({
      creator_id:       user.id,
      offer_draft_id:   offerDraftId,
      title:            offer.title,
      description:      offer.description ?? null,
      price:            offer.price,
      content_type:     "text",
      content_value:    offer.description ?? offer.title,
      whop_product_id:  whop?.whop_product_id  ?? null,
      whop_checkout_id: whop?.whop_checkout_id ?? null,
      whop_checkout_url: whop?.whop_checkout_url ?? null,
      slug:             finalSlug,
      is_active:        true,
      is_live:          true,
      updated_at:       new Date().toISOString(),
    }, { onConflict: "offer_draft_id,creator_id" })
    .select("id, slug")
    .single();

  if (saveErr || !savedLink) {
    console.error("[offers/launch] upsert payment_link failed:", saveErr?.message);
    return NextResponse.json({ error: "Failed to upsert payment link" }, { status: 500 });
  }

  const paymentLinkId = savedLink.id;
  const persistedSlug = savedLink.slug || finalSlug;
  const persistedPayPageUrl = `${baseUrl}/pay/${persistedSlug}`;

  // Mark offer as active
  const { error: offerUpdateErr } = await db
    .from("offer_drafts")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", offerDraftId);

  if (offerUpdateErr) {
    console.error("[offers/launch] update offer_drafts failed:", offerUpdateErr.message);
    // Log but don't fail; payment link was already created
  }

  return NextResponse.json({
    payment_link_id:   paymentLinkId,
    pay_url:           persistedPayPageUrl,
    whop_checkout_url: whop?.whop_checkout_url ?? null,
    whop_product_id:   whop?.whop_product_id ?? null,
    slug:              persistedSlug,
    whop_provisioned:  !!whop,
  });
}
