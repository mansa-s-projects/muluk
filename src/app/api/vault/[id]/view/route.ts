/**
 * GET /api/vault/[id]/view?token=<access_token>
 *
 * Verifies fan owns a paid purchase for this vault item.
 * Returns a short-lived signed URL to the original file.
 *
 * Query params:
 *   token — access_token from vault_purchases
 */

import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getOriginalSignedUrl } from "@/lib/vault";

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url    = new URL(req.url);
  const token  = url.searchParams.get("token")?.trim() ?? "";

  if (!id || !token) {
    return NextResponse.json({ error: "Missing id or token" }, { status: 400 });
  }

  // Sanitize token — must be 48 hex chars (24 random bytes)
  if (!/^[0-9a-f]{48}$/.test(token)) {
    return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
  }

  const db = getDb();

  const { data: purchase, error } = await db
    .from("vault_purchases")
    .select("id, vault_item_id, status, whop_payment_id")
    .eq("access_token", token)
    .eq("vault_item_id", id)
    .maybeSingle();

  if (error || !purchase) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  if (purchase.status !== "paid") {
    return NextResponse.json(
      { error: "Payment not confirmed", status: purchase.status },
      { status: 402 }
    );
  }

  // Fetch item to get file_path
  const { data: item } = await db
    .from("vault_items")
    .select("file_path, mime_type, title")
    .eq("id", id)
    .maybeSingle();

  if (!item) {
    return NextResponse.json({ error: "Vault item not found" }, { status: 404 });
  }

  const signedUrl = await getOriginalSignedUrl(item.file_path);
  if (!signedUrl) {
    return NextResponse.json({ error: "Failed to generate access URL" }, { status: 500 });
  }

  return NextResponse.json({
    signed_url: signedUrl,
    mime_type:  item.mime_type,
    title:      item.title,
  });
}
