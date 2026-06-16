-- CIPHER Platform - Migration 008: Referral System
-- Run this in Supabase SQL Editor after migration 007.

-- ── referral_slug on creator_applications ─────────────────────────────────────
-- Customizable referral slug (defaults to handle at the app layer).
-- Must be unique, 3-30 chars, alphanumeric + hyphens.
ALTER TABLE creator_applications
  ADD COLUMN IF NOT EXISTS referral_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS creator_apps_referral_slug_unique
  ON creator_applications (LOWER(referral_slug))
  WHERE referral_slug IS NOT NULL;

-- ── referrals ─────────────────────────────────────────────────────────────────
-- Tracks every referral relationship: who referred whom and what it earned.
CREATE TABLE IF NOT EXISTS referrals (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email TEXT        NOT NULL,
  referred_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_slug  TEXT        NOT NULL,  -- slug used at the time of referral
  status         TEXT        NOT NULL DEFAULT 'pending',
    -- pending  = applied but not yet activated
    -- active   = referred creator logged in / activated their account
    -- rewarded = referral_income has been credited to referrer wallet
  reward_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  activated_at   TIMESTAMPTZ,
  rewarded_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx  ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_email_idx ON referrals (referred_email);
CREATE INDEX IF NOT EXISTS referrals_referral_slug_idx  ON referrals (referral_slug);
CREATE INDEX IF NOT EXISTS referrals_status_idx         ON referrals (status);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Referrer sees their own outgoing referrals
DROP POLICY IF EXISTS "referrals_referrer_select" ON referrals;
CREATE POLICY "referrals_referrer_select"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid());

-- Service role inserts (when someone applies via ref link)
DROP POLICY IF EXISTS "referrals_service_insert" ON referrals;
CREATE POLICY "referrals_service_insert"
  ON referrals FOR INSERT
  WITH CHECK (true);

-- Service role updates (activate/reward)
DROP POLICY IF EXISTS "referrals_service_update" ON referrals;
CREATE POLICY "referrals_service_update"
  ON referrals FOR UPDATE
  USING (true);

-- ── referral_clicks ───────────────────────────────────────────────────────────
-- Lightweight click tracking for referral links (analytics only).
CREATE TABLE IF NOT EXISTS referral_clicks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_slug  TEXT        NOT NULL,
  ip_hash        TEXT,       -- sha256 of IP, never store raw IPs
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_clicks_slug_idx ON referral_clicks (referral_slug);
CREATE INDEX IF NOT EXISTS referral_clicks_created_at_idx ON referral_clicks (created_at DESC);

ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;

-- Service role inserts only; no user access needed
DROP POLICY IF EXISTS "referral_clicks_service_insert" ON referral_clicks;
CREATE POLICY "referral_clicks_service_insert"
  ON referral_clicks FOR INSERT
  WITH CHECK (true);
