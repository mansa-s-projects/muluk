-- ============================================================
-- 039_commissions.sql
-- Commission Inbox — fans request custom work, pay before delivery
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Commissions ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commissions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Fan details (no account required)
  fan_email        TEXT        NOT NULL,
  fan_name         TEXT,
  -- Request
  title            TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  budget_cents     INT         NOT NULL CHECK(budget_cents >= 100),
  deadline         DATE,
  -- Creator notes (internal)
  notes            TEXT,
  -- Status lifecycle: pending → accepted/rejected → paid → delivered
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK(status IN ('pending','accepted','rejected','paid','delivered','cancelled')),
  -- Negotiated final price (can differ from budget)
  agreed_cents     INT,
  -- Whop payment
  whop_product_id  TEXT,
  whop_checkout_id TEXT,
  whop_payment_id  TEXT        UNIQUE,
  -- Per-purchase access token for fan to check status
  access_token     TEXT        UNIQUE NOT NULL
                     DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  paid_at          TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward compatibility for pre-existing commissions table versions.
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS access_token TEXT;

UPDATE commissions
SET access_token = encode(extensions.gen_random_bytes(24), 'hex')
WHERE access_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_commissions_access_token_unique
  ON commissions(access_token)
  WHERE access_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commissions_creator ON commissions(creator_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_token   ON commissions(access_token);
CREATE INDEX IF NOT EXISTS idx_commissions_email   ON commissions(fan_email);

-- ── Commission messages (creator ↔ fan thread) ────────────────────────────────

CREATE TABLE IF NOT EXISTS commission_messages (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id  UUID        NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  sender_role    TEXT        NOT NULL CHECK(sender_role IN ('creator','fan')),
  content        TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_messages_commission ON commission_messages(commission_id, created_at);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE commissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_messages  ENABLE ROW LEVEL SECURITY;

-- Fans can insert commissions (public form)
DROP POLICY IF EXISTS "public_insert_commissions" ON commissions;
CREATE POLICY "public_insert_commissions"
  ON commissions FOR INSERT
  WITH CHECK (true);

-- Creator reads/manages their own
DROP POLICY IF EXISTS "creator_manage_commissions" ON commissions;
CREATE POLICY "creator_manage_commissions"
  ON commissions FOR ALL
  USING (creator_id = auth.uid());

-- Creator reads/adds messages on their commissions
DROP POLICY IF EXISTS "creator_manage_commission_messages" ON commission_messages;
CREATE POLICY "creator_manage_commission_messages"
  ON commission_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM commissions c
      WHERE c.id = commission_messages.commission_id
        AND c.creator_id = auth.uid()
    )
  );

-- ── Updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_commission_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commission_updated_at ON commissions;
CREATE TRIGGER trg_commission_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION update_commission_updated_at();

COMMIT;
