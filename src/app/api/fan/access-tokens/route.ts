import crypto from "node:crypto";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { hashAccessToken } from "@/lib/token-hash";

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/fan/access-tokens?payment_link_id=[id]&since=[isoTimestamp]
 *
 * Polls for an access token for a recent purchase on the given payment_link_id.
 * `since` limits results to purchases created after that timestamp — set this
 * to the moment the buyer was redirected to Whop so only their purchase matches.
 *
 * Returns { token, access_url } when the webhook has processed the payment,
 * or { token: null } while still pending.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentLinkId = searchParams.get("payment_link_id")?.trim();
  const since         = searchParams.get("since")?.trim();

  if (!paymentLinkId) {
    return NextResponse.json({ error: "payment_link_id required" }, { status: 400 });
  }

  const sinceDate = since ? new Date(since) : null;
  if (since && (!sinceDate || isNaN(sinceDate.getTime()))) {
    return NextResponse.json({ error: "Invalid since timestamp" }, { status: 400 });
  }

  const db = getDb();

  // Find recent paid purchases for this link created after `since`
  let q = db
    .from("purchases")
    .select("id, whop_order_id")
    .eq("payment_link_id", paymentLinkId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(5);

  if (sinceDate) {
    q = q.gte("created_at", sinceDate.toISOString());
  }

  const { data: purchases, error: pErr } = await q;
  if (pErr) {
    console.error("[access-tokens] purchases query failed:", pErr.message);
    return NextResponse.json({ token: null });
  }

  if (!purchases || purchases.length === 0) {
    return NextResponse.json({ token: null });
  }

  const orderRefs = (purchases as { whop_order_id?: string | null }[])
    .map((p) => p.whop_order_id)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  if (orderRefs.length === 0) {
    return NextResponse.json({ token: null });
  }

  const { data: row, error: tokenErr } = await db
    .from("payment_link_accesses")
    .select("access_token, granted_at")
    .eq("payment_link_id", paymentLinkId)
    .in("transaction_ref", orderRefs)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tokenErr) {
    console.error("[access-tokens] access token query failed:", tokenErr.message);
    return NextResponse.json({ error: "Failed to fetch access token" }, { status: 500 });
  }

  if (!row) return NextResponse.json({ token: null });

  return NextResponse.json({
    token:      row.access_token,
    access_url: `/pay/${paymentLinkId}?token=${encodeURIComponent(row.access_token)}`,
    granted_at: row.granted_at,
  });
}

/**
 * POST /api/fan/access-tokens
 * Body: { purchase_id, expires_in_days? }
 * Creates a secure access token for a purchase (internal / server-side use).
 */
export async function POST(request: NextRequest) {
  const internalKey = process.env.INTERNAL_API_KEY?.trim() || process.env.INTERNAL_BEARER?.trim();
  const authHeader = request.headers.get("authorization")?.trim();
  const expectedAuth = internalKey ? `Bearer ${internalKey}` : null;

  if (!internalKey) {
    console.error("[access-tokens] INTERNAL_API_KEY/INTERNAL_BEARER is not configured");
    return NextResponse.json({ error: "Access token service unavailable" }, { status: 503 });
  }

  if (!authHeader || authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  let body: { purchase_id?: string; expires_in_days?: number } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { purchase_id, expires_in_days = 365 } = body;
  if (!purchase_id) {
    return NextResponse.json({ error: "purchase_id required" }, { status: 400 });
  }

  const parsedExpiresDays = Number(expires_in_days);
  if (!Number.isInteger(parsedExpiresDays) || parsedExpiresDays <= 0) {
    return NextResponse.json({ error: "expires_in_days must be a positive integer" }, { status: 400 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashAccessToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parsedExpiresDays);

  const { data, error } = await db
    .from("access_tokens")
    .insert({ purchase_id, token_hash: tokenHash, expires_at: expiresAt.toISOString() })
    .select("id, expires_at")
    .single();

  if (error || !data) {
    console.error("[access-tokens] insert failed:", error?.message);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }

  return NextResponse.json({
    token,
    access_url: `/fan/access/${token}`,
    expires_at: data.expires_at,
  });
}
