-- ============================================================
-- 041_tips.sql
-- Tip Jar + Wall of Love — fans send tips with optional messages
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tips (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Fan identity
  display_name     TEXT,                         -- null or "Anonymous" when hidden
  is_anonymous     BOOLEAN     NOT NULL DEFAULT false,
  fan_email        TEXT,
  -- Content
  amount_cents     INT         NOT NULL CHECK(amount_cents >= 100),
  message          TEXT,                         -- optional public message
  -- Payment
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK(status IN ('pending','paid','refunded')),
  whop_product_id  TEXT,
  whop_checkout_id TEXT,
  whop_payment_id  TEXT        UNIQUE,
  access_token     TEXT        UNIQUE NOT NULL
                     DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward compatibility for older tips table shapes.
ALTER TABLE tips
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS amount_cents INT;

UPDATE tips
SET status = 'paid'
WHERE status IS NULL;

UPDATE tips
SET access_token = encode(extensions.gen_random_bytes(24), 'hex')
WHERE access_token IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tips'
      AND column_name = 'amount'
  ) THEN
    EXECUTE 'UPDATE tips SET amount_cents = COALESCE(amount_cents, amount)';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tips_access_token_unique
  ON tips(access_token)
  WHERE access_token IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tips'
      AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_tips_creator ON tips(creator_id, status, created_at DESC);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tips_token          ON tips(access_token);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tips'
      AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_tips_public_wall ON tips(creator_id, paid_at DESC)
      WHERE status = 'paid';
  END IF;
END $$;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Fans can see paid tips on the public wall (only non-sensitive fields exposed in API)
DROP POLICY IF EXISTS "public_read_paid_tips" ON tips;
CREATE POLICY "public_read_paid_tips"
  ON tips FOR SELECT
  USING (status::text = 'paid');

-- Fans can insert tips
DROP POLICY IF EXISTS "public_insert_tips" ON tips;
CREATE POLICY "public_insert_tips"
  ON tips FOR INSERT
  WITH CHECK (true);

-- Creator reads all their own tips
DROP POLICY IF EXISTS "creator_manage_tips" ON tips;
CREATE POLICY "creator_manage_tips"
  ON tips FOR ALL
  USING (creator_id = auth.uid());

-- ── Tip earnings helper ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_tip_monthly_earnings(p_creator_id UUID, p_year INT)
RETURNS TABLE(month INT, total_cents BIGINT, tip_count BIGINT) LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tips'
      AND column_name = 'amount_cents'
  ) THEN
    RETURN QUERY
    SELECT
      EXTRACT(MONTH FROM paid_at)::INT AS month,
      SUM(amount_cents)::BIGINT        AS total_cents,
      COUNT(*)::BIGINT                 AS tip_count
    FROM tips
    WHERE creator_id = p_creator_id
      AND status::text = 'paid'
      AND EXTRACT(YEAR FROM paid_at) = p_year
    GROUP BY 1
    ORDER BY 1;
  ELSE
    RETURN QUERY
    SELECT
      EXTRACT(MONTH FROM paid_at)::INT AS month,
      SUM(amount)::BIGINT              AS total_cents,
      COUNT(*)::BIGINT                 AS tip_count
    FROM tips
    WHERE creator_id = p_creator_id
      AND status::text = 'paid'
      AND EXTRACT(YEAR FROM paid_at) = p_year
    GROUP BY 1
    ORDER BY 1;
  END IF;
END;
$$;

COMMIT;
