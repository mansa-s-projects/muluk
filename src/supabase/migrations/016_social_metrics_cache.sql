-- CIPHER Platform - Migration 016: social metrics cache

ALTER TABLE social_connections
  ADD COLUMN IF NOT EXISTS metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_url TEXT;

CREATE INDEX IF NOT EXISTS idx_social_connections_last_synced
  ON social_connections(last_synced_at DESC);