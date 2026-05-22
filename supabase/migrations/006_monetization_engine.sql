-- CIPHER Platform - Migration 006: Monetization Engine (v2 tables)
-- Safe mode: creates NEW tables only. Does NOT modify existing tables.
-- Run this in Supabase SQL Editor.

-- ── content_items_v2 ────────────────────────────────────────────────────────
-- Paid content uploaded by creators
CREATE TABLE IF NOT EXISTS content_items_v2 (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL CHECK (price > 0),    -- in smallest currency unit (cents)
  currency    TEXT NOT NULL DEFAULT 'usd',
  whop_checkout_url TEXT,
  file_url    TEXT,                                   -- Supabase Storage URL or external
  preview_url TEXT,                                   -- optional preview image/text
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_items_v2
  ADD COLUMN IF NOT EXISTS whop_checkout_url TEXT;

ALTER TABLE content_items_v2 ENABLE ROW LEVEL SECURITY;

-- Creators manage their own content
DROP POLICY IF EXISTS "v2_content_creator_all" ON content_items_v2;
CREATE POLICY "v2_content_creator_all" ON content_items_v2
  FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Public can read active content metadata (title, price, preview — NOT file_url)
DROP POLICY IF EXISTS "v2_content_public_select" ON content_items_v2;
CREATE POLICY "v2_content_public_select" ON content_items_v2
  FOR SELECT
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_content_items_v2_creator ON content_items_v2(creator_id);
CREATE INDEX IF NOT EXISTS idx_content_items_v2_active  ON content_items_v2(is_active) WHERE is_active = true;

-- ── fan_codes_v2 ────────────────────────────────────────────────────────────
-- One code per fan-per-content purchase. Code is the unlock key.
CREATE TABLE IF NOT EXISTS fan_codes_v2 (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  content_id      UUID NOT NULL REFERENCES content_items_v2(id) ON DELETE CASCADE,
  is_paid         BOOLEAN DEFAULT false,
  payment_method  TEXT,                              -- 'stripe' | 'crypto' | null
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fan_codes_v2 ENABLE ROW LEVEL SECURITY;

-- Anyone can read fan codes by code (needed for unlock page)
DROP POLICY IF EXISTS "v2_fan_codes_public_select" ON fan_codes_v2;
CREATE POLICY "v2_fan_codes_public_select" ON fan_codes_v2
  FOR SELECT
  USING (true);

-- Only service role / API can insert/update (handled via supabase service key or anon with RPC)
-- For now allow inserts from authenticated users (creators generating codes)
DROP POLICY IF EXISTS "v2_fan_codes_auth_insert" ON fan_codes_v2;
CREATE POLICY "v2_fan_codes_auth_insert" ON fan_codes_v2
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_items_v2 c
      WHERE c.id = content_id AND c.creator_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_fan_codes_v2_code       ON fan_codes_v2(code);
CREATE INDEX IF NOT EXISTS idx_fan_codes_v2_content_id ON fan_codes_v2(content_id);

-- ── transactions_v2 ────────────────────────────────────────────────────────
-- Every payment event (Stripe, crypto, future methods)
CREATE TABLE IF NOT EXISTS transactions_v2 (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id        UUID NOT NULL REFERENCES content_items_v2(id) ON DELETE CASCADE,
  fan_code_id       UUID NOT NULL REFERENCES fan_codes_v2(id) ON DELETE CASCADE,
  creator_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount            INTEGER NOT NULL,                 -- smallest currency unit
  currency          TEXT NOT NULL DEFAULT 'usd',
  payment_method    TEXT NOT NULL,                     -- 'stripe' | 'crypto'
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  stripe_session_id TEXT,
  whop_payment_id   TEXT,
  crypto_tx_hash    TEXT,
  platform_fee      INTEGER,                          -- platform cut in cents
  creator_earnings  INTEGER,                          -- creator cut in cents
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions_v2
  ADD COLUMN IF NOT EXISTS whop_payment_id TEXT;

ALTER TABLE transactions_v2 ENABLE ROW LEVEL SECURITY;

-- Creators can view their own transactions
DROP POLICY IF EXISTS "v2_transactions_creator_select" ON transactions_v2;
CREATE POLICY "v2_transactions_creator_select" ON transactions_v2
  FOR SELECT
  USING (auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS idx_transactions_v2_creator     ON transactions_v2(creator_id);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_content     ON transactions_v2(content_id);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_stripe_sess ON transactions_v2(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_v2_whop_payment ON transactions_v2(whop_payment_id)
  WHERE whop_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_v2_status      ON transactions_v2(status);

-- ── Helper: idempotency check for webhooks ──────────────────────────────────
-- Prevents duplicate transaction inserts from repeated webhook deliveries
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_v2_stripe_unique
  ON transactions_v2(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL AND status = 'success';

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_v2_whop_unique
  ON transactions_v2(whop_payment_id)
  WHERE whop_payment_id IS NOT NULL AND status = 'success';
