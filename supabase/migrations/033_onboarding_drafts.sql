-- CIPHER — Migration 033: Onboarding draft persistence
-- Stores in-progress wizard state server-side so progress survives
-- across devices, browsers, and sessions.

BEGIN;

CREATE TABLE IF NOT EXISTS onboarding_drafts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step        SMALLINT    NOT NULL DEFAULT 1,
  data_json   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT onboarding_drafts_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_user
  ON onboarding_drafts (user_id);

ALTER TABLE onboarding_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_drafts_owner_all" ON onboarding_drafts;
CREATE POLICY "onboarding_drafts_owner_all" ON onboarding_drafts
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
