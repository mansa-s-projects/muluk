-- CIPHER Platform - Migration 049: Referral Intelligence System

-- ── Creator referral codes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_referral_codes (
  creator_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE CHECK (referral_code ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_referral_codes_code
  ON creator_referral_codes (referral_code);

-- Backfill codes for existing creators.
INSERT INTO creator_referral_codes (creator_id, referral_code)
SELECT
  ca.user_id,
  lower(
    COALESCE(
      NULLIF(regexp_replace(ca.referral_handle, '[^a-zA-Z0-9_-]', '', 'g'), ''),
      NULLIF(regexp_replace(ca.handle, '[^a-zA-Z0-9_-]', '', 'g'), ''),
      'creator' || substr(replace(ca.user_id::text, '-', ''), 1, 10)
    )
  )
FROM creator_applications ca
WHERE ca.user_id IS NOT NULL
ON CONFLICT (creator_id) DO NOTHING;

-- ── Referrals ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL CHECK (referral_code ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  source TEXT,
  status TEXT NOT NULL DEFAULT 'clicked' CHECK (status IN ('clicked', 'signed_up', 'converted')),
  signup_at TIMESTAMPTZ,
  first_purchase_at TIMESTAMPTZ,
  total_revenue_generated BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred_unique
  ON referrals (referred_id)
  WHERE referred_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_created
  ON referrals (referrer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_status_created
  ON referrals (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_referral_code
  ON referrals (referral_code);

-- ── Referral events ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('link_click', 'signup', 'purchase', 'subscription', 'tip', 'vault_unlock')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_events_referral_created
  ON referral_events (referral_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_events_type_created
  ON referral_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_events_metadata_event_id
  ON referral_events ((metadata->>'event_id'))
  WHERE metadata ? 'event_id';

-- ── Atomic revenue increment function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_referral_revenue(
  p_referred_id UUID,
  p_amount BIGINT,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id UUID;
BEGIN
  IF p_referred_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT id
    INTO v_referral_id
  FROM referrals
  WHERE referred_id = p_referred_id
  LIMIT 1;

  IF v_referral_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE referrals
  SET
    status = 'converted',
    signup_at = COALESCE(signup_at, now()),
    first_purchase_at = COALESCE(first_purchase_at, now()),
    total_revenue_generated = total_revenue_generated + p_amount
  WHERE id = v_referral_id;

  INSERT INTO referral_events (referral_id, event_type, metadata)
  VALUES (
    v_referral_id,
    CASE
      WHEN p_event_type IN ('purchase', 'subscription', 'tip', 'vault_unlock') THEN p_event_type
      ELSE 'purchase'
    END,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN v_referral_id;
END;
$$;

REVOKE ALL ON FUNCTION increment_referral_revenue(UUID, BIGINT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_referral_revenue(UUID, BIGINT, TEXT, JSONB) TO service_role;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE creator_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_events ENABLE ROW LEVEL SECURITY;

-- creator_referral_codes policies
DROP POLICY IF EXISTS "creator_referral_codes_owner_select" ON creator_referral_codes;
CREATE POLICY "creator_referral_codes_owner_select"
  ON creator_referral_codes FOR SELECT
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "creator_referral_codes_service_all" ON creator_referral_codes;
CREATE POLICY "creator_referral_codes_service_all"
  ON creator_referral_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- referrals policies
DROP POLICY IF EXISTS "referrals_referrer_select" ON referrals;
CREATE POLICY "referrals_referrer_select"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid());

DROP POLICY IF EXISTS "referrals_referred_select" ON referrals;
CREATE POLICY "referrals_referred_select"
  ON referrals FOR SELECT
  USING (referred_id = auth.uid());

DROP POLICY IF EXISTS "referrals_service_all" ON referrals;
CREATE POLICY "referrals_service_all"
  ON referrals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- referral_events policies
DROP POLICY IF EXISTS "referral_events_owner_select" ON referral_events;
CREATE POLICY "referral_events_owner_select"
  ON referral_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM referrals r
      WHERE r.id = referral_events.referral_id
        AND r.referrer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "referral_events_service_all" ON referral_events;
CREATE POLICY "referral_events_service_all"
  ON referral_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE creator_referral_codes IS 'One unique, shareable referral code per creator.';
COMMENT ON TABLE referrals IS 'Referral attribution rows for click, signup, and conversion lifecycle.';
COMMENT ON TABLE referral_events IS 'Event stream for referral lifecycle analytics.';
