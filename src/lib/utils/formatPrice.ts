/**
 * formatPrice
 *
 * Normalizes a raw price_label from the DB into a display string.
 *
 * Rules:
 *   "49"      → "$49"
 *   "49.00"   → "$49"       (drops trailing .00)
 *   "49.5"    → "$49.50"
 *   "29/mo"   → "$29/mo"    (preserves suffix)
 *   "$49"     → "$49"       (already prefixed — no double $)
 *   "Free"    → "Free"      (non-numeric — returned as-is)
 *   null/""   → ""
 */
export function formatPrice(raw: string | null | undefined): string {
  if (!raw) return "";
  const s = raw.trim();
  if (!s) return "";

  // Already has a currency symbol — return as-is
  if (/^[$£€¥₹]/.test(s)) return s;

  // Try to extract a leading number and optional suffix (e.g. "/mo", " USD")
  const match = s.match(/^(\d+(?:\.\d+)?)(.*)/);
  if (!match) return s; // non-numeric like "Free" or "Contact us"

  const [, numStr, suffix] = match;
  const num = parseFloat(numStr);

  // Format number: drop .00, keep meaningful decimals
  const formatted =
    num % 1 === 0
      ? String(Math.round(num))
      : num.toFixed(2).replace(/\.?0+$/, "");

  return `$${formatted}${suffix}`;
}
