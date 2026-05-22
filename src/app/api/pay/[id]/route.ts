import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

type Params = { params: Promise<{ id: string }> };

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/pay/[id]
 * Public — returns metadata for the payment link (no content_value).
 * Also returns the Whop checkout URL for client-side redirect.
 * Increments view_count as a side-effect.
 */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  // Support lookup by slug OR uuid
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  let query = db
    .from("payment_links")
    .select(
      // file_url is intentionally excluded — it is paid/download content and must
      // only be returned via the authenticated /verify endpoint after purchase.
      "id, title, description, price, content_type, view_count, purchase_count, created_at, whop_checkout_url, slug"
    )
    .eq("is_active", true);

  query = isUuid ? query.eq("id", id) : query.eq("slug", id);

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }

  // Atomic view count increment
  const { error: incrementError } = await db.rpc(
    "increment_payment_link_view_count",
    { payment_link_id: data.id }
  );

  if (incrementError) {
    console.warn("Failed to increment view count:", incrementError);
    // Continue despite view count failure
  }
  const effectiveViewCount = incrementError ? data.view_count : (data.view_count ?? 0) + 1;

  // Build Whop checkout URL with success redirect
  const baseUrl = getBaseUrl();
  const returnUrl = `${baseUrl}/pay/${data.slug ?? data.id}?success=1`;
  let checkoutUrl: string | null = null;

  if (data.whop_checkout_url) {
    // Inject redirect_url if not already present
    try {
      const u = new URL(data.whop_checkout_url);
      if (!u.searchParams.has("redirect_url")) {
        u.searchParams.set("redirect_url", returnUrl);
      }
      checkoutUrl = u.toString();
    } catch {
      checkoutUrl = data.whop_checkout_url;
    }
  }

  return NextResponse.json({
    link: {
      id:             data.id,
      title:          data.title,
      description:    data.description,
      price:          data.price,
      content_type:   data.content_type,
      view_count:     effectiveViewCount,
      purchase_count: data.purchase_count,
      created_at:     data.created_at,
      slug:           data.slug,
    },
    checkout_url: checkoutUrl,
  });
}
