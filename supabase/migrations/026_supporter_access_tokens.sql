-- CIPHER - Token-Based Access System
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

COMMIT;
