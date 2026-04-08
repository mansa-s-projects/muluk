/**
 * Series Drop — library helpers
 * Types, formatters, and Whop checkout provisioning.
 */

const WHOP_API_BASE = "https://api.whop.com/api/v2";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Series {
  id:              string;
  creator_id:      string;
  title:           string;
  description:     string | null;
  cover_url:       string | null;
  price_cents:     number;
  status:          "draft" | "published" | "archived";
  whop_product_id: string | null;
  whop_plan_id:    string | null;
  episode_count:   number;
  total_sales:     number;
  created_at:      string;
  updated_at:      string;
}

export interface SeriesEpisode {
  id:         string;
  series_id:  string;
  creator_id: string;
  title:      string;
  body:       string | null;
  media_url:  string | null;
  sort_order: number;
  is_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeriesPurchase {
  id:              string;
  series_id:       string;
  creator_id:      string;
  fan_email:       string | null;
  fan_name:        string | null;
  status:          "pending" | "paid" | "refunded";
  whop_payment_id: string | null;
  access_token:    string;
  paid_at:         string | null;
  created_at:      string;
}

/** Series detail as returned on the public fan page */
export interface PublicSeries {
  id:            string;
  title:         string;
  description:   string | null;
  cover_url:     string | null;
  price_cents:   number;
  episode_count: number;
  /** Preview episodes visible without purchase */
  preview_episodes: PublicEpisode[];
}

export interface PublicEpisode {
  id:         string;
  title:      string;
  body:       string | null;
  media_url:  string | null;
  sort_order: number;
  is_preview: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const SERIES_STATUS_LABELS: Record<Series["status"], string> = {
  draft:      "Draft",
  published:  "Published",
  archived:   "Archived",
};

export const SERIES_STATUS_COLORS: Record<
  Series["status"],
  { bg: string; text: string }
> = {
  draft: {
    bg: "rgba(148,163,184,0.12)",
    text: "rgba(148,163,184,0.8)",
  },
  published: {
    bg: "rgba(34,197,94,0.12)",
    text: "rgba(80,212,138,0.9)",
  },
  archived: {
    bg: "rgba(100,100,120,0.12)",
    text: "rgba(180,180,196,0.72)",
  },
};

// ── Formatters ───────────────────────────────────────────────────────────────

export function formatSeriesPrice(cents: number): string {
  if (cents === 0) return "Free";
  if (cents % 100 === 0) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
}

// ── Whop checkout ────────────────────────────────────────────────────────────

/**
 * Provisions a one-time Whop checkout for a single series purchase.
 * A new product+plan is created per purchase so metadata uniquely identifies it.
 * The access_token is embedded in the redirect URL so the fan lands on content immediately.
 */
export async function provisionSeriesPurchaseCheckout(opts: {
  purchaseId:    string;
  accessToken:   string;
  seriesTitle:   string;
  creatorHandle: string;
  priceCents:    number;
  redirectUrl:   string;
  fanEmail?:     string;
}): Promise<{
  whop_product_id:  string;
  whop_plan_id:     string;
  whop_checkout_url: string;
} | null> {
  const apiKey    = process.env.WHOP_API_KEY;
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!apiKey || !companyId) return null;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    // Create a hidden product for this purchase
    const productRes = await fetch(`${WHOP_API_BASE}/companies/${companyId}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name:       `${opts.seriesTitle} — @${opts.creatorHandle}`,
        visibility: "hidden",
      }),
    });
    if (!productRes.ok) return null;
    const product = await productRes.json() as { id: string };

    // One-time plan with series metadata
    const planRes = await fetch(`${WHOP_API_BASE}/products/${product.id}/plans`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        plan_type:     "one_time",
        initial_price: (opts.priceCents / 100).toFixed(2),
        redirect_url:  opts.redirectUrl,
        metadata: {
          series_purchase_id: opts.purchaseId,
          series_payment:     "true",
        },
      }),
    });
    if (!planRes.ok) return null;
    const plan = await planRes.json() as { id: string };

    const checkoutUrl = opts.fanEmail
      ? `https://whop.com/checkout/${plan.id}/?email=${encodeURIComponent(opts.fanEmail)}`
      : `https://whop.com/checkout/${plan.id}/`;

    return {
      whop_product_id:   product.id,
      whop_plan_id:      plan.id,
      whop_checkout_url: checkoutUrl,
    };
  } catch {
    return null;
  }
}
