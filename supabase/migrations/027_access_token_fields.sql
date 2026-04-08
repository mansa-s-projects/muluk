-- CIPHER — Access Token + Payment Link Enhancements
-- Migration 027

BEGIN;

-- Add access_type to payment_links
-- 'permanent' = token valid until expires_at (default behaviour)
-- 'burn_once' = token invalidated after the first successful view
ALTER TABLE payment_links
  ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'permanent'
    CHECK (access_type IN ('permanent', 'burn_once'));

-- Add used_at to access_tokens so burn_once tokens can be atomically marked spent
ALTER TABLE access_tokens
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- Fast poll: find recent paid purchases for a given payment link
CREATE INDEX IF NOT EXISTS idx_purchases_pl_created
  ON purchases (payment_link_id, created_at DESC)
  WHERE status = 'paid';

-- Fast lookup of unused tokens by purchase set
CREATE INDEX IF NOT EXISTS idx_access_tokens_unused
  ON access_tokens (purchase_id, created_at DESC)
  WHERE used_at IS NULL;

COMMIT;
