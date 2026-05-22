/**
 * Tip Jar — library helpers
 * Whop checkout for tips + type definitions
 */

const WHOP_API_BASE = "https://api.whop.com/api/v2";

export interface Tip {
  id: string;
  creator_id: string;
  display_name: string | null;
  is_anonymous: boolean;
  fan_email: string | null;
  amount_cents: number;
  message: string | null;
  status: "pending" | "paid" | "refunded";
  whop_payment_id: string | null;
  access_token: string;
  paid_at: string | null;
  created_at: string;
}

/** Tip row safe to expose on the public Wall of Love */
export interface PublicTip {
  id: string;
  display_name: string | null;
  is_anonymous: boolean;
  amount_cents: number;
  message: string | null;
  paid_at: string;
}

export const TIP_PRESETS = [300, 500, 1000, 2500, 5000]; // cents

export function formatTip(cents: number): string {
  if (cents % 100 === 0) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Create a Whop one-time checkout for a tip.
 */
export async function provisionTipCheckout(opts: {
  tipId: string;
  creatorHandle: string;
  amountCents: number;
  redirectUrl: string;
  fanEmail?: string;
}): Promise<{
  whop_product_id: string;
  whop_checkout_id: string;
  whop_checkout_url: string;
} | null> {
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.WHOP_API_KEY;
  if (!apiKey || !companyId) return null;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const productRes = await fetch(`${WHOP_API_BASE}/companies/${companyId}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `Tip for @${opts.creatorHandle} — ${formatTip(opts.amountCents)}`,
        visibility: "hidden",
      }),
    });
    if (!productRes.ok) return null;
    const product = await productRes.json();

    const planBody: Record<string, unknown> = {
      plan_type: "one_time",
      initial_price: (opts.amountCents / 100).toFixed(2),
      redirect_url: opts.redirectUrl,
      metadata: {
        tip_id: opts.tipId,
        tip_payment: "true",
      },
    };

    const planRes = await fetch(`${WHOP_API_BASE}/products/${product.id}/plans`, {
      method: "POST",
      headers,
      body: JSON.stringify(planBody),
    });
    if (!planRes.ok) {
      try {
        const deleteRes = await fetch(`${WHOP_API_BASE}/products/${product.id}`, {
          method: "DELETE",
          headers,
        });
        if (!deleteRes.ok) {
          console.error("[tips] orphaned Whop product cleanup failed", {
            productId: product.id,
            status: deleteRes.status,
          });
        }
      } catch (deleteErr) {
        console.error("[tips] orphaned Whop product cleanup failed", {
          productId: product.id,
          error: deleteErr,
        });
      }
      return null;
    }
    const plan = await planRes.json();

    const checkoutUrl = opts.fanEmail
      ? `https://whop.com/checkout/${plan.id}/?email=${encodeURIComponent(opts.fanEmail)}`
      : `https://whop.com/checkout/${plan.id}/`;

    return {
      whop_product_id: product.id,
      whop_checkout_id: plan.id,
      whop_checkout_url: checkoutUrl,
    };
  } catch {
    return null;
  }
}
