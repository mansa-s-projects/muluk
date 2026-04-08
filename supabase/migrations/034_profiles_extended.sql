-- CIPHER — Migration 034: Extend profiles with full identity fields
-- profiles becomes the single source of truth for public creator identity.

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS handle        TEXT,
  ADD COLUMN IF NOT EXISTS bio           TEXT,
  ADD COLUMN IF NOT EXISTS banner_url    TEXT,
  ADD COLUMN IF NOT EXISTS website       TEXT,
  ADD COLUMN IF NOT EXISTS location      TEXT,
  ADD COLUMN IF NOT EXISTS specialty     TEXT,
  ADD COLUMN IF NOT EXISTS cta_label     TEXT,
  ADD COLUMN IF NOT EXISTS cta_url       TEXT,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Unique handle per creator
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_handle
  ON profiles (handle)
  WHERE handle IS NOT NULL;

COMMIT;
