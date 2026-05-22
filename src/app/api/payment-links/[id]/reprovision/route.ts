import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { provisionWhopCheckout } from "@/lib/whop";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/payment-links/[id]/reprovision
 * Re-runs Whop product/plan creation for a link that has no checkout URL.
 * Creator-owned only.
 */
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: link, error: fetchErr } = await supabase
    .from("payment_links")
    .select("id, title, description, price, slug, creator_id")
    .eq("id", id)
    .eq("creator_id", user.id)
    .single();

  if (fetchErr || !link) {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }

  const baseUrl = getBaseUrl();
  const slug = link.slug ?? id;
  const redirectUrl = `${baseUrl}/pay/${slug}?success=1`;

  const whop = await provisionWhopCheckout({
    title: link.title,
    description: link.description ?? undefined,
    price_cents: link.price,
    redirect_url: redirectUrl,
  });

  if (!whop) {
    return NextResponse.json(
      { error: "Whop provisioning failed — check WHOP_API_KEY and try again" },
      { status: 502 }
    );
  }

  const { error: updateErr } = await supabase
    .from("payment_links")
    .update({
      whop_product_id: whop.whop_product_id,
      whop_checkout_id: whop.whop_checkout_id,
      whop_checkout_url: whop.whop_checkout_url,
      is_live: true,
    })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, whop_checkout_url: whop.whop_checkout_url });
}
