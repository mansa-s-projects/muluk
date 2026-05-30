-- CIPHER Platform - Migration 007: Creator Public Profiles
-- Run this in Supabase SQL Editor after migration 006.

-- ── fan_code_requests ──────────────────────────────────────────────────────────
-- Stores fan access requests submitted from a creator's public profile page.
-- When a fan submits their email, the creator is notified to send them a code.
CREATE TABLE IF NOT EXISTS fan_code_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  message     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fan_code_requests_creator_id_idx ON fan_code_requests (creator_id);
CREATE INDEX IF NOT EXISTS fan_code_requests_created_at_idx ON fan_code_requests (created_at DESC);

ALTER TABLE fan_code_requests ENABLE ROW LEVEL SECURITY;

-- Creators see their own incoming requests
DROP POLICY IF EXISTS "creator sees own code requests" ON fan_code_requests;
CREATE POLICY "creator sees own code requests"
  ON fan_code_requests FOR SELECT
  USING (creator_id = auth.uid());

-- Service role (API route) inserts requests without user auth
DROP POLICY IF EXISTS "service inserts code requests" ON fan_code_requests;
CREATE POLICY "service inserts code requests"
  ON fan_code_requests FOR INSERT
  WITH CHECK (true);
