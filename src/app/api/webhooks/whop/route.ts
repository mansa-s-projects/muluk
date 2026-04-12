import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { generateAccessToken } from "@/lib/access-token";
import { createUnlock } from "@/lib/unlocks";

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
    // Route by metadata priority: vault → commission → tip → fan_code
    const paymentMeta = (data.metadata as Record<string, unknown>) ?? {};
    if (paymentMeta.booking_id && paymentMeta.booking_payment === "true") {
      return handleBookingPaymentCompleted(supabase, data, paymentMeta);
    }
    if (paymentMeta.vault_purchase_id) {
      return handleVaultPurchaseCompleted(supabase, data);
    }
    if (paymentMeta.commission_id && paymentMeta.commission_payment === "true") {
      return handleCommissionPaymentCompleted(supabase, data, paymentMeta);
    }
    if (paymentMeta.tip_id && paymentMeta.tip_payment === "true") {
      return handleTipPaymentCompleted(supabase, data, paymentMeta);
    }
    if (paymentMeta.series_purchase_id && paymentMeta.series_payment === "true") {
      return handleSeriesPurchaseCompleted(supabase, data, paymentMeta);
    }
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

  // ── membership.went_valid — offer purchased on Whop ──────────────────────
  // Triggered when a buyer's membership becomes active (one-time or recurring).
  // Whop payload includes metadata.offer_id and membership.user.id which we
  // set when creating the Whop product via provisionWhopCheckout.
  if (eventType === "membership.went_valid") {
    return handleMembershipValid(data);
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
      const { data: existingTx } = await supabase
        .from("transactions_v2")
        .select("id")
        .eq("whop_payment_id", whopPaymentId)
        .maybeSingle();

      if (existingTx) {
        const { data: existingAccess } = await supabase
          .from("payment_link_accesses")
          .select("access_token")
          .eq("payment_link_id", paymentLinkId)
          .eq("transaction_ref", whopPaymentId)
          .maybeSingle();

        if (existingAccess?.access_token) {
          return NextResponse.json({
            received: true,
            action: "payment_link_access_granted",
            access_token: existingAccess.access_token,
            pay_url: `/fan/access/${existingAccess.access_token}`,
          });
        }
      }

      const whopProductId = String(data.product_id ?? metadata.whop_product_id ?? "");
      const result = await grantPaymentLinkAccess(supabase, {
        paymentLinkId,
        whopOrderId: whopPaymentId,
        buyerEmail: buyerEmail || null,
        amountCents,
        whopProductId: whopProductId || null,
      });
    console.info(
      `[whop-webhook] payment.completed (payment_link) — link=${paymentLinkId} token=${result.access_token}`
    );
    return NextResponse.json({
      received:     true,
      action:       "payment_link_access_granted",
      access_token: result.access_token,
      pay_url:      `/fan/access/${result.access_token}`,
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

  // ── Referral intelligence attribution (non-blocking) ─────────────────────
  await supabase
    .rpc("increment_referral_revenue", {
      p_referred_id: content.creator_id,
      p_amount: amount,
      p_event_type: "purchase",
      p_metadata: {
        source: "whop_webhook",
        whop_payment_id: whopPaymentId,
        fan_code: normalizedCode,
        content_id: content.id,
      },
    })
    .then(({ error }) => {
      if (error) {
        console.warn("[whop-webhook] referral attribution failed", {
          creatorId: content.creator_id,
          error: error.message,
        });
      }
    });

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
  opts: {
    paymentLinkId: string;
    whopOrderId: string;
    buyerEmail: string | null;
    amountCents?: number;
    whopProductId?: string | null;
  }
): Promise<{ access_token: string }> {
  const { paymentLinkId, whopOrderId, buyerEmail, amountCents = 0, whopProductId } = opts;

  const { data: existingAccess } = await supabase
    .from("payment_link_accesses")
    .select("access_token")
    .eq("payment_link_id", paymentLinkId)
    .eq("transaction_ref", whopOrderId)
    .maybeSingle();

  if (existingAccess?.access_token) {
    return { access_token: existingAccess.access_token };
  }

  // Resolve creator_id from payment_links
  const { data: pl, error: plError } = await supabase
    .from("payment_links")
    .select("creator_id, purchase_count, whop_product_id")
    .eq("id", paymentLinkId)
    .maybeSingle();

  if (plError) {
    console.error(`Failed to fetch payment link ${paymentLinkId}:`, plError);
    throw new Error(`Payment link lookup failed: ${plError.message}`);
  }

  if (!pl) {
    console.error(`Payment link not found: ${paymentLinkId}`);
    throw new Error(`Payment link not found: ${paymentLinkId}`);
  }

  const creatorId = pl.creator_id ?? null;
  const resolvedProductId = whopProductId ?? pl.whop_product_id ?? null;

  const { data: access, error } = await supabase
    .from("payment_link_accesses")
    .insert({
      payment_link_id: paymentLinkId,
      transaction_ref: whopOrderId,
      buyer_email:     buyerEmail,
    })
    .select("access_token")
    .single();

  if (error || !access) {
    throw new Error(`grantPaymentLinkAccess failed: ${error?.message ?? "unknown"}`);
  }

  // ── Record in purchases table ────────────────────────────────────────────
  let purchaseId: string | null = null;
  if (creatorId) {
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        buyer_email:      buyerEmail,
        creator_id:       creatorId,
        payment_link_id:  paymentLinkId,
        whop_order_id:    whopOrderId,
        whop_product_id:  resolvedProductId,
        status:           "paid",
        amount:           amountCents,
        currency:         "usd",
      })
      .select("id")
      .single();

    if (purchaseError) {
      console.error("Failed to insert purchase:", { paymentLinkId, whopOrderId, error: purchaseError });
      await supabase
        .from("payment_link_accesses")
        .delete()
        .eq("payment_link_id", paymentLinkId)
        .eq("transaction_ref", whopOrderId);
      throw new Error(`Failed to record purchase: ${purchaseError.message}`);
    }

    purchaseId = purchase?.id ?? null;
    if (!purchaseId) {
      console.error("Purchase inserted but no ID returned");
      throw new Error("Purchase record created without ID");
    }
  }

  // Atomic purchase_count increment
  const rpcResult = await supabase
    .rpc('increment_payment_link_purchase_count', { payment_link_id: paymentLinkId });

  if (rpcResult.error) {
    console.error(`Failed to increment purchase_count for ${paymentLinkId}:`, rpcResult.error);
  }

  // ── Record in access_entitlements ────────────────────────────────────────
  if (creatorId && purchaseId) {
    const { error: entitlementError } = await supabase
      .from("access_entitlements")
      .insert({
        purchase_id:      purchaseId,
        creator_id:       creatorId,
        unlock_type:      "payment_link",
        payment_link_id:  paymentLinkId,
        buyer_email:      buyerEmail,
        active:           true,
      });

    if (entitlementError) {
      console.error("Failed to create access entitlement:", { purchaseId, paymentLinkId, error: entitlementError });
      // Log but don't fail; user can still access via payment_link_accesses
    }
  }

  // ── Generate secure 64-char hex access token ─────────────────────────────
  let secureToken: string = access.access_token; // fallback to UUID from payment_link_accesses
  if (purchaseId) {
    try {
      secureToken = await generateAccessToken(purchaseId);
    } catch (err) {
      console.error("[whop-webhook] generateAccessToken failed — falling back to payment_link_accesses token:", {
        purchaseId,
        err: err instanceof Error ? err.message : err,
      });
    }
  }

  return { access_token: secureToken };
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

  const { data: refundedPurchases } = await supabase
    .from("purchases")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("whop_order_id", whopPaymentId)
    .select("id, payment_link_id");

  const purchaseIds = (refundedPurchases || []).map((p) => p.id);
  if (purchaseIds.length > 0) {
    await supabase
      .from("access_entitlements")
      .update({ active: false })
      .in("purchase_id", purchaseIds);
  }

  await supabase
    .from("payment_link_accesses")
    .delete()
    .eq("transaction_ref", whopPaymentId);

  // Expire access_tokens for refunded purchases so token-based unlock is revoked
  if (purchaseIds.length > 0) {
    await supabase
      .from("access_tokens")
      .update({ expires_at: new Date().toISOString() })
      .in("purchase_id", purchaseIds);
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

// ─────────────────────────────────────────────────────────────────────────────
// membership.went_valid — grant unlock_content access after Whop purchase
//
// Expected Whop payload shape:
//   event: "membership.went_valid"
//   data: {
//     id: "<membership_id>",
//     user: { id: "<whop_user_id>" },
//     product_id: "<whop_product_id>",
//     metadata: {
//       offer_id:    "<uuid>",   ← set via provisionWhopCheckout
//       creator_id:  "<uuid>",   ← set via provisionWhopCheckout
//       user_id:     "<uuid>",   ← CIPHER auth.users UUID (optional — falls back to lookup)
//     }
//   }
// ─────────────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handleMembershipValid(data: Record<string, unknown>) {
  const metadata  = (data.metadata as Record<string, unknown>) ?? {};
  const offerId   = typeof metadata.offer_id   === "string" ? metadata.offer_id.trim()   : "";
  const creatorId = typeof metadata.creator_id  === "string" ? metadata.creator_id.trim() : "";
  let   userId    = typeof metadata.user_id     === "string" ? metadata.user_id.trim()    : "";

  // ── Validate required IDs ─────────────────────────────────────────────────
  if (!offerId || !UUID_RE.test(offerId)) {
    console.warn("[whop-webhook] membership.went_valid — missing or invalid offer_id in metadata");
    return NextResponse.json({ received: true, action: "offer_unlock_skipped", reason: "no_offer_id" });
  }

  if (!creatorId || !UUID_RE.test(creatorId)) {
    console.warn("[whop-webhook] membership.went_valid — missing or invalid creator_id in metadata");
    return NextResponse.json({ received: true, action: "offer_unlock_skipped", reason: "no_creator_id" });
  }

  // ── Resolve user_id if not in metadata ───────────────────────────────────
  // Falls back to looking up by whop user ID in creator_profiles if available.
  if (!userId || !UUID_RE.test(userId)) {
    const whopUserId = typeof (data.user as Record<string, unknown>)?.id === "string"
      ? String((data.user as Record<string, unknown>).id)
      : "";

    if (whopUserId) {
      const supabase = getSupabase();
      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("user_id")
        .eq("whop_user_id", whopUserId)
        .maybeSingle();

      userId = profile?.user_id ?? "";
    }

    if (!userId || !UUID_RE.test(userId)) {
      console.warn("[whop-webhook] membership.went_valid — cannot resolve CIPHER user_id for whop user", data.user);
      return NextResponse.json({ received: true, action: "offer_unlock_skipped", reason: "no_user_id" });
    }
  }

  // ── Insert unlock row ─────────────────────────────────────────────────────
  const result = await createUnlock({ offerId, userId });

  if (!result.ok) {
    console.error("[whop-webhook] createUnlock failed:", result.error);
    // Return 500 so Whop retries delivery
    return NextResponse.json({ error: "Failed to create unlock" }, { status: 500 });
  }

  console.info(`[whop-webhook] membership.went_valid — offer=${offerId} user=${userId} unlocked`);
  return NextResponse.json({ received: true, action: "offer_unlocked", offer_id: offerId });
}
// ─────────────────────────────────────────────────────────────────────────────
// Vault purchase — payment confirmed by Whop
// ─────────────────────────────────────────────────────────────────────────────

async function handleVaultPurchaseCompleted(
  supabase: ReturnType<typeof getSupabase>,
  data: Record<string, unknown>
) {
  const whopPaymentId   = String(data.id ?? "");
  const metadata        = (data.metadata as Record<string, unknown>) ?? {};
  const vaultPurchaseId = String(metadata.vault_purchase_id ?? "");
  const amountCents     = Number(data.amount ?? data.amount_cents ?? 0);

  if (!whopPaymentId || !vaultPurchaseId) {
    return NextResponse.json({ error: "Missing vault payment data" }, { status: 400 });
  }

  // Idempotency: fetch existing purchase
  const { data: purchase } = await supabase
    .from("vault_purchases")
    .select("id, status, vault_item_id")
    .eq("id", vaultPurchaseId)
    .maybeSingle();

  if (!purchase) {
    return NextResponse.json({ received: true, action: "vault_purchase_not_found" });
  }
  if (purchase.status === "paid") {
    return NextResponse.json({ received: true, action: "vault_duplicate_skipped" });
  }

  // Mark as paid
  const { data: vaultUpdated, error: vaultUpdateError } = await supabase
    .from("vault_purchases")
    .update({
      status:          "paid",
      whop_payment_id: whopPaymentId,
      paid_at:         new Date().toISOString(),
      ...(amountCents > 0 ? { amount_cents: amountCents } : {}),
    })
    .eq("id", vaultPurchaseId)
    .select("id");

  if (vaultUpdateError || !vaultUpdated || vaultUpdated.length === 0) {
    console.error("[whop-webhook] vault purchase update failed", {
      vaultPurchaseId,
      whopPaymentId,
      error: vaultUpdateError,
    });
    return NextResponse.json({ error: "Failed to persist vault purchase" }, { status: 500 });
  }

  // Increment purchase_count on the vault item
  if (purchase.vault_item_id) {
    await supabase.rpc("increment_vault_purchase_count", {
      item_id: purchase.vault_item_id,
    });
  }

  console.info(
    `[whop-webhook] vault purchase confirmed — purchase=${vaultPurchaseId} payment=${whopPaymentId}`
  );
  return NextResponse.json({ received: true, action: "vault_purchase_confirmed" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Commission payment — mark commission as paid
// ─────────────────────────────────────────────────────────────────────────────

async function handleCommissionPaymentCompleted(
  supabase: ReturnType<typeof getSupabase>,
  data: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  const whopPaymentId  = String(data.id ?? "");
  const commissionId   = String(metadata.commission_id ?? "");

  if (!whopPaymentId || !commissionId) {
    return NextResponse.json({ error: "Missing commission payment data" }, { status: 400 });
  }

  // Idempotency
  const { data: existing } = await supabase
    .from("commissions")
    .select("id, status")
    .eq("id", commissionId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ received: true, action: "commission_not_found" });
  }
  if (existing.status === "paid" || existing.status === "delivered") {
    return NextResponse.json({ received: true, action: "commission_duplicate_skipped" });
  }

  const { data: commissionUpdated, error: commissionUpdateError } = await supabase
    .from("commissions")
    .update({
      status:          "paid",
      whop_payment_id: whopPaymentId,
      paid_at:         new Date().toISOString(),
    })
    .eq("id", commissionId)
    .select("id");

  if (commissionUpdateError || !commissionUpdated || commissionUpdated.length === 0) {
    console.error("[whop-webhook] commission update failed", {
      commissionId,
      whopPaymentId,
      error: commissionUpdateError,
    });
    return NextResponse.json({ error: "Failed to persist commission payment" }, { status: 500 });
  }

  console.info(
    `[whop-webhook] commission paid — id=${commissionId} payment=${whopPaymentId}`
  );
  return NextResponse.json({ received: true, action: "commission_payment_confirmed" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tip payment — mark tip as paid so it appears on the Wall of Love
// ─────────────────────────────────────────────────────────────────────────────

async function handleTipPaymentCompleted(
  supabase: ReturnType<typeof getSupabase>,
  data: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  const whopPaymentId = String(data.id ?? "");
  const tipId         = String(metadata.tip_id ?? "");

  if (!whopPaymentId || !tipId) {
    return NextResponse.json({ error: "Missing tip payment data" }, { status: 400 });
  }

  // Idempotency
  const { data: existing } = await supabase
    .from("tips")
    .select("id, status")
    .eq("id", tipId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ received: true, action: "tip_not_found" });
  }
  if (existing.status === "paid") {
    return NextResponse.json({ received: true, action: "tip_duplicate_skipped" });
  }

  const { data: tipUpdated, error: tipUpdateError } = await supabase
    .from("tips")
    .update({
      status:          "paid",
      whop_payment_id: whopPaymentId,
      paid_at:         new Date().toISOString(),
    })
    .eq("id", tipId)
    .select("id");

  if (tipUpdateError || !tipUpdated || tipUpdated.length === 0) {
    console.error("[whop-webhook] tip update failed", {
      tipId,
      whopPaymentId,
      error: tipUpdateError,
    });
    return NextResponse.json({ error: "Failed to persist tip payment" }, { status: 500 });
  }

  console.info(
    `[whop-webhook] tip paid — id=${tipId} payment=${whopPaymentId}`
  );
  return NextResponse.json({ received: true, action: "tip_payment_confirmed" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking payment — mark booking as confirmed and lock availability slot
// ─────────────────────────────────────────────────────────────────────────────

async function handleBookingPaymentCompleted(
  supabase: ReturnType<typeof getSupabase>,
  data: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  const whopPaymentId = String(data.id ?? "");
  const bookingId = String(metadata.booking_id ?? "");

  if (!whopPaymentId || !bookingId) {
    return NextResponse.json({ error: "Missing booking payment data" }, { status: 400 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, availability_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ received: true, action: "booking_not_found" });
  }

  if (booking.status === "confirmed" || booking.status === "completed") {
    return NextResponse.json({ received: true, action: "booking_duplicate_skipped" });
  }

  const { data: slot } = await supabase
    .from("availability")
    .select("meeting_link")
    .eq("id", booking.availability_id)
    .maybeSingle();

  const { error: updateErr } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      whop_payment_id: whopPaymentId,
      paid_at: new Date().toISOString(),
      meeting_link: slot?.meeting_link ?? null,
    })
    .eq("id", bookingId);

  if (updateErr) {
    console.error("[whop-webhook] booking update failed", updateErr);
    return NextResponse.json({ error: "Failed to confirm booking" }, { status: 500 });
  }

  const { error: availabilityUpdateError } = await supabase
    .from("availability")
    .update({ is_booked: true })
    .eq("id", booking.availability_id);

  if (availabilityUpdateError) {
    console.error("[whop-webhook] availability update failed", {
      availabilityId: booking.availability_id,
      error: availabilityUpdateError,
    });
    await supabase
      .from("bookings")
      .update({ status: "pending", whop_payment_id: null, paid_at: null })
      .eq("id", bookingId);
    return NextResponse.json({ error: "Failed to lock availability" }, { status: 500 });
  }

  return NextResponse.json({ received: true, action: "booking_payment_confirmed" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Series purchase — mark series_purchases row as paid so fan can read content
// ─────────────────────────────────────────────────────────────────────────────

async function handleSeriesPurchaseCompleted(
  supabase: ReturnType<typeof getSupabase>,
  data: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  const whopPaymentId  = String(data.id ?? "");
  const purchaseId     = String(metadata.series_purchase_id ?? "");

  if (!whopPaymentId || !purchaseId) {
    return NextResponse.json({ error: "Missing series payment data" }, { status: 400 });
  }

  // Idempotency — skip if already paid
  const { data: existing } = await supabase
    .from("series_purchases")
    .select("id, status")
    .eq("id", purchaseId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ received: true, action: "series_purchase_not_found" });
  }
  if (existing.status === "paid") {
    return NextResponse.json({ received: true, action: "series_purchase_duplicate_skipped" });
  }

  const { data: seriesUpdated, error: seriesUpdateError } = await supabase
    .from("series_purchases")
    .update({
      status:          "paid",
      whop_payment_id: whopPaymentId,
      paid_at:         new Date().toISOString(),
    })
    .eq("id", purchaseId)
    .select("id");

  if (seriesUpdateError || !seriesUpdated || seriesUpdated.length === 0) {
    console.error("[whop-webhook] series purchase update failed", {
      purchaseId,
      whopPaymentId,
      error: seriesUpdateError,
    });
    return NextResponse.json({ error: "Failed to persist series purchase" }, { status: 500 });
  }

  console.info(
    `[whop-webhook] series purchase paid — id=${purchaseId} payment=${whopPaymentId}`
  );
  return NextResponse.json({ received: true, action: "series_purchase_confirmed" });
}