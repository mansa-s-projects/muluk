-- Mansas Moguls — Creator Intelligence Layer
-- Migration 057: social metrics history, scores, brand affiliates

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. social_metrics_history — daily snapshots per platform per creator
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_metrics_history (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform         TEXT        NOT NULL,
  snapshot_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  followers        INTEGER     NOT NULL DEFAULT 0,
  following        INTEGER     NOT NULL DEFAULT 0,
  posts_count      INTEGER     NOT NULL DEFAULT 0,
  avg_views        NUMERIC(12,2) DEFAULT 0,
  avg_likes        NUMERIC(12,2) DEFAULT 0,
  avg_comments     NUMERIC(12,2) DEFAULT 0,
  engagement_rate  NUMERIC(8,4)  DEFAULT 0,
  reach            INTEGER     DEFAULT 0,
  impressions      INTEGER     DEFAULT 0,
  profile_visits   INTEGER     DEFAULT 0,
  raw_json         JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (creator_id, platform, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_smh_creator_platform_date
  ON social_metrics_history (creator_id, platform, snapshot_date DESC);

ALTER TABLE social_metrics_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator owns metrics history"
  ON social_metrics_history FOR ALL USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. creator_intelligence — composite scores + AI insights per creator
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_intelligence (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id              UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  health_score            SMALLINT    NOT NULL DEFAULT 0 CHECK (health_score BETWEEN 0 AND 100),
  growth_score            SMALLINT    NOT NULL DEFAULT 0 CHECK (growth_score BETWEEN 0 AND 100),
  engagement_score        SMALLINT    NOT NULL DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 100),
  monetization_score      SMALLINT    NOT NULL DEFAULT 0 CHECK (monetization_score BETWEEN 0 AND 100),
  audience_quality_score  SMALLINT    NOT NULL DEFAULT 0 CHECK (audience_quality_score BETWEEN 0 AND 100),
  virality_score          SMALLINT    NOT NULL DEFAULT 0 CHECK (virality_score BETWEEN 0 AND 100),
  total_followers         INTEGER     NOT NULL DEFAULT 0,
  total_reach             INTEGER     NOT NULL DEFAULT 0,
  top_platform            TEXT,
  weekly_growth_pct       NUMERIC(8,2) DEFAULT 0,
  monthly_growth_pct      NUMERIC(8,2) DEFAULT 0,
  best_posting_time       TEXT,        -- e.g. "18:00–20:00 EST"
  top_content_type        TEXT,        -- e.g. "educational"
  ai_insights             JSONB        NOT NULL DEFAULT '[]',
  ai_recommendations      JSONB        NOT NULL DEFAULT '[]',
  platform_breakdown      JSONB        NOT NULL DEFAULT '{}',
  last_analyzed_at        TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_creator ON creator_intelligence (creator_id);

ALTER TABLE creator_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator owns intelligence"
  ON creator_intelligence FOR ALL USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. brand_affiliates — curated affiliate programs by niche (platform-managed)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_affiliates (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name           TEXT        NOT NULL,
  niches               TEXT[]      NOT NULL DEFAULT '{}',
  commission_rate      TEXT        NOT NULL,  -- e.g. "8–15%"
  commission_type      TEXT        NOT NULL DEFAULT 'percentage'
                       CHECK (commission_type IN ('percentage','flat','hybrid','cpa')),
  program_url          TEXT        NOT NULL,
  description          TEXT,
  avg_order_value_usd  INTEGER     DEFAULT 0,
  cookie_duration_days INTEGER     DEFAULT 30,
  payout_threshold_usd INTEGER     DEFAULT 50,
  logo_url             TEXT,
  tier                 TEXT        NOT NULL DEFAULT 'standard'
                       CHECK (tier IN ('standard','premium','exclusive')),
  requires_approval    BOOLEAN     NOT NULL DEFAULT false,
  is_active            BOOLEAN     NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ba_niches ON brand_affiliates USING GIN (niches);

-- Public read: creators browse the affiliate catalog
ALTER TABLE brand_affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read affiliates"
  ON brand_affiliates FOR SELECT USING (is_active = true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. creator_affiliate_links — creator's saved affiliate links
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_affiliate_links (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_id    UUID        REFERENCES brand_affiliates(id) ON DELETE SET NULL,
  brand_name      TEXT        NOT NULL,
  custom_url      TEXT        NOT NULL,
  clicks          INTEGER     NOT NULL DEFAULT 0,
  conversions     INTEGER     NOT NULL DEFAULT 0,
  revenue_usd     NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE creator_affiliate_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator owns links"
  ON creator_affiliate_links FOR ALL USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Seed: curated brand affiliate catalog
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO brand_affiliates (brand_name, niches, commission_rate, commission_type, program_url, description, avg_order_value_usd, cookie_duration_days, payout_threshold_usd, tier) VALUES
  -- Fashion & Lifestyle
  ('SHEIN', ARRAY['fashion','lifestyle','beauty'], '10–20%', 'percentage', 'https://affiliate.shein.com', 'Global fast fashion marketplace', 40, 30, 50, 'standard'),
  ('ASOS', ARRAY['fashion','lifestyle'], '5–7%', 'percentage', 'https://www.asos.com/affiliates', 'UK-based fashion retailer', 70, 45, 50, 'standard'),
  ('Fashion Nova', ARRAY['fashion','lifestyle','fitness'], '10–20%', 'percentage', 'https://www.fashionnova.com/pages/affiliate-program', 'Trending fashion brand', 60, 30, 50, 'premium'),
  -- Beauty
  ('Sephora', ARRAY['beauty','lifestyle'], '5–10%', 'percentage', 'https://www.sephora.com/beauty/affiliate-program', 'Premium beauty retailer', 80, 24, 50, 'premium'),
  ('ColourPop', ARRAY['beauty'], '8–12%', 'percentage', 'https://colourpop.com/pages/affiliate', 'Affordable cruelty-free cosmetics', 30, 30, 25, 'standard'),
  ('Morphe', ARRAY['beauty'], '10%', 'percentage', 'https://www.morphe.com/pages/affiliate', 'Professional makeup brushes & palettes', 45, 30, 50, 'standard'),
  -- Fitness
  ('GNC', ARRAY['fitness','health'], '5–8%', 'percentage', 'https://www.gnc.com/on/demandware.store/Sites-GNC-Site/en_US/Affiliate-Index', 'Nutrition & supplements', 55, 7, 50, 'standard'),
  ('Gymshark', ARRAY['fitness','lifestyle'], '5–10%', 'percentage', 'https://www.gymshark.com/pages/affiliates', 'Premium gym apparel', 75, 30, 50, 'premium'),
  ('MyProtein', ARRAY['fitness','health'], '8–10%', 'percentage', 'https://www.myprotein.com/affiliates.list', 'Sports nutrition products', 50, 30, 50, 'standard'),
  -- Tech
  ('Amazon Associates', ARRAY['tech','gaming','lifestyle','education','finance'], '1–10%', 'percentage', 'https://affiliate-program.amazon.com', 'World''s largest affiliate program', 60, 24, 10, 'standard'),
  ('Best Buy', ARRAY['tech','gaming'], '1–5%', 'percentage', 'https://www.bestbuy.com/site/misc/affiliate/pcmcat138600050016.c', 'Consumer electronics retailer', 200, 1, 50, 'standard'),
  ('Newegg', ARRAY['tech','gaming'], '0.5–1%', 'percentage', 'https://www.newegg.com/info/affiliate', 'PC components & electronics', 150, 7, 50, 'standard'),
  -- Gaming
  ('Razer', ARRAY['gaming','tech'], '5–10%', 'percentage', 'https://www.razer.com/affiliate', 'Gaming peripherals & hardware', 120, 30, 50, 'premium'),
  ('G2A', ARRAY['gaming'], '5–12%', 'percentage', 'https://www.g2a.com/goldmine', 'Digital game marketplace', 20, 30, 25, 'standard'),
  -- Finance & Crypto
  ('Coinbase', ARRAY['crypto','finance'], '$10 per signup', 'flat', 'https://www.coinbase.com/affiliates', 'Largest US crypto exchange', 0, 30, 50, 'premium'),
  ('Binance', ARRAY['crypto','finance'], '20–40%', 'percentage', 'https://www.binance.com/en/activity/affiliate', 'World''s largest crypto exchange', 0, 90, 50, 'premium'),
  ('NordVPN', ARRAY['tech','finance','crypto'], '40–100%', 'percentage', 'https://affiliates.nordvpn.com', 'Leading VPN service', 45, 30, 50, 'premium'),
  -- Education
  ('Skillshare', ARRAY['education','art','music'], '40%', 'percentage', 'https://www.skillshare.com/affiliates', 'Online learning platform', 100, 30, 50, 'standard'),
  ('Coursera', ARRAY['education','tech','finance'], '10–45%', 'percentage', 'https://www.coursera.org/about/affiliates', 'University-backed online courses', 80, 30, 50, 'standard'),
  ('Udemy', ARRAY['education','tech'], '15%', 'percentage', 'https://www.udemy.com/affiliate', 'Online course marketplace', 35, 7, 50, 'standard'),
  -- Travel
  ('Booking.com', ARRAY['travel','lifestyle'], '25–40%', 'percentage', 'https://www.booking.com/affiliate-program', 'Global hotel booking platform', 200, 30, 100, 'premium'),
  ('Airbnb', ARRAY['travel','lifestyle'], '$30–75 per host', 'flat', 'https://www.airbnb.com/associates', 'Home rental platform', 0, 30, 50, 'standard'),
  -- Health & Wellness
  ('iHerb', ARRAY['health','fitness','beauty'], '5–10%', 'percentage', 'https://ca.iherb.com/info/affiliateprogram', 'Natural health products', 50, 30, 50, 'standard'),
  ('Hims & Hers', ARRAY['health','lifestyle'], '10%', 'percentage', 'https://www.forhims.com/affiliates', 'Personal health & wellness', 60, 30, 50, 'premium'),
  -- Food
  ('HelloFresh', ARRAY['food','lifestyle'], '$10–20 per order', 'flat', 'https://www.hellofresh.com/pages/affiliate-program', 'Meal kit delivery service', 0, 14, 50, 'premium'),
  -- Music
  ('Epidemic Sound', ARRAY['music','art'], '30 day free trial CPA', 'cpa', 'https://www.epidemicsound.com/referral', 'Royalty-free music for creators', 150, 30, 50, 'standard'),
  -- Art & Design
  ('Canva Pro', ARRAY['art','education','lifestyle'], '$36/referral', 'flat', 'https://www.canva.com/affiliates', 'Online graphic design platform', 0, 30, 50, 'standard'),
  -- Luxury
  ('NET-A-PORTER', ARRAY['fashion','luxury','lifestyle'], '6%', 'percentage', 'https://www.net-a-porter.com/en-gb/d/editorial/affiliates', 'Luxury fashion online', 500, 14, 100, 'exclusive'),
  ('Watches of Switzerland', ARRAY['luxury'], '3–5%', 'percentage', 'https://www.watches-of-switzerland.co.uk/affiliates', 'Luxury watch retailer', 2000, 30, 100, 'exclusive'),
  -- Business
  ('Shopify', ARRAY['business','education'], '$58–2000', 'flat', 'https://www.shopify.com/affiliates', 'E-commerce platform', 0, 30, 50, 'premium'),
  ('HubSpot', ARRAY['business','education'], '15–30%', 'percentage', 'https://www.hubspot.com/partners/affiliates', 'CRM & marketing platform', 400, 90, 50, 'premium'),
  ('QuickBooks', ARRAY['business','finance'], '$25–75', 'flat', 'https://quickbooks.intuit.com/accountants/partner-programs/', 'Accounting software', 0, 45, 50, 'standard')
ON CONFLICT DO NOTHING;

COMMIT;
