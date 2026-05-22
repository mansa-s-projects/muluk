import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/payment-links/[id]
 * Toggle is_active or update metadata (creator-owned only).
 */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowed: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") allowed.is_active = body.is_active;
  if (typeof body.title === "string") {
    const trimmed = body.title.trim();
    if (trimmed.length > 0) allowed.title = trimmed;
  }
  if (typeof body.whop_checkout_url === "string") {
    allowed.whop_checkout_url = body.whop_checkout_url.trim() || null;
    if (body.whop_checkout_url.trim()) allowed.is_live = true;
  }
  if (typeof body.whop_product_id === "string") allowed.whop_product_id = body.whop_product_id.trim() || null;
  if (typeof body.whop_checkout_id === "string") allowed.whop_checkout_id = body.whop_checkout_id.trim() || null;
  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("payment_links")
    .update(allowed)
    .eq("id", id)
    .eq("creator_id", user.id)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/payment-links/[id]
 * Permanently removes the payment link (creator-owned only).
 */
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("payment_links")
    .delete()
    .eq("id", id)
    .eq("creator_id", user.id)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
