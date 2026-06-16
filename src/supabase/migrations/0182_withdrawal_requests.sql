-- CIPHER Platform - Migration 018: Withdrawal Requests
-- Enables creators to request payouts of their earned balance.
-- Integrates with creator_payout_settings (migration 008/017) and
-- transactions_v2 (migration 006) as the earnings source of truth.

-- ── withdrawal_requests ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Amount requested in cents (USD)
  amount_cents     INTEGER NOT NULL CHECK (amount_cents >= 1000), -- $10 minimum
  currency         TEXT NOT NULL DEFAULT 'usd',

  -- Payout destination (snapshot from creator_payout_settings at time of request)
  payout_method    TEXT NOT NULL CHECK (payout_method IN ('whop', 'stripe', 'crypto', 'wise', 'paypal')),
  payout_details   TEXT,                 -- account id / wallet / email — encrypted at app layer

  -- Lifecycle
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  -- Admin review
  reviewed_by      UUID REFERENCES auth.users(id),
  reviewed_at      TIMESTAMPTZ,
  admin_notes      TEXT,

  -- External reference once processed
  external_tx_id   TEXT,                 -- Whop transfer ID, Stripe payout ID, etc.

  -- Audit
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward compatibility: if the table existed from older schemas,
-- ensure columns used below exist before creating dependent views.
ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT;

DO $$
BEGIN
  -- If legacy column `amount` exists, backfill `amount_cents`.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'withdrawal_requests'
      AND column_name = 'amount'
  ) THEN
    EXECUTE 'UPDATE withdrawal_requests
             SET amount_cents = (amount::numeric * 100)::bigint
             WHERE amount_cents IS NULL AND amount IS NOT NULL';
  END IF;

  -- Keep old rows compatible with current lifecycle enum usage.
  UPDATE withdrawal_requests
  SET status = 'pending'
  WHERE status IS NULL;
END $$;

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Creators: read and insert their own requests only
DROP POLICY IF EXISTS "creator_withdrawal_select" ON withdrawal_requests;
CREATE POLICY "creator_withdrawal_select" ON withdrawal_requests
  FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "creator_withdrawal_insert" ON withdrawal_requests;
CREATE POLICY "creator_withdrawal_insert" ON withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Creators can only cancel their own pending requests
DROP POLICY IF EXISTS "creator_withdrawal_cancel" ON withdrawal_requests;
CREATE POLICY "creator_withdrawal_cancel" ON withdrawal_requests
  FOR UPDATE
  USING (auth.uid() = creator_id AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- Admins: full access
DROP POLICY IF EXISTS "admin_withdrawal_all" ON withdrawal_requests;
CREATE POLICY "admin_withdrawal_all" ON withdrawal_requests
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Indices
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_creator
  ON withdrawal_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status
  ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created
  ON withdrawal_requests(created_at DESC);

-- ── creator_available_balance view ───────────────────────────────────────────
-- Computes spendable balance: earned - already-requested (pending/processing/completed)
CREATE OR REPLACE VIEW creator_available_balance AS
SELECT
  t.creator_id,
  COALESCE(SUM(t.creator_earnings), 0)                           AS total_earned_cents,
  COALESCE(SUM(
    CASE WHEN wr.status IN ('pending', 'processing', 'completed')
         THEN wr.amount_cents ELSE 0 END
  ), 0)                                                          AS total_withdrawn_cents,
  COALESCE(SUM(t.creator_earnings), 0)
    - COALESCE(SUM(
        CASE WHEN wr.status IN ('pending', 'processing', 'completed')
             THEN wr.amount_cents ELSE 0 END
      ), 0)                                                      AS available_cents
FROM transactions_v2 t
LEFT JOIN withdrawal_requests wr ON wr.creator_id = t.creator_id
WHERE t.status = 'success'
GROUP BY t.creator_id;

-- Creators can only see their own balance row
DROP POLICY IF EXISTS "creator_balance_select" ON creator_available_balance;
-- Views don't support RLS directly; security enforced at API layer via auth.uid() filter

COMMENT ON TABLE withdrawal_requests IS 'Creator payout requests — tracks full lifecycle from request to completion';
COMMENT ON VIEW  creator_available_balance IS 'Real-time available balance per creator based on earned minus withdrawn';
