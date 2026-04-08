-- CIPHER — Migration 036: Rate Card Generator
-- Stores creator stats inputs and generated pricing rate cards.

BEGIN;

-- ── creator_stats ─────────────────────────────────────────────────────────
-- One row per creator. Stores the inputs used for rate card generation.
CREATE TABLE IF NOT EXISTS creator_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followers       INTEGER NOT NULL CHECK (followers >= 0),
  engagement_rate NUMERIC(5,2) NOT NULL CHECK (engagement_rate >= 0 AND engagement_rate <= 100),
  niche           TEXT NOT NULL,
  content_type    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (creator_id)
);

-- ── rate_cards ─────────────────────────────────────────────────────────────
-- One row per creator. All prices stored in cents for precision.
CREATE TABLE IF NOT EXISTS rate_cards (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug                 TEXT NOT NULL UNIQUE,
  title                TEXT,
  brand_deal_price     INTEGER NOT NULL CHECK (brand_deal_price >= 0), -- cents
  story_post_price     INTEGER NOT NULL CHECK (story_post_price >= 0), -- cents
  session_price        INTEGER NOT NULL CHECK (session_price >= 0),    -- cents
  subscription_price   INTEGER NOT NULL CHECK (subscription_price >= 0), -- cents
  is_public            BOOLEAN NOT NULL DEFAULT TRUE,
  view_count           INTEGER NOT NULL DEFAULT 0,
  stats_snapshot       JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (creator_id)
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rate_cards_slug       ON rate_cards (slug);
CREATE INDEX IF NOT EXISTS idx_rate_cards_creator_id ON rate_cards (creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_stats_creator ON creator_stats (creator_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE creator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cards    ENABLE ROW LEVEL SECURITY;

-- Creators manage their own stats
DROP POLICY IF EXISTS "creator_stats_owner" ON creator_stats;
CREATE POLICY "creator_stats_owner"
  ON creator_stats FOR ALL
  USING  (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Creators manage their own rate cards
DROP POLICY IF EXISTS "rate_cards_owner" ON rate_cards;
CREATE POLICY "rate_cards_owner"
  ON rate_cards FOR ALL
  USING  (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Anyone can view public rate cards (for shareable page)
DROP POLICY IF EXISTS "rate_cards_public_read" ON rate_cards;
CREATE POLICY "rate_cards_public_read"
  ON rate_cards FOR SELECT
  USING (is_public = TRUE);

-- ── Updated-at trigger ────────────────────────────────────────────────────
-- Reuse the function if it already exists from another migration.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_creator_stats_updated_at'
  ) THEN
    CREATE TRIGGER set_creator_stats_updated_at
      BEFORE UPDATE ON creator_stats
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_rate_cards_updated_at'
  ) THEN
    CREATE TRIGGER set_rate_cards_updated_at
      BEFORE UPDATE ON rate_cards
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── View count increment (security definer to bypass RLS) ─────────────────
CREATE OR REPLACE FUNCTION increment_rate_card_views(p_slug TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE rate_cards SET view_count = view_count + 1 WHERE slug = p_slug;
END;
$$;

COMMIT;
