-- CIPHER — Social Analytics + Whop Monetization Engine
-- Migration 024

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend social_connections with raw_json + metrics columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE social_connections
  ADD COLUMN IF NOT EXISTS raw_json        JSONB,
  ADD COLUMN IF NOT EXISTS metrics         JSONB,
  ADD COLUMN IF NOT EXISTS profile_url     TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at  TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. social_posts — normalized post data from any provider
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_posts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider         TEXT        NOT NULL,
  provider_post_id TEXT        NOT NULL,
  caption          TEXT,
  like_count       INTEGER     DEFAULT 0,
  comments_count   INTEGER     DEFAULT 0,
  media_type       TEXT,       -- IMAGE | VIDEO | CAROUSEL_ALBUM | TEXT
  posted_at        TIMESTAMPTZ,
  raw_json         JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (creator_id, provider, provider_post_id)
);

CREATE INDEX IF NOT EXISTS idx_social_posts_creator ON social_posts (creator_id, provider);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creators own posts" ON social_posts
  FOR ALL USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. offer_drafts — AI-generated monetization offer drafts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offer_drafts (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                   TEXT        NOT NULL,
  description             TEXT,
  price                   INTEGER     NOT NULL CHECK (price >= 50), -- cents
  billing_type            TEXT        NOT NULL DEFAULT 'one_time'
                          CHECK (billing_type IN ('one_time', 'monthly', 'yearly')),
  offer_type              TEXT        NOT NULL DEFAULT 'premium_content'
                          CHECK (offer_type IN (
                            'premium_content', 'private_community', 'coaching',
                            'tutorials', 'members_access', 'vault', 'custom'
                          )),
  launch_angle            TEXT,
  generated_from_social   BOOLEAN     DEFAULT false,
  analytics_snapshot      JSONB,
  status                  TEXT        NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'active', 'archived')),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_drafts_creator ON offer_drafts (creator_id, created_at DESC);

ALTER TABLE offer_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creators own offer_drafts" ON offer_drafts
  FOR ALL USING (auth.uid() = creator_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_offer_drafts_updated_at ON offer_drafts;
CREATE TRIGGER trigger_offer_drafts_updated_at
  BEFORE UPDATE ON offer_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Extend payment_links for Whop integration
--    Re-add whop_checkout_url (was dropped in 023), add slug + Whop IDs
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE payment_links
  ADD COLUMN IF NOT EXISTS whop_checkout_url  TEXT,
  ADD COLUMN IF NOT EXISTS whop_product_id    TEXT,
  ADD COLUMN IF NOT EXISTS whop_checkout_id   TEXT,
  ADD COLUMN IF NOT EXISTS slug               TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS offer_draft_id     UUID REFERENCES offer_drafts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_live            BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_payment_links_slug ON payment_links (slug) WHERE slug IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. purchases — Whop-confirmed purchase records
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_email       TEXT,
  buyer_user_id     TEXT,
  creator_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_link_id   UUID        NOT NULL REFERENCES payment_links(id) ON DELETE CASCADE,
  whop_order_id     TEXT        UNIQUE,
  whop_product_id   TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'refunded', 'disputed')),
  amount            INTEGER     NOT NULL, -- cents
  currency          TEXT        NOT NULL DEFAULT 'usd',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'purchases'
      AND column_name = 'payment_link_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_purchases_payment_link ON purchases (payment_link_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_purchases_creator      ON purchases (creator_id, created_at DESC);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'purchases'
      AND column_name = 'buyer_email'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_purchases_buyer_email ON purchases (buyer_email) WHERE buyer_email IS NOT NULL;
  END IF;
END $$;

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creators see own purchases" ON purchases
  FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "service role full access purchases" ON purchases
  USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS trigger_purchases_updated_at ON purchases;
CREATE TRIGGER trigger_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. access_entitlements — what buyers can access after confirmed purchase
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS access_entitlements (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id         UUID        REFERENCES purchases(id) ON DELETE CASCADE,
  creator_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlock_type         TEXT        NOT NULL DEFAULT 'payment_link'
                      CHECK (unlock_type IN ('payment_link', 'fan_code', 'invite', 'custom')),
  unlocked_content_id UUID,
  payment_link_id     UUID        REFERENCES payment_links(id) ON DELETE CASCADE,
  buyer_email         TEXT,
  active              BOOLEAN     DEFAULT true,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entitlements_creator      ON access_entitlements (creator_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_buyer_email  ON access_entitlements (buyer_email, payment_link_id)
  WHERE buyer_email IS NOT NULL;

ALTER TABLE access_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access entitlements" ON access_entitlements
  USING (auth.role() = 'service_role');
CREATE POLICY "creators see own entitlements" ON access_entitlements
  FOR SELECT USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. launch_actions — track every money-moving action on launch pages
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS launch_actions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_link_id  UUID        REFERENCES payment_links(id) ON DELETE SET NULL,
  offer_draft_id   UUID        REFERENCES offer_drafts(id) ON DELETE SET NULL,
  action_type      TEXT        NOT NULL
                   CHECK (action_type IN (
                     'copied_link', 'opened_pay_page', 'copied_caption',
                     'copied_dm', 'copied_closing_message', 'clicked_go_live',
                     'created_offer', 'generated_link', 'shared_instagram',
                     'dm_followers', 'viewed_analytics'
                   )),
  metadata_json    JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_launch_actions_creator ON launch_actions (creator_id, created_at DESC);

ALTER TABLE launch_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creators own launch_actions" ON launch_actions
  FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "service role full access launch_actions" ON launch_actions
  USING (auth.role() = 'service_role');

COMMIT;
