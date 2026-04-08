-- CIPHER — access token hash rollout
-- Migration 030

BEGIN;

ALTER TABLE access_tokens
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

-- Backfill hashes for existing rows so legacy tokens remain valid after code switch.
UPDATE access_tokens
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL
  AND token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_access_tokens_token_hash
  ON access_tokens (token_hash)
  WHERE token_hash IS NOT NULL;

-- New writes use token_hash only.
ALTER TABLE access_tokens
  ALTER COLUMN token DROP NOT NULL;

COMMENT ON COLUMN access_tokens.token IS
  'Deprecated legacy raw token column. New writes use token_hash only.';

COMMENT ON COLUMN access_tokens.token_hash IS
  'SHA-256 hash of access token; used for token lookup/validation.';

COMMIT;
