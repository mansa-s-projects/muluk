import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

// Service-role client — bypasses RLS for webhook processing
function getSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Verify the Whop webhook signature.
 * Whop signs payloads using HMAC-SHA256 with the webhook secret.
 * Header: x-whop-signature: sha256=<hex>
 */
function verifyWhopSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[whop-webhook] WHOP_WEBHOOK_SECRET not set — skipping signature verification");
    return process.env.NODE_ENV === "development"; // allow in dev only
  }
  if (!signature) return false;

  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expected, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Whop platform fee tiers — mirrors subscription_tiers table.
 * Used to compute creator_earnings at webhook time.
 */
const PLATFORM_FEE_PCT: Record<string, number> = {
  cipher: 0.12,
  legend: 0.10,
  apex:   0.08,
};

async function getCreatorTier(supabase: ReturnType<typeof getSupabase>, creatorId: string): Promise<string> {
  const { data } = await supabase
    .from("creator_subscriptions")
    .select("tier_slug")
    .eq("creator_id", creatorId)
    .eq("status", "active")
    .maybeSingle();
  return data?.tier_slug ?? "cipher";
}

/**
 * POST /api/webhooks/whop
 *
 * Handles Whop payment events:
 *   - payment.completed  → mark fan_code as paid, record transaction, credit creator
 *   - payment.refunded   → mark transaction as refunded, revoke fan_code access
 *   - membership.went_valid → (future: subscription access grants)
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-whop-signature");

  if (!verifyWhopSignature(rawBody, signature)) {
    console.error("[whop-webhook] Signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event as string | undefined;
  const data = event.data as Record<string, unknown> | undefined;

  if (!eventType || !data) {
    return NextResponse.json({ error: "Missing event or data" }, { status: 400 });
  }

  const supabase = getSupabase();

  // ── payment.completed ─────────────────────────────────────────────────────
  if (eventType === "payment.completed") {
    return handlePaymentCompleted(supabase, data);
  }

  // ── payment.refunded ──────────────────────────────────────────────────────
  if (eventType === "payment.refunded") {
    return handlePaymentRefunded(supabase, data);
  }

  // ── withdrawal.completed (Whop payout settled) ────────────────────────────
  if (eventType === "payout.completed" || eventType === "transfer.completed") {
    return handlePayoutCompleted(supabase, data);
  }

  // Unknown event — return 200 so Whop stops retrying
  return NextResponse.json({ received: true, action: "ignored", event: eventType });
}

// ─────────────────────────────────────────────────────────────────────────────

async function handlePaymentCompleted(
  supabase: ReturnType<typeof getSupabase>,
  data: Record<string, unknown>
) {
  const whopPaymentId  = String(data.id ?? "");
  const metadata       = (data.metadata as Record<string, unknown>) ?? {};
  const fanCodeStr     = String(metadata.fan_code ?? "");
  const paymentLinkId  = String(metadata.payment_link_id ?? "");
  const buyerEmail     = String(metadata.buyer_email ?? data.email ?? "");
  const amountCents    = Number(data.amount ?? data.amount_cents ?? 0);

  if (!whopPaymentId) {
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }

  // ── Payment Link access grant (takes priority if metadata.payment_link_id set) ──
  if (paymentLinkId) {
    const result = await grantPaymentLinkAccess(supabase, paymentLinkId, whopPaymentId, buyerEmail || null);
    console.info(
      `[whop-webhook] payment.completed (payment_link) — link=${paymentLinkId} token=${result.access_token}`
    );
    return NextResponse.json({
      received:     true,
      action:       "payment_link_access_granted",
      access_token: result.access_token,
      pay_url:      `/pay/${paymentLinkId}?token=${result.access_token}`,
    });
  }

  // ── Idempotency: block duplicate processing ────────────────────────────────
  const { data: existing } = await supabase
    .from("transactions_v2")
    .select("id, status")
    .eq("whop_payment_id", whopPaymentId)
    .maybeSingle();

  if (existing?.status === "success") {
    return NextResponse.json({ received: true, action: "duplicate_skipped" });
  }

  // ── Resolve fan code ───────────────────────────────────────────────────────
  const normalizedCode = fanCodeStr.trim().toUpperCase();
  const { data: fanCode, error: codeErr } = await supabase
    .from("fan_codes_v2")
    .select("id, content_id, is_paid")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (codeErr || !fanCode) {
    console.error("[whop-webhook] Fan code not found:", normalizedCode, codeErr?.message);
    // Still return 200 — Whop retries on 4xx which would spam logs
    return NextResponse.json({ received: true, action: "fan_code_not_found", code: normalizedCode });
  }

  // ── Resolve content + creator ──────────────────────────────────────────────
  const { data: content } = await supabase
    .from("content_items_v2")
    .select("id, creator_id, price")
    .eq("id", fanCode.content_id)
    .single();

  if (!content) {
    return NextResponse.json({ received: true, action: "content_not_found" });
  }

  const tier       = await getCreatorTier(supabase, content.creator_id);
  const feePct     = PLATFORM_FEE_PCT[tier] ?? 0.12;
  const amount     = amountCents || content.price;
  const platformFee    = Math.round(amount * feePct);
  const creatorEarnings = amount - platformFee;

  // ── Upsert transaction ────────────────────────────────────────────────────
  const txPayload = {
    content_id:       content.id,
    fan_code_id:      fanCode.id,
    creator_id:       content.creator_id,
    amount,
    currency:         "usd",
    payment_method:   "whop",
    status:           "success",
    whop_payment_id:  whopPaymentId,
    platform_fee:     platformFee,
    creator_earnings: creatorEarnings,
  };

  if (existing) {
    // Update the pending transaction to success
    await supabase
      .from("transactions_v2")
      .update({ status: "success", platform_fee: platformFee, creator_earnings: creatorEarnings })
      .eq("whop_payment_id", whopPaymentId);
  } else {
    await supabase.from("transactions_v2").insert(txPayload);
  }

  // ── Mark fan code as paid (unlock access) ─────────────────────────────────
  if (!fanCode.is_paid) {
    await supabase
      .from("fan_codes_v2")
      .update({ is_paid: true, payment_method: "whop", paid_at: new Date().toISOString() })
      .eq("id", fanCode.id);
  }

  console.info(
    `[whop-webhook] payment.completed — code=${normalizedCode} amount=${amount} creator=${content.creator_id} earnings=${creatorEarnings}`
  );

  return NextResponse.json({
    received: true,
    action:   "payment_processed",
    fan_code: normalizedCode,
    creator_earnings_cents: creatorEarnings,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Grant access to a payment link and bump its purchase_count.
// Returns the new access_token so it can be included in confirmation redirects.
// ─────────────────────────────────────────────────────────────────────────────
async function grantPaymentLinkAccess(
  supabase: ReturnType<typeof getSupabase>,
  paymentLinkId: string,
  transactionRef: string,
  buyerEmail: string | null
): Promise<{ access_token: string }> {
  const { data: access, error } = await supabase
    .from("payment_link_accesses")
    .insert({
      payment_link_id: paymentLinkId,
      transaction_ref: transactionRef,
      buyer_email:     buyerEmail,
    })
    .select("access_token")
    .single();

  if (error || !access) {
    throw new Error(`grantPaymentLinkAccess failed: ${error?.message ?? "unknown"}`);
  }

  // Bump purchase_count (fire-and-forget; non-critical)
  supabase
    .from("payment_links")
    .select("purchase_count")
    .eq("id", paymentLinkId)
    .single()
    .then(({ data: pl }) => {
      if (pl) {
        supabase
          .from("payment_links")
          .update({ purchase_count: (pl.purchase_count ?? 0) + 1 })
          .eq("id", paymentLinkId)
          .then(() => {});
      }
    });

  return { access_token: access.access_token };
}

// ─────────────────────────────────────────────────────────────────────────────

async function handlePaymentRefunded(
  supabase: ReturnType<typeof getSupabase>,
  data: Record<string, unknown>
) {
  const whopPaymentId = String(data.id ?? "");
  if (!whopPaymentId) return NextResponse.json({ error: "Missing payment id" }, { status: 400 });

  // Mark transaction refunded
  const { data: tx } = await supabase
    .from("transactions_v2")
    .update({ status: "refunded" })
    .eq("whop_payment_id", whopPaymentId)
    .select("fan_code_id")
    .maybeSingle();

  // Revoke fan code access
  if (tx?.fan_code_id) {
    await supabase
      .from("fan_codes_v2")
      .update({ is_paid: false })
      .eq("id", tx.fan_code_id);
  }

  console.info(`[whop-webhook] payment.refunded — whop_payment_id=${whopPaymentId}`);
  return NextResponse.json({ received: true, action: "refund_processed" });
}

// ─────────────────────────────────────────────────────────────────────────────

async function handlePayoutCompleted(
  supabase: ReturnType<typeof getSupabase>,
  data: Record<string, unknown>
) {
  // Whop sends a reference ID we previously stored on the withdrawal_request
  const externalTxId = String(data.id ?? data.transfer_id ?? "");
  if (!externalTxId) return NextResponse.json({ received: true, action: "payout_ignored" });

  await supabase
    .from("withdrawal_requests")
    .update({
      status:       "completed",
      completed_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq("external_tx_id", externalTxId)
    .eq("status", "processing");

  console.info(`[whop-webhook] payout.completed — external_tx_id=${externalTxId}`);
  return NextResponse.json({ received: true, action: "payout_marked_complete" });
}
