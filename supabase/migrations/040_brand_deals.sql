-- ============================================================
-- 040_brand_deals.sql
-- Brand Deal Tracker — creators manage sponsorships & brand partnerships
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS brand_deals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brand_name   TEXT        NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  amount_cents INT         NOT NULL DEFAULT 0 CHECK(amount_cents >= 0),
  currency     TEXT        NOT NULL DEFAULT 'USD',
  deadline     DATE,
  deliverables TEXT,       -- free-form notes on what's required
  notes        TEXT,
  tags         TEXT[],
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK(status IN ('pending','active','delivered','paid','cancelled')),
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward compatibility for older brand_deals schemas.
ALTER TABLE brand_deals
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_brand_deals_creator ON brand_deals(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_deals_status  ON brand_deals(creator_id, status);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE brand_deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator_manage_brand_deals" ON brand_deals;
CREATE POLICY "creator_manage_brand_deals"
  ON brand_deals FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- ── Updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_brand_deal_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brand_deal_updated_at ON brand_deals;
CREATE TRIGGER trg_brand_deal_updated_at
  BEFORE UPDATE ON brand_deals
  FOR EACH ROW EXECUTE FUNCTION update_brand_deal_updated_at();

-- ── Monthly earnings helper ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_brand_deal_monthly_earnings(p_creator_id UUID, p_year INT)
RETURNS TABLE(month INT, total_cents BIGINT)
LANGUAGE plpgsql AS $$
DECLARE
  start_of_year DATE := make_date(p_year, 1, 1);
  start_of_next_year DATE := make_date(p_year + 1, 1, 1);
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(MONTH FROM paid_at)::INT AS month,
    SUM(amount_cents)::BIGINT        AS total_cents
  FROM brand_deals
  WHERE creator_id = p_creator_id
    AND status = 'paid'
    AND paid_at >= start_of_year
    AND paid_at < start_of_next_year
  GROUP BY 1
  ORDER BY 1;
END;
$$;

COMMIT;
