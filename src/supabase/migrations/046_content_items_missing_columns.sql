-- Migration 046: Add missing columns to content_items
-- Adds tags, burn_mode, and expires_at which are used by ContentManager
-- but were never added via migration. Safe to re-run (IF NOT EXISTS / defaults).

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS tags       TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS burn_mode  BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Index for tag-based searches
CREATE INDEX IF NOT EXISTS idx_content_items_tags
  ON content_items USING GIN (tags);

-- Index for burn-mode sweep jobs (if scheduled)
CREATE INDEX IF NOT EXISTS idx_content_items_expires_at
  ON content_items (expires_at)
  WHERE expires_at IS NOT NULL;
