-- CIPHER Platform - Migration 005: RLS policies for core creator tables
-- Run this in Supabase SQL Editor after migration 004.

-- ── creator_wallets ────────────────────────────────────────────────────────────
ALTER TABLE creator_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator sees own wallet" ON creator_wallets;
CREATE POLICY "creator sees own wallet"
  ON creator_wallets FOR SELECT
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "creator updates own wallet" ON creator_wallets;
CREATE POLICY "creator updates own wallet"
  ON creator_wallets FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- ── fan_codes ──────────────────────────────────────────────────────────────────
ALTER TABLE fan_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator sees own fan codes" ON fan_codes;
CREATE POLICY "creator sees own fan codes"
  ON fan_codes FOR SELECT
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "creator manages own fan codes" ON fan_codes;
CREATE POLICY "creator manages own fan codes"
  ON fan_codes FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- ── transactions ───────────────────────────────────────────────────────────────
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator sees own transactions" ON transactions;
CREATE POLICY "creator sees own transactions"
  ON transactions FOR SELECT
  USING (creator_id = auth.uid());

-- ── content_items ──────────────────────────────────────────────────────────────
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator manages own content" ON content_items;
CREATE POLICY "creator manages own content"
  ON content_items FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- ── withdrawal_requests ────────────────────────────────────────────────────────
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator manages own withdrawals" ON withdrawal_requests;
CREATE POLICY "creator manages own withdrawals"
  ON withdrawal_requests FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- ── creator_applications ───────────────────────────────────────────────────────
-- Add user_id if missing so policy expressions and app upserts are valid.
ALTER TABLE creator_applications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS creator_applications_user_id_unique
  ON creator_applications (user_id)
  WHERE user_id IS NOT NULL;

-- Allows each creator to read/update their own profile row.
ALTER TABLE creator_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator sees own application" ON creator_applications;
CREATE POLICY "creator sees own application"
  ON creator_applications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "creator updates own application" ON creator_applications;
CREATE POLICY "creator updates own application"
  ON creator_applications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "creator inserts own application" ON creator_applications;
CREATE POLICY "creator inserts own application"
  ON creator_applications FOR INSERT
  WITH CHECK (user_id = auth.uid());
