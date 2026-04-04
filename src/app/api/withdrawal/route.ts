import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserTier } from "@/lib/tiers";

/**
 * GET /api/withdrawal
 * Returns the creator's available balance and withdrawal history.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Available balance from the view (filter to this creator at API layer)
  const { data: balanceRows, error: balanceErr } = await supabase
    .from("creator_available_balance")
    .select("total_earned_cents, total_withdrawn_cents, available_cents")
    .eq("creator_id", user.id)
    .maybeSingle();

  if (balanceErr) {
    return NextResponse.json({ error: balanceErr.message }, { status: 500 });
  }

  // Recent withdrawal requests
  const { data: requests, error: reqErr } = await supabase
    .from("withdrawal_requests")
    .select(
      "id, amount_cents, currency, payout_method, status, requested_at, completed_at, external_tx_id, admin_notes"
    )
    .eq("creator_id", user.id)
    .order("requested_at", { ascending: false })
    .limit(50);

  if (reqErr) {
    return NextResponse.json({ error: reqErr.message }, { status: 500 });
  }

  const creatorTier = await getUserTier(user.id, supabase);

  return NextResponse.json({
    success: true,
    balance: balanceRows ?? { total_earned_cents: 0, total_withdrawn_cents: 0, available_cents: 0 },
    requests: requests ?? [],
    tier: {
      slug:         creatorTier.slug,
      payout_speed: creatorTier.payout_speed,
    },
  });
}

/**
 * POST /api/withdrawal
 * Submit a new withdrawal request.
 *
 * Body: { amount_cents: number }
 * Payout method + details are read from creator_payout_settings.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { amount_cents?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount_cents = Number(body.amount_cents);
  if (!Number.isInteger(amount_cents) || amount_cents < 1000) {
    return NextResponse.json(
      { error: "Minimum withdrawal is $10.00 (1000 cents)" },
      { status: 400 }
    );
  }

  // Check available balance
  const { data: balance } = await supabase
    .from("creator_available_balance")
    .select("available_cents")
    .eq("creator_id", user.id)
    .maybeSingle();

  const available = balance?.available_cents ?? 0;
  if (amount_cents > available) {
    return NextResponse.json(
      { error: `Insufficient balance. Available: $${(available / 100).toFixed(2)}` },
      { status: 400 }
    );
  }

  // Fetch payout settings
  const { data: payoutSettings } = await supabase
    .from("creator_payout_settings")
    .select("method, whop_account_id, stripe_account_id, wise_email, crypto_wallet, paypal_email")
    .eq("creator_id", user.id)
    .maybeSingle();

  if (!payoutSettings) {
    return NextResponse.json(
      { error: "No payout method configured. Add one in Settings → Payouts." },
      { status: 400 }
    );
  }

  const method = payoutSettings.method ?? "whop";
  const details =
    method === "whop"   ? payoutSettings.whop_account_id :
    method === "stripe" ? payoutSettings.stripe_account_id :
    method === "wise"   ? payoutSettings.wise_email :
    method === "crypto" ? payoutSettings.crypto_wallet :
    method === "paypal" ? payoutSettings.paypal_email :
    null;

  if (!details) {
    return NextResponse.json(
      { error: `Payout method "${method}" is configured but missing account details.` },
      { status: 400 }
    );
  }

  // Block duplicate pending requests
  const { data: existing } = await supabase
    .from("withdrawal_requests")
    .select("id")
    .eq("creator_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending withdrawal. Wait for it to complete before requesting another." },
      { status: 409 }
    );
  }

  const { data: newRequest, error: insertErr } = await supabase
    .from("withdrawal_requests")
    .insert({
      creator_id:     user.id,
      amount_cents,
      currency:       "usd",
      payout_method:  method,
      payout_details: details,
      status:         "pending",
    })
    .select("id, amount_cents, currency, payout_method, status, requested_at")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, request: newRequest }, { status: 201 });
}
