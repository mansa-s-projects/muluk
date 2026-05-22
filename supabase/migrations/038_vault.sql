-- ============================================================
-- 038_vault.sql
-- Watermark Preview Vault — locked premium content with blurred previews
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Vault items (uploaded content) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vault_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  description      TEXT,
  price_cents      INT         NOT NULL DEFAULT 500 CHECK(price_cents >= 50),
  content_type     TEXT        NOT NULL DEFAULT 'image'
                     CHECK(content_type IN ('image', 'video')),
  -- Supabase Storage paths
  file_path        TEXT        NOT NULL,           -- private bucket: vault-originals
  preview_path     TEXT        NOT NULL,           -- public bucket: vault-previews
  file_size_bytes  BIGINT,
  mime_type        TEXT,
  -- Whop payment fields (set on first checkout attempt)
  whop_product_id  TEXT,
  -- Publishing state
  status           TEXT        NOT NULL DEFAULT 'active'
                     CHECK(status IN ('active', 'draft', 'deleted')),
  purchase_count   INT         NOT NULL DEFAULT 0,
  sort_order       INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_items_creator ON vault_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_active  ON vault_items(creator_id, status, sort_order)
  WHERE status = 'active';

-- ── Vault purchases (fan unlocks) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vault_purchases (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id    UUID        NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
  creator_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Unique per-purchase access token returned to fan
  access_token     TEXT        UNIQUE NOT NULL
                     DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  buyer_email      TEXT,
  whop_payment_id  TEXT        UNIQUE,
  whop_checkout_id TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK(status IN ('pending', 'paid', 'refunded')),
  amount_cents     INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at          TIMESTAMPTZ
);

COMMENT ON COLUMN vault_purchases.buyer_email IS 'PII: buyer email address. Apply strict access controls and retention/deletion policies.';

CREATE OR REPLACE FUNCTION enforce_vault_purchase_creator_match()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  item_creator_id UUID;
BEGIN
  SELECT creator_id INTO item_creator_id
  FROM vault_items
  WHERE id = NEW.vault_item_id;

  IF item_creator_id IS NULL THEN
    RAISE EXCEPTION 'vault item % not found', NEW.vault_item_id;
  END IF;

  IF NEW.creator_id IS DISTINCT FROM item_creator_id THEN
    RAISE EXCEPTION 'creator_id must match vault_items.creator_id for vault_item_id %', NEW.vault_item_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_vault_purchase_creator_match ON vault_purchases;
CREATE TRIGGER trg_enforce_vault_purchase_creator_match
  BEFORE INSERT OR UPDATE ON vault_purchases
  FOR EACH ROW EXECUTE FUNCTION enforce_vault_purchase_creator_match();

CREATE INDEX IF NOT EXISTS idx_vault_purchases_item   ON vault_purchases(vault_item_id);
CREATE INDEX IF NOT EXISTS idx_vault_purchases_token  ON vault_purchases(access_token);
CREATE INDEX IF NOT EXISTS idx_vault_purchases_whop   ON vault_purchases(whop_payment_id)
  WHERE whop_payment_id IS NOT NULL;

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE vault_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_purchases ENABLE ROW LEVEL SECURITY;

-- vault_items: anyone can read active items (for public fan grid)
DROP POLICY IF EXISTS "public_read_vault_items" ON vault_items;
CREATE POLICY "public_read_vault_items"
  ON vault_items FOR SELECT
  USING (status = 'active');

-- vault_items: creator manages their own items
DROP POLICY IF EXISTS "creator_manage_vault_items" ON vault_items;
CREATE POLICY "creator_manage_vault_items"
  ON vault_items FOR ALL
  USING (creator_id = auth.uid());

-- vault_purchases: creator reads their own purchases
DROP POLICY IF EXISTS "creator_read_vault_purchases" ON vault_purchases;
CREATE POLICY "creator_read_vault_purchases"
  ON vault_purchases FOR SELECT
  USING (creator_id = auth.uid());

-- vault_purchases: service role (webhook) can upsert
-- (no policy needed — service role bypasses RLS)

-- ── Auto-update updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_vault_item_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vault_items_updated_at ON vault_items;
CREATE TRIGGER trg_vault_items_updated_at
  BEFORE UPDATE ON vault_items
  FOR EACH ROW EXECUTE FUNCTION update_vault_item_updated_at();

-- ── Atomic purchase_count increment ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_vault_purchase_count(item_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE vault_items SET purchase_count = purchase_count + 1 WHERE id = item_id;
END;
$$;

COMMIT;
