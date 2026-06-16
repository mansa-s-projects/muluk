-- CIPHER — Migration 035: Signal Board
-- Trending monetization signals, creator preferences, and engagement tracking.

BEGIN;

-- ── 1. signals ───────────────────────────────────────────────────────────────
-- One row per unique trend signal. Refreshed periodically by the signal engine.

CREATE TABLE IF NOT EXISTS signals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  niche           TEXT        NOT NULL,          -- 'fitness', 'finance', 'gaming', etc.
  source          TEXT        NOT NULL,          -- 'tiktok', 'twitter', 'google', 'ai'
  topic           TEXT        NOT NULL,          -- raw trend topic, e.g. "cortisol detox"
  title           TEXT        NOT NULL,          -- human-readable signal headline
  summary         TEXT,                          -- 1-2 sentence context

  -- Scoring
  score           SMALLINT    NOT NULL DEFAULT 50 CHECK (score BETWEEN 0 AND 100),
  demand_level    TEXT        NOT NULL DEFAULT 'medium' CHECK (demand_level IN ('low', 'medium', 'high', 'viral')),
  velocity        NUMERIC(6,2) NOT NULL DEFAULT 0, -- rate of rise (0–100)

  -- Monetization suggestions
  suggested_product TEXT,                        -- product idea
  suggested_price   NUMERIC(10,2),              -- suggested price in USD
  offer_type        TEXT,                        -- 'course', 'coaching', 'drop', 'community', 'digital'
  action_suggestion TEXT,                        -- what to post / create

  -- Metadata
  keywords        TEXT[]      NOT NULL DEFAULT '{}',
  source_url      TEXT,
  expires_at      TIMESTAMPTZ,                   -- signals expire to keep board fresh
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signals_niche_active   ON signals (niche, is_active, score DESC);
CREATE INDEX IF NOT EXISTS idx_signals_source         ON signals (source);
CREATE INDEX IF NOT EXISTS idx_signals_expires        ON signals (expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

-- Signals are readable by all authenticated users; only service role can write
DROP POLICY IF EXISTS "signals_read_authenticated" ON signals;
CREATE POLICY "signals_read_authenticated" ON signals
  FOR SELECT USING (auth.role() = 'authenticated');


-- ── 2. creator_signal_preferences ───────────────────────────────────────────
-- Per-creator niche mapping and personalization overrides.

CREATE TABLE IF NOT EXISTS creator_signal_preferences (
  user_id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  niches          TEXT[]      NOT NULL DEFAULT '{}',    -- subscribed niches
  muted_topics    TEXT[]      NOT NULL DEFAULT '{}',    -- topics to hide
  notify_on_viral BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE creator_signal_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator_signal_preferences_owner" ON creator_signal_preferences;
CREATE POLICY "creator_signal_preferences_owner" ON creator_signal_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ── 3. signal_engagement ─────────────────────────────────────────────────────
-- Tracks creator interactions with signals (views, clicks, launches).

CREATE TABLE IF NOT EXISTS signal_engagement (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id       UUID        NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  action          TEXT        NOT NULL CHECK (action IN ('view', 'click', 'launch', 'dismiss')),
  metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT signal_engagement_unique_action UNIQUE (user_id, signal_id, action)
);

CREATE INDEX IF NOT EXISTS idx_signal_engagement_user   ON signal_engagement (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_engagement_signal ON signal_engagement (signal_id);

ALTER TABLE signal_engagement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signal_engagement_owner_insert" ON signal_engagement;
CREATE POLICY "signal_engagement_owner_insert" ON signal_engagement
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "signal_engagement_owner_select" ON signal_engagement;
CREATE POLICY "signal_engagement_owner_select" ON signal_engagement
  FOR SELECT USING (auth.uid() = user_id);

COMMIT;
