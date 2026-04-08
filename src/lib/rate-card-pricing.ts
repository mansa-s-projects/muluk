// Rate Card Pricing Engine
// All price outputs are in whole dollars unless noted.

export const NICHES = [
  { value: "finance",   label: "Finance & Investing",        multiplier: 1.50 },
  { value: "tech",      label: "Tech & Software",            multiplier: 1.30 },
  { value: "fitness",   label: "Fitness & Health",           multiplier: 1.20 },
  { value: "beauty",    label: "Beauty & Skincare",          multiplier: 1.15 },
  { value: "travel",    label: "Travel",                     multiplier: 1.10 },
  { value: "fashion",   label: "Fashion & Style",            multiplier: 1.05 },
  { value: "lifestyle", label: "Lifestyle",                  multiplier: 1.00 },
  { value: "parenting", label: "Parenting & Family",         multiplier: 0.95 },
  { value: "food",      label: "Food & Cooking",             multiplier: 0.90 },
  { value: "music",     label: "Music",                      multiplier: 0.90 },
  { value: "gaming",    label: "Gaming",                     multiplier: 0.85 },
  { value: "comedy",    label: "Comedy & Entertainment",     multiplier: 0.85 },
  { value: "other",     label: "Other",                      multiplier: 1.00 },
] as const;

export const CONTENT_TYPES = [
  { value: "video",   label: "Short-form Video (TikTok / Reels)", multiplier: 1.40 },
  { value: "live",    label: "Live Streaming",                    multiplier: 1.25 },
  { value: "podcast", label: "Podcast",                           multiplier: 1.10 },
  { value: "mixed",   label: "Multi-format",                      multiplier: 1.10 },
  { value: "photo",   label: "Photography / Static Posts",        multiplier: 1.00 },
  { value: "blog",    label: "Written / Blog",                    multiplier: 0.80 },
] as const;

export type NicheValue        = (typeof NICHES)[number]["value"];
export type ContentTypeValue  = (typeof CONTENT_TYPES)[number]["value"];

export interface RateCardInputs {
  followers:      number;
  engagementRate: number; // e.g. 3.5 means 3.5 %
  niche:          NicheValue;
  contentType:    ContentTypeValue;
}

export interface RateCardPrices {
  brandDealPrice:    number; // dollars
  storyPostPrice:    number; // dollars
  sessionPrice:      number; // dollars
  subscriptionPrice: number; // dollars (may have cents, e.g. 9.99)
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getCPM(engagementRate: number): number {
  if (engagementRate >= 6) return 5.0;
  if (engagementRate >= 4) return 3.5;
  if (engagementRate >= 2) return 2.0;
  if (engagementRate >= 1) return 1.0;
  return 0.5;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

// ── Core formula ───────────────────────────────────────────────────────────

export function calculateRateCardPrices(inputs: RateCardInputs): RateCardPrices {
  const { followers, engagementRate, niche, contentType } = inputs;

  const nicheMultiplier   = NICHES.find((n) => n.value === niche)?.multiplier       ?? 1.0;
  const contentMultiplier = CONTENT_TYPES.find((c) => c.value === contentType)?.multiplier ?? 1.0;
  const cpm               = getCPM(engagementRate);

  // Brand deal: CPM × audience size × niche × content format
  const brandDealRaw   = (followers / 1000) * cpm * nicheMultiplier * contentMultiplier;
  const brandDealPrice = Math.max(50, roundTo(brandDealRaw, 5));

  // Story post: 30 % of brand deal, minimum $25
  const storyPostPrice = Math.max(25, roundTo(brandDealPrice * 0.3, 5));

  // 1:1 session: tiered base × niche premium, capped at $1 000
  const sessionBase =
    followers >= 1_000_000 ? 500 :
    followers >=   100_000 ? 300 :
    followers >=    10_000 ? 150 : 75;
  const sessionPrice = Math.max(75, Math.min(1000, roundTo(sessionBase * nicheMultiplier, 25)));

  // Subscription: tiered + engagement bonus
  const subBase =
    followers >= 500_000 ? 29.99 :
    followers >=  50_000 ? 14.99 :
    followers >=   5_000 ?  9.99 : 4.99;
  const engBonus        = engagementRate > 5 ? 5 : engagementRate > 3 ? 2 : 0;
  const subscriptionPrice = Math.round((subBase + engBonus) * 100) / 100;

  return { brandDealPrice, storyPostPrice, sessionPrice, subscriptionPrice };
}

// ── DB serialisation (cents) ───────────────────────────────────────────────

export function pricesToCents(prices: RateCardPrices) {
  return {
    brand_deal_price:    Math.round(prices.brandDealPrice    * 100),
    story_post_price:    Math.round(prices.storyPostPrice    * 100),
    session_price:       Math.round(prices.sessionPrice      * 100),
    subscription_price:  Math.round(prices.subscriptionPrice * 100),
  };
}

export function pricesFromCents(row: {
  brand_deal_price:   number;
  story_post_price:   number;
  session_price:      number;
  subscription_price: number;
}): RateCardPrices {
  return {
    brandDealPrice:    row.brand_deal_price    / 100,
    storyPostPrice:    row.story_post_price    / 100,
    sessionPrice:      row.session_price       / 100,
    subscriptionPrice: row.subscription_price  / 100,
  };
}

// ── Display ────────────────────────────────────────────────────────────────

export function formatPrice(dollars: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    style:                 "currency",
    currency:              "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(dollars);
}

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}
