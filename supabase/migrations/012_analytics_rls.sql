-- CIPHER Platform - Migration 012: Analytics RLS hardening
-- Enables RLS and adds least-privilege read/insert policies for analytics tables.

-- ── activity_log ─────────────────────────────────────────────────────────────
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_log_user_select" ON activity_log;
CREATE POLICY "activity_log_user_select"
  ON activity_log FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "activity_log_user_insert" ON activity_log;
CREATE POLICY "activity_log_user_insert"
  ON activity_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ── transactions (legacy analytics table) ───────────────────────────────────
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_user_select" ON transactions;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'fan_id'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "transactions_user_select"
        ON transactions FOR SELECT
        USING (creator_id = auth.uid() OR fan_id = auth.uid())
    $policy$;
  ELSE
    EXECUTE $policy$
      CREATE POLICY "transactions_user_select"
        ON transactions FOR SELECT
        USING (creator_id = auth.uid())
    $policy$;
  END IF;
END $$;
