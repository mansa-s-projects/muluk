-- Stripe-based one-click payment links

BEGIN;

ALTER TABLE payment_links
  ADD COLUMN IF NOT EXISTS file_url TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_links'
      AND column_name = 'whop_checkout_url'
  ) THEN
    ALTER TABLE payment_links DROP COLUMN whop_checkout_url;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_links'
      AND column_name = 'cover_image_url'
  ) THEN
    ALTER TABLE payment_links DROP COLUMN cover_image_url;
  END IF;
END $$;

-- Sanitize any rows with invalid or NULL content_type before adding the CHECK constraint
UPDATE payment_links
  SET content_type = 'text'
  WHERE content_type NOT IN ('text', 'file') OR content_type IS NULL;

ALTER TABLE payment_links
  DROP CONSTRAINT IF EXISTS payment_links_content_type_check;

ALTER TABLE payment_links
  ADD CONSTRAINT payment_links_content_type_check
  CHECK (content_type IN ('text', 'file'));

ALTER TABLE payment_links
  ALTER COLUMN content_type SET DEFAULT 'text';

ALTER TABLE payment_links
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE payment_link_accesses
  ADD COLUMN IF NOT EXISTS checkout_session_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_link_accesses_checkout_session
  ON payment_link_accesses (checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;

COMMIT;
