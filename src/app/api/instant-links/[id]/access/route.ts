import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET         = "pay-links";
const SIGNED_URL_TTL = 3600; // 1 hour

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function signedUrl(filePath: string): Promise<string> {
  const { data, error } = await service()
    .storage
    .from(BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL);

  if (error || !data?.signedUrl) throw new Error("Failed to generate signed URL");
  return data.signedUrl;
}

// POST /api/instant-links/[id]/access
//
// Verifies a buyer_token belongs to a paid instant_purchase for this link.
// Returns a signed 1-hour content URL on success.
//
// Body: { buyer_token: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: linkId } = await params;
  const sb = service();

  const { data: link, error: linkErr } = await sb
    .from("pay_links")
    .select("id, file_path")
    .eq("id", linkId)
    .single();

  if (linkErr || !link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  let body: { buyer_token?: string } = {};
  try { body = await req.json(); } catch { /* empty body */ }

  const buyerToken = body.buyer_token?.trim();
  if (!buyerToken) {
    return NextResponse.json({ error: "buyer_token required" }, { status: 400 });
  }

  const { data: purchase, error: purchaseErr } = await sb
    .from("instant_purchases")
    .select("status")
    .eq("buyer_token", buyerToken)
    .eq("link_id", linkId)
    .single();

  if (purchaseErr || !purchase) {
    return NextResponse.json({ error: "Invalid access token" }, { status: 403 });
  }

  if (purchase.status === "refunded") {
    return NextResponse.json({ error: "This purchase has been refunded" }, { status: 403 });
  }

  if (purchase.status !== "paid") {
    // Payment may still be in-flight — client should poll briefly
    return NextResponse.json({ error: "Payment pending" }, { status: 402 });
  }

  const url = await signedUrl(link.file_path);
  return NextResponse.json({ url });
}
