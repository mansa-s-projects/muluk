-- CIPHER — Purchases Enhancement + Unlocked Content + Supporter Accounts
-- Migration 025

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add buyer_id to purchases table
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchases_buyer_id ON purchases (buyer_id)
  WHERE buyer_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. unlocked_content — stores actual content revealed after purchase
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS unlocked_content (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id       UUID        NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  content_type      TEXT        NOT NULL
                    CHECK (content_type IN ('text', 'file', 'url')),
  file_url          TEXT,                    -- for 'file' type content
  text_content      TEXT,                    -- for 'text' type content
  url               TEXT,                    -- for 'url' type content
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE unlocked_content
  ADD COLUMN IF NOT EXISTS url TEXT;

ALTER TABLE unlocked_content
  DROP CONSTRAINT IF EXISTS unlocked_content_payload_consistency_check;

ALTER TABLE unlocked_content
  ADD CONSTRAINT unlocked_content_payload_consistency_check
  CHECK (
    (content_type = 'file' AND file_url IS NOT NULL AND text_content IS NULL AND url IS NULL)
    OR
    (content_type = 'text' AND text_content IS NOT NULL AND file_url IS NULL AND url IS NULL)
    OR
    (content_type = 'url' AND url IS NOT NULL AND file_url IS NULL AND text_content IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_unlocked_content_purchase ON unlocked_content (purchase_id);

ALTER TABLE unlocked_content ENABLE ROW LEVEL SECURITY;

-- Service role can manage unlocked content (for API inserts during webhook processing)
DROP POLICY IF EXISTS "service_role_unlocked_content_all" ON unlocked_content;
CREATE POLICY "service_role_unlocked_content_all" ON unlocked_content
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
