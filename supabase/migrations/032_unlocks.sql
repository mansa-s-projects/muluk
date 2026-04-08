-- CIPHER — Unlock system
-- Migration 032
--
-- A minimal access-gating table. One row = one user has purchased/been granted
-- access to one offer. The offer page checks this before revealing unlock_content.

BEGIN;

-- ─── unlocks ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS unlocks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id    UUID        NOT NULL REFERENCES offers(id)       ON DELETE CASCADE,
  creator_id  UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One unlock per (offer, user) — prevents duplicates
  CONSTRAINT unlocks_offer_user_unique UNIQUE (offer_id, user_id)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

-- Primary read: "does this user have access to this offer?"
CREATE INDEX IF NOT EXISTS idx_unlocks_user_offer
  ON unlocks (user_id, offer_id);

-- Creator dashboard: all users who unlocked an offer
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'unlocks'
      AND column_name = 'creator_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_unlocks_creator_offer
      ON unlocks (creator_id, offer_id, created_at DESC);
  END IF;
END $$;

-- ─── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE unlocks ENABLE ROW LEVEL SECURITY;

-- Users can see their own unlock records (to check their own access)
DROP POLICY IF EXISTS "users_read_own_unlocks" ON unlocks;
CREATE POLICY "users_read_own_unlocks"
  ON unlocks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Creators can see all unlocks for their offers (sales dashboard)
DROP POLICY IF EXISTS "creators_read_offer_unlocks" ON unlocks;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'unlocks'
      AND column_name = 'creator_id'
  ) THEN
    CREATE POLICY "creators_read_offer_unlocks"
      ON unlocks FOR SELECT
      TO authenticated
      USING (auth.uid() = creator_id);
  END IF;
END $$;

-- Only service_role can insert — purchases go through the API/webhook,
-- not directly from the client, to prevent self-granting access.
DROP POLICY IF EXISTS "service_role_unlocks_all" ON unlocks;
CREATE POLICY "service_role_unlocks_all"
  ON unlocks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── updated_at not needed — unlocks are append-only ─────────────────────────

COMMIT;
