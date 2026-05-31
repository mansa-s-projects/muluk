-- Mansas Moguls — Intelligence Layer v2
-- Migration 058: demographics, content rankings, platform health, growth snapshots, Moguls Score

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend social_connections with more sync fields
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE social_connections
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS health_score           SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audience_quality_score SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS growth_pct_7d          NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS growth_pct_30d         NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified               BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_url             TEXT,
  ADD COLUMN IF NOT EXISTS bio                    TEXT,
  ADD COLUMN IF NOT EXISTS website_url            TEXT;

-- Backfill encrypted token from access_token if empty
UPDATE social_connections
  SET access_token_encrypted = access_token
  WHERE access_token_encrypted IS NULL AND access_token IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. audience_demographics — age/gender/geo breakdown per platform
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audience_demographics (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        TEXT        NOT NULL,
  snapshot_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  age_13_17_pct   NUMERIC(5,2) DEFAULT 0,
  age_18_24_pct   NUMERIC(5,2) DEFAULT 0,
  age_25_34_pct   NUMERIC(5,2) DEFAULT 0,
  age_35_44_pct   NUMERIC(5,2) DEFAULT 0,
  age_45_54_pct   NUMERIC(5,2) DEFAULT 0,
  age_55_plus_pct NUMERIC(5,2) DEFAULT 0,
  gender_male_pct NUMERIC(5,2) DEFAULT 0,
  gender_female_pct NUMERIC(5,2) DEFAULT 0,
  top_countries   JSONB        DEFAULT '[]',  -- [{country, pct}]
  top_cities      JSONB        DEFAULT '[]',
  top_languages   JSONB        DEFAULT '[]',
  peak_hours      JSONB        DEFAULT '[]',  -- [{hour, activity_pct}]
  raw_json        JSONB,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (creator_id, platform, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_ad_creator_platform ON audience_demographics (creator_id, platform, snapshot_date DESC);
ALTER TABLE audience_demographics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator owns demographics" ON audience_demographics FOR ALL USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. content_rankings — top performing posts across platforms
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_rankings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform         TEXT        NOT NULL,
  post_id          TEXT        NOT NULL,
  title            TEXT,
  thumbnail_url    TEXT,
  post_url         TEXT,
  content_type     TEXT,        -- video | image | reel | short | tweet | carousel
  views            BIGINT       DEFAULT 0,
  likes            BIGINT       DEFAULT 0,
  comments         BIGINT       DEFAULT 0,
  shares           BIGINT       DEFAULT 0,
  saves            BIGINT       DEFAULT 0,
  reach            BIGINT       DEFAULT 0,
  impressions      BIGINT       DEFAULT 0,
  engagement_rate  NUMERIC(8,4) DEFAULT 0,
  virality_score   SMALLINT     DEFAULT 0,
  revenue_usd      NUMERIC(12,2) DEFAULT 0,
  posted_at        TIMESTAMPTZ,
  synced_at        TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (creator_id, platform, post_id)
);

CREATE INDEX IF NOT EXISTS idx_cr_creator_engagement ON content_rankings (creator_id, engagement_rate DESC);
CREATE INDEX IF NOT EXISTS idx_cr_creator_views ON content_rankings (creator_id, views DESC);
ALTER TABLE content_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator owns content rankings" ON content_rankings FOR ALL USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. moguls_scores — the composite intelligence score (replaces creator_intelligence scores)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moguls_scores (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id            UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Composite scores (0–1000 scale for precision)
  moguls_score          INTEGER     NOT NULL DEFAULT 0 CHECK (moguls_score BETWEEN 0 AND 1000),
  influence_score       INTEGER     NOT NULL DEFAULT 0 CHECK (influence_score BETWEEN 0 AND 1000),
  authority_score       INTEGER     NOT NULL DEFAULT 0 CHECK (authority_score BETWEEN 0 AND 1000),
  growth_score          INTEGER     NOT NULL DEFAULT 0 CHECK (growth_score BETWEEN 0 AND 1000),
  revenue_score         INTEGER     NOT NULL DEFAULT 0 CHECK (revenue_score BETWEEN 0 AND 1000),
  engagement_score      INTEGER     NOT NULL DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 1000),
  audience_quality      INTEGER     NOT NULL DEFAULT 0 CHECK (audience_quality BETWEEN 0 AND 1000),
  content_score         INTEGER     NOT NULL DEFAULT 0 CHECK (content_score BETWEEN 0 AND 1000),
  virality_score        INTEGER     NOT NULL DEFAULT 0 CHECK (virality_score BETWEEN 0 AND 1000),
  consistency_score     INTEGER     NOT NULL DEFAULT 0 CHECK (consistency_score BETWEEN 0 AND 1000),
  -- Summary metrics
  total_followers       BIGINT      NOT NULL DEFAULT 0,
  total_reach           BIGINT      NOT NULL DEFAULT 0,
  total_impressions     BIGINT      NOT NULL DEFAULT 0,
  total_revenue_usd     NUMERIC(14,2) NOT NULL DEFAULT 0,
  avg_engagement_rate   NUMERIC(8,4)  NOT NULL DEFAULT 0,
  platforms_connected   SMALLINT    NOT NULL DEFAULT 0,
  top_platform          TEXT,
  -- Growth snapshots
  followers_7d_ago      BIGINT      DEFAULT 0,
  followers_30d_ago     BIGINT      DEFAULT 0,
  followers_90d_ago     BIGINT      DEFAULT 0,
  growth_pct_7d         NUMERIC(8,2) DEFAULT 0,
  growth_pct_30d        NUMERIC(8,2) DEFAULT 0,
  growth_pct_90d        NUMERIC(8,2) DEFAULT 0,
  -- AI outputs
  ai_insights           JSONB       NOT NULL DEFAULT '[]',
  ai_recommendations    JSONB       NOT NULL DEFAULT '[]',
  ai_opportunities      JSONB       NOT NULL DEFAULT '[]',
  best_posting_times    JSONB       NOT NULL DEFAULT '{}',  -- {platform: "18:00-20:00"}
  top_content_types     JSONB       NOT NULL DEFAULT '{}',  -- {platform: "educational"}
  predicted_revenue_30d NUMERIC(12,2) DEFAULT 0,
  -- Metadata
  score_version         TEXT        DEFAULT 'v2',
  last_scored_at        TIMESTAMPTZ,
  last_synced_at        TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ms_creator ON moguls_scores (creator_id);
CREATE INDEX IF NOT EXISTS idx_ms_moguls_score ON moguls_scores (moguls_score DESC);
ALTER TABLE moguls_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator owns scores" ON moguls_scores FOR ALL USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. growth_snapshots — hourly/daily tracker for chart rendering
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS growth_snapshots (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform       TEXT        NOT NULL,
  snapshot_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  followers      BIGINT      NOT NULL DEFAULT 0,
  views          BIGINT      NOT NULL DEFAULT 0,
  engagement     NUMERIC(8,4) DEFAULT 0,
  reach          BIGINT      DEFAULT 0,
  posts_published SMALLINT   DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (creator_id, platform, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_gs_creator_date ON growth_snapshots (creator_id, snapshot_date DESC);
ALTER TABLE growth_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator owns snapshots" ON growth_snapshots FOR ALL USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. revenue_attribution — links revenue to content/platform/traffic source
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_attribution (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id  UUID        REFERENCES transactions_v2(id) ON DELETE SET NULL,
  source_platform TEXT,       -- instagram | tiktok | direct | email | etc
  source_content_id TEXT,     -- platform post id that drove the conversion
  revenue_usd     NUMERIC(12,2) NOT NULL DEFAULT 0,
  attributed_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ra_creator ON revenue_attribution (creator_id, attributed_at DESC);
ALTER TABLE revenue_attribution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator owns attribution" ON revenue_attribution FOR ALL USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ai_coach_sessions — persistent AI Growth Coach conversation history
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_coach_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user','assistant','system')),
  content     TEXT        NOT NULL,
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acs_creator_date ON ai_coach_sessions (creator_id, created_at DESC);
ALTER TABLE ai_coach_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator owns sessions" ON ai_coach_sessions FOR ALL USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. platform_health — per-platform health breakdown
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_health (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        TEXT        NOT NULL,
  health_score    SMALLINT    NOT NULL DEFAULT 0 CHECK (health_score BETWEEN 0 AND 100),
  growth_rate     NUMERIC(8,2) DEFAULT 0,
  engagement_rate NUMERIC(8,4) DEFAULT 0,
  posting_frequency NUMERIC(6,2) DEFAULT 0, -- posts per week
  audience_retention NUMERIC(5,2) DEFAULT 0,
  reach_rate      NUMERIC(5,2) DEFAULT 0,
  issues          JSONB       DEFAULT '[]',  -- ["Low engagement", "Inconsistent posting"]
  opportunities   JSONB       DEFAULT '[]',
  snapshot_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (creator_id, platform, snapshot_date)
);

ALTER TABLE platform_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator owns platform health" ON platform_health FOR ALL USING (auth.uid() = creator_id);

COMMIT;
