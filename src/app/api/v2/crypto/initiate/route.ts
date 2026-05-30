import { NextResponse } from "next/server";

/**
 * POST /api/v2/crypto/initiate
 * Placeholder for future crypto payment integration.
 * Returns a mock wallet address and status.
 */
export async function POST(request: Request) {
  let body: { supporter_code?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const SupporterCode = body.supporter_code?.trim().toUpperCase();
  if (!SupporterCode) {
    return NextResponse.json({ error: "supporter_code is required" }, { status: 400 });
  }

  // ── Crypto integration placeholder ────────────────────────────────────────
  // Architecture is ready for:
  //   - USDC on Polygon
  //   - ETH / MATIC direct
  //   - Solana Pay
  //   - Bitcoin Lightning
  //
  // When implemented, this endpoint will:
  //   1. Fetch content price from content_items_v2
  //   2. Generate a unique payment address or payment intent
  //   3. Return address + amount + QR code data
  //   4. A separate webhook/polling mechanism confirms on-chain payment
  //   5. Updates supporter_codes_v2.is_paid = true, payment_method = 'crypto'
  //   6. Records transaction with crypto_tx_hash

  return NextResponse.json({
    success: false,
    data: {
      status: "coming_soon",
      message: "Crypto payments are coming soon. Use card payment for now.",
      supported_networks: [
        "polygon_usdc",
        "ethereum",
        "solana",
        "bitcoin_lightning",
      ],
      mock_wallet: "0x0000000000000000000000000000000000000000",
    },
  });
}
