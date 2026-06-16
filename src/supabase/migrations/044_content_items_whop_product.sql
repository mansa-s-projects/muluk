-- Add Whop product linkage to generic content monetization table
ALTER TABLE IF EXISTS content_items_v2
  ADD COLUMN IF NOT EXISTS whop_product_id TEXT;

CREATE INDEX IF NOT EXISTS idx_content_items_v2_whop_product
  ON content_items_v2 (whop_product_id)
  WHERE whop_product_id IS NOT NULL;
