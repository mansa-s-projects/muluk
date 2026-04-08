-- CIPHER — offers table
-- Migration 031
--
-- A creator-managed offer that can be previewed publicly and unlocked after
-- purchase. Status is either 'draft' (invisible to public) or 'published'.
--
-- Differs from offer_drafts (AI-generated, Whop-launched) in that these are
-- manually composed and contain explicit preview/unlock content fields.

BEGIN;

-- ─── offers ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description      TEXT        CHECK (char_length(description) <= 2000),
  price_label      TEXT        CHECK (char_length(price_label) <= 50),  -- display string e.g. "$29/mo"
  thumbnail_url    TEXT        CHECK (thumbnail_url IS NULL OR thumbnail_url ~ '^https?://'),
  preview_content  TEXT        CHECK (char_length(preview_content) <= 5000),  -- shown before purchase
  unlock_content   TEXT        CHECK (char_length(unlock_content) <= 20000), -- revealed after purchase
  whop_link        TEXT        CHECK (whop_link IS NULL OR whop_link ~ '^https?://'),
  status           TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft', 'published')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

-- Primary access pattern: all offers for a creator, newest first
CREATE INDEX IF NOT EXISTS idx_offers_creator
  ON offers (creator_id, created_at DESC);

-- Public listing: only published offers need to be scanned for non-owner reads
CREATE INDEX IF NOT EXISTS idx_offers_published
  ON offers (creator_id, created_at DESC)
  WHERE status = 'published';

-- ─── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Creators manage their own offers (all operations)
DROP POLICY IF EXISTS "creators_manage_own_offers" ON offers;
CREATE POLICY "creators_manage_own_offers"
  ON offers FOR ALL
  USING  (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Anyone (anon + authenticated) can read published offers.
-- unlock_content is intentionally never returned by the public API layer
-- without a verified purchase — enforce this in application code.
DROP POLICY IF EXISTS "public_read_published_offers" ON offers;
CREATE POLICY "public_read_published_offers"
  ON offers FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- ─── updated_at trigger ───────────────────────────────────────────────────────
-- Reuses update_updated_at_column() defined in migration 024.
DROP TRIGGER IF EXISTS trigger_offers_updated_at ON offers;
CREATE TRIGGER trigger_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
