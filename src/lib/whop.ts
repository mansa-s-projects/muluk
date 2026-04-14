/**
 * Whop API client for MULUK.
 * Handles programmatic product + plan creation for one-click monetization.
 *
 * Env required:
 *   WHOP_API_KEY          — Whop API key (also used as company_id in product creation)
 *   WHOP_WEBHOOK_SECRET   — Already used in webhook route
 */

const WHOP_API_BASE = "https://api.whop.com/api/v2";

function getWhopApiKey(): string {
  const key = process.env.WHOP_API_KEY;
  if (!key) throw new Error("WHOP_API_KEY env var not set");
  return key;
}

async function whopFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const apiKey = getWhopApiKey();
  const res = await fetch(`${WHOP_API_BASE}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Whop API ${path} → ${res.status}: ${body.slice(0, 200)}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text().catch(() => "");
  if (!text.trim()) {
    return null as T;
  }

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`Whop API ${path} returned non-JSON content`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Whop API ${path} returned invalid JSON`);
  }
}

export type WhopProduct = {
  id: string;
  name: string;
  slug: string;
  created_at: number;
};

export type WhopPlan = {
  id: string;
  plan_type: string;
  initial_price: string;
  redirect_url: string | null;
  access_pass: { id: string; slug: string };
};

/**
 * Create a Whop product (access pass wrapper).
 */
export async function createWhopProduct(name: string, description?: string): Promise<WhopProduct> {
  const companyId = process.env.WHOP_API_KEY;
  if (!companyId) throw new Error("WHOP_API_KEY env var not set");

  return whopFetch<WhopProduct>("/products", {
    method: "POST",
    body: JSON.stringify({
      name,
      description: description ?? name,
      company_id: companyId,
      visibility: "visible",
    }),
  });
}

/**
 * Create a one-time payment plan attached to a product.
 * Returns the plan including the checkout access_pass slug for building checkout URLs.
 */
export async function createWhopPlan(params: {
  product_id:   string;
  price_cents:  number;
  redirect_url: string;
  description?: string;
  metadata?:    Record<string, string>;
}): Promise<WhopPlan> {
  return whopFetch<WhopPlan>("/plans", {
    method: "POST",
    body: JSON.stringify({
      product_id:    params.product_id,
      plan_type:     "one_time",
      initial_price: (params.price_cents / 100).toFixed(2),
      currency:      "usd",
      billing_period: 0,
      redirect_url:  params.redirect_url,
      description:   params.description ?? "",
      ...(params.metadata ? { metadata: params.metadata } : {}),
    }),
  });
}

/**
 * Build the public Whop checkout URL for a plan/product.
 * Returns: https://whop.com/checkout/{access_pass_slug}/?redirect_url={url}
 */
export function buildWhopCheckoutUrl(accessPassSlug: string, redirectUrl: string): string {
  return `https://whop.com/checkout/${accessPassSlug}/?redirect_url=${encodeURIComponent(redirectUrl)}`;
}

/**
 * Try to create a product + plan + checkout URL for a payment link.
 * Returns null if WHOP_API_KEY is not set (graceful degradation).
 */
export async function provisionWhopCheckout(params: {
  title: string;
  description?: string;
  price_cents: number;
  redirect_url: string;
}): Promise<{
  whop_product_id: string;
  whop_checkout_id: string;
  whop_checkout_url: string;
} | null> {
  try {
    const product = await createWhopProduct(params.title, params.description);
    const plan    = await createWhopPlan({
      product_id:    product.id,
      price_cents:   params.price_cents,
      redirect_url:  params.redirect_url,
      description:   params.description,
    });

    const slug = (plan.access_pass?.slug?.trim() || product.slug?.trim() || "");
    if (!slug) {
      console.error("[whop] No slug available from plan or product");
      return null;
    }
    const checkoutUrl = buildWhopCheckoutUrl(slug, params.redirect_url);

    return {
      whop_product_id:  product.id,
      whop_checkout_id: plan.id,
      whop_checkout_url: checkoutUrl,
    };
  } catch (err) {
    console.warn("[whop] provisionWhopCheckout failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
