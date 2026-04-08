-- CIPHER - Fan Token-Based Access System
-- Migration 026

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. access_tokens - token-based access to purchased content
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS access_tokens (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id       UUID        NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  token             TEXT        NOT NULL UNIQUE,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON access_tokens (token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_purchase ON access_tokens (purchase_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires ON access_tokens (expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

-- Service role can manage tokens
CREATE POLICY "service_role_access_tokens" ON access_tokens
  USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Extend fan_accounts with device/session tracking (optional)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE fan_accounts
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

COMMENT ON COLUMN fan_accounts.device_fingerprint IS
  'Optional anti-abuse identifier. Store only a one-way hash in application code. Suggested retention: <= 90 days.';

COMMIT;
