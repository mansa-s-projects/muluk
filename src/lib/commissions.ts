/**
 * Commission Inbox — library helpers
 * Whop checkout for commission payments + type definitions
 */

const WHOP_API_BASE = "https://api.whop.com/api/v2";

export interface Commission {
  id: string;
  creator_id: string;
  fan_email: string;
  fan_name: string | null;
  title: string;
  description: string;
  budget_cents: number;
  deadline: string | null;
  notes: string | null;
  status: "pending" | "accepted" | "rejected" | "paid" | "delivered" | "cancelled";
  agreed_cents: number | null;
  whop_product_id: string | null;
  whop_checkout_id: string | null;
  whop_payment_id: string | null;
  access_token: string;
  paid_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionMessage {
  id: string;
  commission_id: string;
  sender_role: "creator" | "fan";
  content: string;
  created_at: string;
}

export function formatPrice(cents: number): string {
  if (cents % 100 === 0) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Create a Whop one-time checkout for a commission payment.
 * Called after creator accepts and sets agreed_cents.
 */
export async function provisionCommissionCheckout(opts: {
  commissionId: string;
  fanEmail: string;
  title: string;
  agreedCents: number;
  redirectUrl: string;
}): Promise<{
  whop_product_id: string;
  whop_checkout_id: string;
  whop_checkout_url: string;
} | null> {
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!apiKey || !companyId) return null;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. Create product
    const productRes = await fetch(`${WHOP_API_BASE}/companies/${companyId}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `Commission: ${opts.title.slice(0, 60)}`,
        visibility: "hidden",
      }),
    });
    if (!productRes.ok) return null;
    const product = await productRes.json();

    // 2. Create one-time plan with commission metadata
    const planRes = await fetch(`${WHOP_API_BASE}/products/${product.id}/plans`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        plan_type: "one_time",
        initial_price: (opts.agreedCents / 100).toFixed(2),
        redirect_url: opts.redirectUrl,
        metadata: {
          commission_id: opts.commissionId,
          commission_payment: "true",
        },
      }),
    });
    if (!planRes.ok) return null;
    const plan = await planRes.json();

    return {
      whop_product_id: product.id,
      whop_checkout_id: plan.id,
      whop_checkout_url: `https://whop.com/checkout/${plan.id}/?email=${encodeURIComponent(opts.fanEmail)}`,
    };
  } catch {
    return null;
  }
}
