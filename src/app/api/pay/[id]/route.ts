import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
 * Increments view_count as a side-effect.
 */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  const { data, error } = await db
    .from("payment_links")
    .select(
      "id, title, description, price, content_type, cover_image_url, whop_checkout_url, view_count, purchase_count, created_at"
    )
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }

  // Fire-and-forget view increment
  db.from("payment_links")
    .update({ view_count: (data.view_count ?? 0) + 1 })
    .eq("id", id)
    .then(() => {});

  return NextResponse.json({ link: data });
}
