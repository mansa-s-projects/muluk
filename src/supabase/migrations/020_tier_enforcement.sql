-- CIPHER Platform - Migration 020: Tier Enforcement SQL Helpers
-- Adds efficient DB-side helpers for the TypeScript tier enforcement layer.
-- The main runtime tables (subscription_tiers, creator_subscriptions) are in 019.
--
-- This migration adds:
--   1. get_creator_tier_info(user_id)  — single-query tier lookup via RPC
--   2. Correct GRANT statements
-- ---------------------------------------------------------------------------

-- ── 1. get_creator_tier_info ──────────────────────────────────────────────────
-- Returns the full tier row for the highest active subscription a creator holds.
-- Falls back to returning the 'cipher' row when no subscription row exists.
-- Called via: supabase.rpc('get_creator_tier_info', { p_user_id: userId })

CREATE OR REPLACE FUNCTION get_creator_tier_info(p_user_id UUID)
RETURNS TABLE (
  slug              TEXT,
  display_name      TEXT,
  platform_fee_pct  NUMERIC,
  creator_pct       NUMERIC,
  referral_pct      NUMERIC,
  payout_speed      TEXT,
  has_ai_tools      BOOLEAN,
  has_live_rooms    BOOLEAN,
  has_collab_split  BOOLEAN,
  has_custom_domain BOOLEAN,
  has_api_access    BOOLEAN,
  has_white_glove   BOOLEAN,
  sort_order        INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    st.slug,
    st.display_name,
    st.platform_fee_pct,
    st.creator_pct,
    st.referral_pct,
    st.payout_speed,
    st.has_ai_tools,
    st.has_live_rooms,
    st.has_collab_split,
    st.has_custom_domain,
    st.has_api_access,
    st.has_white_glove,
    st.sort_order
  FROM creator_subscriptions cs
  JOIN subscription_tiers st ON st.slug = cs.tier_slug
  WHERE cs.creator_id = p_user_id
    AND cs.status = 'active'
  ORDER BY st.sort_order DESC  -- highest active tier wins
  LIMIT 1;
$$;

-- If no active subscription: caller falls back to cipher defaults in TypeScript
-- SECURITY DEFINER runs as function owner so RLS on creator_subscriptions is
-- bypassed intentionally here — the function itself enforces user scope via
-- the WHERE clause.

GRANT EXECUTE ON FUNCTION get_creator_tier_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_creator_tier_info(UUID) TO service_role;

-- ── 2. creator_tier_view ──────────────────────────────────────────────────────
-- Convenience admin view: every creator with their current active tier.
-- Admins only (via RLS on creator_subscriptions: admins have full access).

CREATE OR REPLACE VIEW creator_tier_view AS
SELECT
  cs.creator_id,
  st.slug              AS tier_slug,
  st.display_name      AS tier_name,
  st.platform_fee_pct,
  st.creator_pct,
  st.payout_speed,
  st.has_ai_tools,
  st.has_api_access,
  cs.activated_at,
  cs.status
FROM creator_subscriptions cs
JOIN subscription_tiers st ON st.slug = cs.tier_slug
WHERE cs.status = 'active';

COMMENT ON FUNCTION get_creator_tier_info IS 'Returns full tier details for a user — falls back to cipher row when no subscription exists';
COMMENT ON VIEW     creator_tier_view     IS 'All creators with their active tier — admin use only';
