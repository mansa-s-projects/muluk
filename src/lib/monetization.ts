import crypto from "crypto";

/**
 * Generate a cryptographically secure random code.
 * Format: MULUK-XXXXXXXXXX (10 alphanumeric chars)
 */
export function generateFanCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  const bytes = crypto.randomBytes(10);
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `FAN-${code}`;
}

/**
 * Calculate platform fee and creator earnings.
 * Uses MULUK tier system: 12% default, 10% Legend, 8% Apex
 */
export function calculateSplit(
  amountCents: number,
  tier: "cipher" | "legend" | "apex" = "cipher"
): { platformFee: number; creatorEarnings: number } {
  const rates: Record<string, number> = {
    cipher: 0.12,
    legend: 0.10,
    apex: 0.08,
  };
  const rate = rates[tier] ?? 0.12;
  const platformFee = Math.round(amountCents * rate);
  const creatorEarnings = amountCents - platformFee;
  return { platformFee, creatorEarnings };
}

/**
 * Sanitize and validate a fan code parameter.
 * Returns null if invalid.
 */
export function sanitizeFanCode(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase();
  // Must match FAN-XXXXXXXXXX format
  if (/^FAN-[A-Z2-9]{10}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

/**
 * Format cents to display price string.
 */
export function formatPrice(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
