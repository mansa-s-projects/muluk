/**
 * CIPHER Subscription Tier Enforcement
 *
 * Single source of truth for all feature gating.
 * All tier data is read from the subscription_tiers + creator_subscriptions tables
 * (migrations 019 & 020). This module is pure TypeScript — it never imports
 * Next.js types so it can be used in API routes, server components, and scripts.
 *
 * Quick usage in a route handler:
 * ─────────────────────────────────────────────────────────────────────────────
 *   import { assertFeatureAccess, TierGateError, tierGatePayload } from "@/lib/tiers";
 *
 *   // After auth check:
 *   try {
 *     await assertFeatureAccess(user.id, "ai_tools", supabase);
 *   } catch (e) {
 *     if (e instanceof TierGateError)
 *       return NextResponse.json(tierGatePayload(e), { status: 403 });
 *     throw e;
 *   }
 *
 * Error response shape (HTTP 403):
 * ─────────────────────────────────────────────────────────────────────────────
 *   {
 *     "upgrade_required": true,
 *     "current_tier": "cipher",
 *     "required_tier": "legend",
 *     "feature": "ai_tools",
 *     "message": "ai tools requires the legend plan or higher"
 *   }
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type TierSlug = "cipher" | "legend" | "apex";

export interface SubscriptionTier {
  slug:              TierSlug;
  display_name:      string;
  platform_fee_pct:  number;
  creator_pct:       number;
  /** null = unlimited fan codes */
  max_fans:          number | null;
  referral_pct:      number;
  /** "7d" | "48h" | "24h" */
  payout_speed:      string;
  has_ai_tools:      boolean;
  has_live_rooms:    boolean;
  has_collab_split:  boolean;
  has_custom_domain: boolean;
  has_api_access:    boolean;
  has_white_glove:   boolean;
  sort_order:        number;
}

/**
 * Feature identifiers used in all tier checks.
 * Extend this union to add new gated features.
 */
export type Feature =
  | "ai_tools"       // legend+  — AI writing, voice, content ideas
  | "live_rooms"     // legend+  — live streaming
  | "collab_split"   // legend+  — revenue share with collaborators
  | "custom_domain"  // apex only — custom vanity domain
  | "api_access"     // apex only — programmatic API keys
  | "white_glove"    // apex only — dedicated account manager
  | "fan_codes";     // all tiers — cipher has max_fans quantity cap

// ── Constants ──────────────────────────────────────────────────────────────────

/** Numeric rank — higher = more privileged. Used for upgrade comparisons. */
export const TIER_ORDER: Record<TierSlug, number> = {
  cipher: 1,
  legend: 2,
  apex:   3,
};

/** Which is the minimum tier that unlocks each feature. */
export const FEATURE_MIN_TIER: Record<Feature, TierSlug> = {
  ai_tools:      "legend",
  live_rooms:    "legend",
  collab_split:  "legend",
  custom_domain: "apex",
  api_access:    "apex",
  white_glove:   "apex",
  fan_codes:     "cipher",  // everyone has it; cipher has quantity cap
};

/**
 * Hardcoded fallback used when a creator has no subscription row in the DB.
 * Prevents crashes while giving cipher-level access by default.
 */
const DEFAULT_CIPHER_TIER: SubscriptionTier = {
  slug:              "cipher",
  display_name:      "Cipher",
  platform_fee_pct:  12,
  creator_pct:       88,
  max_fans:          500,
  referral_pct:      10,
  payout_speed:      "7d",
  has_ai_tools:      false,
  has_live_rooms:    false,
  has_collab_split:  false,
  has_custom_domain: false,
  has_api_access:    false,
  has_white_glove:   false,
  sort_order:        1,
};

// ── TierGateError ──────────────────────────────────────────────────────────────

export interface TierGatePayload {
  upgrade_required: true;
  current_tier:     TierSlug;
  required_tier:    TierSlug;
  feature:          Feature;
  message:          string;
}

/**
 * Thrown by assertFeatureAccess() when a creator's tier doesn't allow a feature.
 *
 * @example
 * } catch (e) {
 *   if (e instanceof TierGateError)
 *     return NextResponse.json(tierGatePayload(e), { status: 403 });
 *   throw e;
 * }
 */
export class TierGateError extends Error {
  readonly payload: TierGatePayload;

  constructor(payload: Omit<TierGatePayload, "upgrade_required">) {
    super(payload.message);
    this.name = "TierGateError";
    this.payload = { upgrade_required: true, ...payload };
  }
}

// ── Core helpers ───────────────────────────────────────────────────────────────

/**
 * Returns the full SubscriptionTier row for a creator.
 *
 * Never throws — falls back to Cipher defaults when:
 *   - creator has no row in creator_subscriptions yet
 *   - the subscription_tiers table is unavailable (RPC error)
 *
 * Accepts any Supabase client (server-auth or service-role).
 */
export async function getUserTier(
  userId: string,
  supabase: SupabaseClient
): Promise<SubscriptionTier> {
  // 1. Resolve the active tier slug for this creator
  const { data: sub } = await supabase
    .from("creator_subscriptions")
    .select("tier_slug")
    .eq("creator_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tierSlug: TierSlug = ((sub?.tier_slug as TierSlug | null) ?? "cipher");

  // 2. Fetch full tier details from the reference table
  const { data: tier, error: tierError } = await supabase
    .from("subscription_tiers")
    .select("*")
    .eq("slug", tierSlug)
    .maybeSingle();

  if (!tier) {
    if (tierSlug !== "cipher") {
      console.warn("[tiers] Falling back to cipher tier due to missing tier row", {
        userId,
        requestedTier: tierSlug,
        error: tierError?.message,
      });
    }
    return { ...DEFAULT_CIPHER_TIER, slug: "cipher" };
  }

  return tier as SubscriptionTier;
}

/**
 * Non-throwing feature check.
 * Useful when you want to conditionally render UI rather than block a request.
 *
 * @returns { allowed: true, tier } or { allowed: false, tier, ...upgradeInfo }
 */
export async function checkFeatureAccess(
  userId: string,
  feature: Feature,
  supabase: SupabaseClient
): Promise<
  | { allowed: true;  tier: SubscriptionTier }
  | { allowed: false; tier: SubscriptionTier } & Omit<TierGatePayload, "upgrade_required">
> {
  const tier = await getUserTier(userId, supabase);
  const requiredTier = FEATURE_MIN_TIER[feature];

  const featureFlagMap: Record<Feature, boolean> = {
    ai_tools:      tier.has_ai_tools,
    live_rooms:    tier.has_live_rooms,
    collab_split:  tier.has_collab_split,
    custom_domain: tier.has_custom_domain,
    api_access:    tier.has_api_access,
    white_glove:   tier.has_white_glove,
    fan_codes:     true,  // quantity-gated separately via checkFanCodeLimit
  };

  const allowed = featureFlagMap[feature] ?? false;

  if (!allowed) {
    return {
      allowed:       false,
      tier,
      current_tier:  tier.slug,
      required_tier: requiredTier,
      feature,
      message:       `${feature.replace(/_/g, " ")} requires the ${requiredTier} plan or higher`,
    };
  }

  return { allowed: true, tier };
}

/**
 * Throwing feature check — call this at the top of protected route handlers.
 * Returns the resolved SubscriptionTier on success so callers avoid re-fetching.
 *
 * @throws {TierGateError} when the creator's tier cannot access the feature
 *
 * @example
 * const tier = await assertFeatureAccess(user.id, "ai_tools", supabase);
 * // tier.payout_speed, tier.referral_pct, etc. are now available
 */
export async function assertFeatureAccess(
  userId: string,
  feature: Feature,
  supabase: SupabaseClient
): Promise<SubscriptionTier> {
  const result = await checkFeatureAccess(userId, feature, supabase);

  if (!result.allowed) {
    const r = result as { current_tier: TierSlug; required_tier: TierSlug; feature: Feature; message: string };
    throw new TierGateError({
      current_tier:  r.current_tier,
      required_tier: r.required_tier,
      feature:       r.feature,
      message:       r.message,
    });
  }

  return result.tier;
}

/**
 * Fan-code quantity gate for Cipher-tier creators (max 500 fan codes).
 * Legend and Apex skip the count query entirely (max_fans === null).
 *
 * @example
 * const limit = await checkFanCodeLimit(user.id, supabase);
 * if (!limit.allowed) {
 *   return NextResponse.json({
 *     upgrade_required: true,
 *     current_tier: limit.tier.slug,
 *     required_tier: "legend",
 *     feature: "fan_codes",
 *     message: `Fan code limit reached (${limit.current}/${limit.limit}). Upgrade to Legend for unlimited.`,
 *   }, { status: 403 });
 * }
 */
export async function checkFanCodeLimit(
  userId: string,
  supabase: SupabaseClient
): Promise<{
  allowed: boolean;
  current: number;
  limit:   number | null;
  tier:    SubscriptionTier;
}> {
  const tier = await getUserTier(userId, supabase);

  // Unlimited tiers skip counting
  if (tier.max_fans === null) {
    return { allowed: true, current: 0, limit: null, tier };
  }

  // Fetch all content IDs for this creator, then count fan codes
  const { data: contents } = await supabase
    .from("content_items_v2")
    .select("id")
    .eq("creator_id", userId);

  const contentIds = (contents ?? []).map((c: { id: string }) => c.id);

  let current = 0;
  if (contentIds.length > 0) {
    const { count } = await supabase
      .from("fan_codes_v2")
      .select("id", { count: "exact", head: true })
      .in("content_id", contentIds);
    current = count ?? 0;
  }

  return {
    allowed: current < tier.max_fans,
    current,
    limit:   tier.max_fans,
    tier,
  };
}

/**
 * Serialise a TierGateError into a plain JSON-safe object.
 * Pass directly to NextResponse.json() with status 403.
 *
 * @example
 * } catch (e) {
 *   if (e instanceof TierGateError)
 *     return NextResponse.json(tierGatePayload(e), { status: 403 });
 *   throw e;
 * }
 */
export function tierGatePayload(err: TierGateError): TierGatePayload {
  return err.payload;
}
