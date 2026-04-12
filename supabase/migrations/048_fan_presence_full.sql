-- ============================================================
-- 048_fan_presence_full.sql
-- Fan Presence System — realtime online/activity tracking
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. fan_presence
--    One row per fan code. Upserted on heartbeat.
--    creator_id is denormalized for fast per-creator queries and RLS.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fan_presence (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_code_id    UUID        NOT NULL REFERENCES fan_codes_v2(id) ON DELETE CASCADE,
  creator_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Presence state
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_page   TEXT,          -- '/handle/vault', '/handle/series', etc.
  session_id     TEXT,          -- random per-tab session identifier

  -- Computed helper columns (updated via trigger)
  is_online      BOOLEAN     NOT NULL GENERATED ALWAYS AS (
                   last_seen_at > (NOW() - INTERVAL '2 minutes')
                 ) STORED,

  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fan_presence_fan_code_unique UNIQUE (fan_code_id)
);

CREATE INDEX IF NOT EXISTS idx_fan_presence_creator
  ON fan_presence (creator_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_fan_presence_online
  ON fan_presence (creator_id, is_online, last_seen_at DESC)
  WHERE is_online = TRUE;

CREATE INDEX IF NOT EXISTS idx_fan_presence_recent
  ON fan_presence (creator_id, last_seen_at DESC)
  WHERE last_seen_at > (NOW() - INTERVAL '15 minutes');

ALTER TABLE fan_presence ENABLE ROW LEVEL SECURITY;

-- Creators can only read their own fans' presence
DROP POLICY IF EXISTS "fan_presence_creator_select" ON fan_presence;
CREATE POLICY "fan_presence_creator_select"
  ON fan_presence FOR SELECT
  USING (auth.uid() = creator_id);

-- Service role handles all writes (upserted from API route)
DROP POLICY IF EXISTS "fan_presence_service_all" ON fan_presence;
CREATE POLICY "fan_presence_service_all"
  ON fan_presence FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. fan_activity
--    Append-only event log. Kept at most 30 days by scheduled purge.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fan_activity (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_code_id    UUID        NOT NULL REFERENCES fan_codes_v2(id) ON DELETE CASCADE,
  creator_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  activity_type  TEXT        NOT NULL
                 CHECK (activity_type IN (
                   'page_view',
                   'vault_view',
                   'tip_click',
                   'message_open',
                   'booking_view',
                   'series_view',
                   'content_unlock',
                   'checkout_open'
                 )),

  page           TEXT,               -- URL path
  content_id     TEXT,               -- optional content reference (UUID as text)
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fan_activity_creator_recent
  ON fan_activity (creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fan_activity_fan_creator
  ON fan_activity (fan_code_id, creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fan_activity_type
  ON fan_activity (creator_id, activity_type, created_at DESC);

ALTER TABLE fan_activity ENABLE ROW LEVEL SECURITY;

-- Creators read their own fan activity
DROP POLICY IF EXISTS "fan_activity_creator_select" ON fan_activity;
CREATE POLICY "fan_activity_creator_select"
  ON fan_activity FOR SELECT
  USING (auth.uid() = creator_id);

-- Service role all access
DROP POLICY IF EXISTS "fan_activity_service_all" ON fan_activity;
CREATE POLICY "fan_activity_service_all"
  ON fan_activity FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. updated_at auto-refresh trigger on fan_presence
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_fan_presence_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fan_presence_updated_at ON fan_presence;
CREATE TRIGGER trg_fan_presence_updated_at
  BEFORE UPDATE ON fan_presence
  FOR EACH ROW EXECUTE FUNCTION update_fan_presence_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Enable Realtime on fan_presence so creator dashboards get live updates
-- ─────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE fan_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE fan_activity;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Purge job: delete fan_activity older than 30 days to control table size
--    Runs via pg_cron if enabled, otherwise safe to run manually.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'purge-old-fan-activity',
      '0 3 * * *',
      $$DELETE FROM fan_activity WHERE created_at < NOW() - INTERVAL '30 days'$$
    );
  END IF;
END $$;

COMMIT;
