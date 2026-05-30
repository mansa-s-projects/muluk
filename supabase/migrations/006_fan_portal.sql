-- CIPHER Platform - Migration 006: Fan Portal
-- Run this in Supabase SQL Editor after migration 005.

-- ── fan_portal_views ───────────────────────────────────────────────────────────
-- Tracks every time a fan visits their portal page (analytics).
CREATE TABLE IF NOT EXISTS fan_portal_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_code   TEXT NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fan_portal_views_creator_id_idx ON fan_portal_views (creator_id);
CREATE INDEX IF NOT EXISTS fan_portal_views_fan_code_idx   ON fan_portal_views (fan_code);

ALTER TABLE fan_portal_views ENABLE ROW LEVEL SECURITY;

-- Creators can view analytics for their own fan portal
DROP POLICY IF EXISTS "creator sees own portal views" ON fan_portal_views;
CREATE POLICY "creator sees own portal views"
  ON fan_portal_views FOR SELECT
  USING (creator_id = auth.uid());

-- Service role (used by API routes) can insert views without auth
DROP POLICY IF EXISTS "service inserts portal views" ON fan_portal_views;
CREATE POLICY "service inserts portal views"
  ON fan_portal_views FOR INSERT
  WITH CHECK (true);

-- ── fan_unlocks ────────────────────────────────────────────────────────────────
-- Records content unlock intents/purchases from fans.
-- amount_paid = 0 means "notify me" intent; > 0 means completed payment.
CREATE TABLE IF NOT EXISTS fan_unlocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_code    TEXT NOT NULL,
  content_id  UUID NOT NULL,
  creator_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS fan_unlocks_code_content_unique
  ON fan_unlocks (fan_code, content_id);

CREATE INDEX IF NOT EXISTS fan_unlocks_creator_id_idx ON fan_unlocks (creator_id);
CREATE INDEX IF NOT EXISTS fan_unlocks_fan_code_idx   ON fan_unlocks (fan_code);

ALTER TABLE fan_unlocks ENABLE ROW LEVEL SECURITY;

-- Creators see unlock activity for their content
DROP POLICY IF EXISTS "creator sees own unlocks" ON fan_unlocks;
CREATE POLICY "creator sees own unlocks"
  ON fan_unlocks FOR SELECT
  USING (creator_id = auth.uid());

-- Service role can insert/upsert unlock records
DROP POLICY IF EXISTS "service manages unlocks" ON fan_unlocks;
CREATE POLICY "service manages unlocks"
  ON fan_unlocks FOR ALL
  WITH CHECK (true);
