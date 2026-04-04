-- CIPHER Platform - Migration 019: Subscription Tiers
-- Formalizes the Start/Legend/Apex tier model as enforced DB state.
-- Tier is set by admin on application approval (migration 010 already adds
-- tier column to creator_applications). This migration adds the runtime
-- enforcement table and feature gate reference.

-- ── subscription_tiers reference table ───────────────────────────────────────
-- Immutable lookup — one row per tier slug.
CREATE TABLE IF NOT EXISTS subscription_tiers (
  slug             TEXT PRIMARY KEY,               -- 'cipher' | 'legend' | 'apex'
  display_name     TEXT NOT NULL,
  platform_fee_pct NUMERIC(5,2) NOT NULL,          -- platform cut as % (12, 10, 8)
  creator_pct      NUMERIC(5,2) NOT NULL,          -- creator keeps as % (88, 90, 92)
  max_fans         INTEGER,                         -- NULL = unlimited
  referral_pct     NUMERIC(5,2) NOT NULL DEFAULT 10,
  payout_speed     TEXT NOT NULL DEFAULT '7d',     -- '7d' | '48h' | '24h'
  has_ai_tools     BOOLEAN NOT NULL DEFAULT false,
  has_live_rooms   BOOLEAN NOT NULL DEFAULT false,
  has_collab_split BOOLEAN NOT NULL DEFAULT false,
  has_custom_domain BOOLEAN NOT NULL DEFAULT false,
  has_api_access   BOOLEAN NOT NULL DEFAULT false,
  has_white_glove  BOOLEAN NOT NULL DEFAULT false,
  sort_order       INTEGER NOT NULL DEFAULT 0
);

-- Seed the three tiers
INSERT INTO subscription_tiers
  (slug, display_name, platform_fee_pct, creator_pct, max_fans, referral_pct, payout_speed,
   has_ai_tools, has_live_rooms, has_collab_split, has_custom_domain, has_api_access, has_white_glove, sort_order)
VALUES
  ('cipher', 'Cipher',  12.00, 88.00, 500,  10.00, '7d',  false, false, false, false, false, false, 1),
  ('legend', 'Legend',  10.00, 90.00, NULL, 15.00, '48h', true,  true,  true,  false, false, false, 2),
  ('apex',   'Apex',     8.00, 92.00, NULL, 20.00, '24h', true,  true,  true,  true,  true,  true,  3)
ON CONFLICT (slug) DO UPDATE SET
  platform_fee_pct  = EXCLUDED.platform_fee_pct,
  creator_pct       = EXCLUDED.creator_pct,
  max_fans          = EXCLUDED.max_fans,
  referral_pct      = EXCLUDED.referral_pct,
  payout_speed      = EXCLUDED.payout_speed,
  has_ai_tools      = EXCLUDED.has_ai_tools,
  has_live_rooms    = EXCLUDED.has_live_rooms,
  has_collab_split  = EXCLUDED.has_collab_split,
  has_custom_domain = EXCLUDED.has_custom_domain,
  has_api_access    = EXCLUDED.has_api_access,
  has_white_glove   = EXCLUDED.has_white_glove,
  sort_order        = EXCLUDED.sort_order;

-- Read-only for everyone (public pricing data, no auth needed for reads)
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tiers_public_read" ON subscription_tiers;
CREATE POLICY "tiers_public_read" ON subscription_tiers FOR SELECT USING (true);

-- ── creator_subscriptions ──────────────────────────────────────────────────
-- Runtime state: which tier each approved creator is on.
-- Source of truth for feature gating.
CREATE TABLE IF NOT EXISTS creator_subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_slug        TEXT NOT NULL REFERENCES subscription_tiers(slug),
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'paused', 'cancelled')),

  -- When admin approved and assigned the tier
  activated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- If tier changes (upgrade/downgrade), previous row is superseded
  superseded_at    TIMESTAMPTZ,

  -- Admin who set this tier
  set_by           UUID REFERENCES auth.users(id),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (creator_id, tier_slug, status)   -- one active row per creator
);

ALTER TABLE creator_subscriptions ENABLE ROW LEVEL SECURITY;

-- Creators: read own subscription
DROP POLICY IF EXISTS "creator_subscription_select" ON creator_subscriptions;
CREATE POLICY "creator_subscription_select" ON creator_subscriptions
  FOR SELECT USING (auth.uid() = creator_id);

-- Admins: full access
DROP POLICY IF EXISTS "admin_subscription_all" ON creator_subscriptions;
CREATE POLICY "admin_subscription_all" ON creator_subscriptions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_creator
  ON creator_subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_active
  ON creator_subscriptions(creator_id, status) WHERE status = 'active';

-- ── Backfill: sync existing creator_applications.tier → creator_subscriptions ─
-- Runs once. Approved creators with a tier get an active subscription row.
INSERT INTO creator_subscriptions (creator_id, tier_slug, status, activated_at)
SELECT
  ca.user_id,
  COALESCE(ca.tier, 'cipher'),
  'active',
  COALESCE(ca.reviewed_at, ca.created_at, NOW())
FROM creator_applications ca
WHERE ca.status = 'approved'
  AND ca.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMENT ON TABLE subscription_tiers    IS 'Immutable tier reference — features and fee splits per tier';
COMMENT ON TABLE creator_subscriptions IS 'Runtime tier assignment per creator — source of truth for feature gating';
