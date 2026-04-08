import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { provisionWhopCheckout } from "@/lib/whop";

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
  "id, title, description, price, content_type, content_value, file_url, is_active, view_count, purchase_count, slug, whop_checkout_url, whop_product_id, is_live, created_at"
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

  const { title, description, price, content_type, content_value, file_url } = body as Record<string, string>;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum < 50) {
    return NextResponse.json({ error: "Minimum price is $0.50 (50 cents)" }, { status: 400 });
  }
  if (content_type !== "text" && content_type !== "file") {
    return NextResponse.json({ error: "content_type must be text or file" }, { status: 400 });
  }

  const normalizedContentValue = content_value?.trim() || null;
  const normalizedFileUrl = file_url?.trim() || null;
  if (content_type === "text" && !normalizedContentValue) {
    return NextResponse.json({ error: "Text content is required" }, { status: 400 });
  }
  if (content_type === "file" && !normalizedFileUrl) {
    return NextResponse.json({ error: "File URL is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("payment_links")
    .insert({
      creator_id:       user.id,
      title:            title.trim(),
      description:      description?.trim() || null,
      price:            priceNum,
      content_type,
      content_value:    content_type === "text" ? normalizedContentValue : null,
      file_url:         content_type === "file" ? normalizedFileUrl : null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Validate baseUrl before attempting Whop provisioning
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "";
  let baseUrlValid = false;
  if (baseUrl) {
    try {
      new URL(baseUrl);
      baseUrlValid = true;
    } catch {
      console.error("Invalid NEXT_PUBLIC_BASE_URL:", baseUrl);
    }
  }

  if (!baseUrlValid) {
    console.error("NEXT_PUBLIC_BASE_URL is missing or invalid");
    return NextResponse.json(
      { error: "Server misconfiguration: payment provisioning unavailable" },
      { status: 500 }
    );
  }

  try {
    const slug = `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${data.id.slice(0, 8)}`;
    const redirectUrl = `${baseUrl}/pay/${slug}?success=1`;

    const whop = await provisionWhopCheckout({
      title: title.trim(),
      description: description?.trim() || undefined,
      price_cents: priceNum,
      redirect_url: redirectUrl,
    });

    const updatePayload: Record<string, unknown> = { slug };
    if (whop) {
      updatePayload.whop_product_id  = whop.whop_product_id;
      updatePayload.whop_checkout_id = whop.whop_checkout_id;
      updatePayload.whop_checkout_url = whop.whop_checkout_url;
      updatePayload.is_live           = true;
    }

    const { error: updateError } = await supabase
      .from("payment_links")
      .update(updatePayload)
      .eq("id", data.id);

    if (updateError) {
      console.error("Failed to update payment link:", { id: data.id, error: updateError });
      return NextResponse.json(
        { error: "Failed to save payment link" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { id: data.id, slug, whop_provisioned: !!whop },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error during payment link provisioning:", err);
    // Still try to save slug even if Whop fails
    const slug = `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${data.id.slice(0, 8)}`;
    const { error: updateError } = await supabase
      .from("payment_links")
      .update({ slug })
      .eq("id", data.id);

    if (updateError) {
      console.error("Failed to save slug on error recovery:", { id: data.id, error: updateError });
    }

    return NextResponse.json(
      { id: data.id, slug, whop_provisioned: false, error: "Whop provisioning failed" },
      { status: 201 }
    );
  }
}
