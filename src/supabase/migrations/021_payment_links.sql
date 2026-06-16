-- ─────────────────────────────────────────────────────────────────────────────
-- 021_payment_links.sql
-- Payment Links: creators generate a shareable /pay/[id] URL that unlocks
-- content only after a confirmed purchase.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── payment_links ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_links (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  description       TEXT,
  price             INTEGER     NOT NULL CHECK (price >= 50),          -- cents, min $0.50
  content_type      TEXT        NOT NULL DEFAULT 'text'
                                CHECK (content_type IN ('text', 'url', 'file')),
  content_value     TEXT,                                              -- revealed after access grant
  cover_image_url   TEXT,
  whop_checkout_url TEXT,                                              -- creator's Whop product checkout URL
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  view_count        INTEGER     NOT NULL DEFAULT 0,
  purchase_count    INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── payment_link_accesses ─────────────────────────────────────────────────────
-- One row per granted unlock. access_token is given to the buyer after payment.
CREATE TABLE IF NOT EXISTS payment_link_accesses (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_link_id  UUID        NOT NULL REFERENCES payment_links(id) ON DELETE CASCADE,
  access_token     TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  buyer_email      TEXT,
  transaction_ref  TEXT,       -- Whop payment id for audit trail
  granted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_links_creator
  ON payment_links (creator_id);

CREATE INDEX IF NOT EXISTS idx_payment_links_active
  ON payment_links (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_payment_link_accesses_token
  ON payment_link_accesses (access_token);

CREATE INDEX IF NOT EXISTS idx_payment_link_accesses_link
  ON payment_link_accesses (payment_link_id);

-- ── Row-level security ────────────────────────────────────────────────────────
ALTER TABLE payment_links            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_link_accesses    ENABLE ROW LEVEL SECURITY;

-- Creators fully manage their own links
CREATE POLICY "creator_own_payment_links"
  ON payment_links FOR ALL
  USING  (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Anyone (anon + authenticated) can read active links; content_value is
-- intentionally excluded in the public API layer — never returned without a
-- valid access_token.
CREATE POLICY "public_read_active_payment_links"
  ON payment_links FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Creators can read accesses for links they own (for dashboard stats)
CREATE POLICY "creator_read_own_accesses"
  ON payment_link_accesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payment_links pl
      WHERE pl.id = payment_link_id
        AND pl.creator_id = auth.uid()
    )
  );

-- Service role bypasses RLS — webhook handler inserts accesses server-side.
