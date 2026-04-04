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
 * GET /api/pay/[id]/verify?token=<access_token>
 * Returns unlocked content_value if the token is valid for this payment link.
 * No authentication required — the token itself is the secret.
 */
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("token");

  if (!token?.trim()) {
    return NextResponse.json({ access: false, error: "Token required" }, { status: 400 });
  }

  const db = getDb();

  // Validate access token belongs to this payment link
  const { data: access, error: accessErr } = await db
    .from("payment_link_accesses")
    .select("id, granted_at")
    .eq("payment_link_id", id)
    .eq("access_token", token.trim())
    .single();

  if (accessErr || !access) {
    return NextResponse.json({ access: false }, { status: 200 });
  }

  // Fetch the locked content
  const { data: link, error: linkErr } = await db
    .from("payment_links")
    .select("content_value, content_type, title")
    .eq("id", id)
    .single();

  if (linkErr || !link) {
    return NextResponse.json({ access: false, error: "Link not found" }, { status: 404 });
  }

  return NextResponse.json({
    access: true,
    content_value: link.content_value,
    content_type:  link.content_type,
    granted_at:    access.granted_at,
  });
}
