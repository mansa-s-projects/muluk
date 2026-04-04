import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/payment-links
 * Returns all payment links for the authenticated creator.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("payment_links")
    .select(
      "id, title, description, price, content_type, cover_image_url, whop_checkout_url, is_active, view_count, purchase_count, created_at"
    )
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

/**
 * POST /api/payment-links
 * Creates a new payment link.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, price, content_type, content_value, cover_image_url, whop_checkout_url } = body as Record<string, string>;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum < 50) {
    return NextResponse.json({ error: "Minimum price is $0.50 (50 cents)" }, { status: 400 });
  }
  if (!whop_checkout_url?.trim()) {
    return NextResponse.json({ error: "Whop checkout URL is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("payment_links")
    .insert({
      creator_id:       user.id,
      title:            title.trim(),
      description:      description?.trim() || null,
      price:            priceNum,
      content_type:     content_type || "text",
      content_value:    content_value?.trim() || null,
      cover_image_url:  cover_image_url?.trim() || null,
      whop_checkout_url: whop_checkout_url.trim(),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { id: data.id },
    { status: 201 }
  );
}
