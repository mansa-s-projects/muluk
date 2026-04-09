-- ============================================================
-- 042_series_drops.sql
-- Series Drop — creators publish multi-episode content;
-- fans purchase one-time access via Whop and read everything.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Series (creator-owned) ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS series (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  description      TEXT,
  cover_url        TEXT,
  price_cents      INT         NOT NULL DEFAULT 0 CHECK(price_cents >= 0),
  status           TEXT        NOT NULL DEFAULT 'draft'
                     CHECK(status IN ('draft','published','archived')),
  -- Whop — one plan per series, reused across all fan purchases
  whop_product_id  TEXT,
  whop_plan_id     TEXT,
  episode_count    INT         NOT NULL DEFAULT 0,
  total_sales      INT         NOT NULL DEFAULT 0,   -- paid purchase count (denorm)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_series_creator    ON series(creator_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_series_published  ON series(status, created_at DESC)
  WHERE status = 'published';

-- ── Episodes ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS series_episodes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id    UUID        NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  creator_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  body         TEXT,                          -- markdown / rich text content
  media_url    TEXT,                          -- optional video / image URL
  sort_order   INT         NOT NULL DEFAULT 0,
  is_preview   BOOLEAN     NOT NULL DEFAULT false, -- visible without purchase
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward compatibility for legacy series_episodes schema.
ALTER TABLE series_episodes
  ADD COLUMN IF NOT EXISTS sort_order INT,
  ADD COLUMN IF NOT EXISTS is_preview BOOLEAN,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE series_episodes
SET sort_order = 0
WHERE sort_order IS NULL;

UPDATE series_episodes
SET is_preview = false
WHERE is_preview IS NULL;

UPDATE series_episodes
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE series_episodes
  ALTER COLUMN sort_order SET DEFAULT 0,
  ALTER COLUMN is_preview SET DEFAULT false,
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE series_episodes
  ALTER COLUMN sort_order SET NOT NULL,
  ALTER COLUMN is_preview SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'series_episodes'
      AND column_name = 'sort_order'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_episodes_series ON series_episodes(series_id, sort_order ASC);
  ELSE
    CREATE INDEX IF NOT EXISTS idx_episodes_series ON series_episodes(series_id, created_at ASC);
  END IF;
END $$;

-- ── Episode count trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_series_episode_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE series
  SET episode_count = (
    SELECT COUNT(*) FROM series_episodes WHERE series_id = COALESCE(NEW.series_id, OLD.series_id)
  ), updated_at = NOW()
  WHERE id = COALESCE(NEW.series_id, OLD.series_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_episode_count ON series_episodes;
CREATE TRIGGER trg_sync_episode_count
  AFTER INSERT OR DELETE ON series_episodes
  FOR EACH ROW EXECUTE FUNCTION sync_series_episode_count();

-- ── Fan purchases ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS series_purchases (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id        UUID        NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  creator_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fan_email        TEXT,
  fan_name         TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK(status IN ('pending','paid','refunded')),
  whop_payment_id  TEXT        UNIQUE,
  access_token     TEXT        UNIQUE NOT NULL
                     DEFAULT encode(gen_random_bytes(24), 'hex'),
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE series_purchases
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE series_purchases
SET access_token = encode(gen_random_bytes(24), 'hex')
WHERE access_token IS NULL;

UPDATE series_purchases
SET status = 'paid'
WHERE status IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_series_purchases_access_token_unique
  ON series_purchases(access_token)
  WHERE access_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_series_purchases_series  ON series_purchases(series_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_series_purchases_token   ON series_purchases(access_token);
CREATE INDEX IF NOT EXISTS idx_series_purchases_creator ON series_purchases(creator_id);

-- total_sales counter
CREATE OR REPLACE FUNCTION sync_series_total_sales()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    UPDATE series SET total_sales = total_sales + 1, updated_at = NOW()
    WHERE id = NEW.series_id;
  END IF;
  IF NEW.status = 'refunded' AND OLD.status = 'paid' THEN
    UPDATE series SET total_sales = GREATEST(total_sales - 1, 0), updated_at = NOW()
    WHERE id = NEW.series_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_series_sales ON series_purchases;
CREATE TRIGGER trg_sync_series_sales
  AFTER INSERT OR UPDATE ON series_purchases
  FOR EACH ROW EXECUTE FUNCTION sync_series_total_sales();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE series          ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_purchases ENABLE ROW LEVEL SECURITY;

-- series: public can read published; creator manages all their own
DROP POLICY IF EXISTS "public_read_published_series" ON series;
CREATE POLICY "public_read_published_series"
  ON series FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "creator_manage_series" ON series;
CREATE POLICY "creator_manage_series"
  ON series FOR ALL
  USING (creator_id = auth.uid());

-- series_episodes: public read (API enforces purchase gate); creator manages
DROP POLICY IF EXISTS "public_read_episodes" ON series_episodes;
CREATE POLICY "public_read_episodes"
  ON series_episodes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "creator_manage_episodes" ON series_episodes;
CREATE POLICY "creator_manage_episodes"
  ON series_episodes FOR ALL
  USING (creator_id = auth.uid());

-- series_purchases: fan inserts; creator reads all; no public read of purchases
DROP POLICY IF EXISTS "public_insert_purchases" ON series_purchases;
CREATE POLICY "public_insert_purchases"
  ON series_purchases FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "creator_read_purchases" ON series_purchases;
CREATE POLICY "creator_read_purchases"
  ON series_purchases FOR ALL
  USING (creator_id = auth.uid());

-- ── Monthly revenue helper ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_series_monthly_revenue(p_creator_id UUID, p_year INT)
RETURNS TABLE(month INT, total_cents BIGINT, purchase_count BIGINT)
LANGUAGE plpgsql AS $$
DECLARE
  start_of_year DATE := make_date(p_year, 1, 1);
  start_of_next_year DATE := make_date(p_year + 1, 1, 1);
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(MONTH FROM sp.paid_at)::INT  AS month,
    COALESCE(SUM(s.price_cents), 0)      AS total_cents,
    COUNT(*)                             AS purchase_count
  FROM series_purchases sp
  JOIN series s ON s.id = sp.series_id
  WHERE sp.creator_id = p_creator_id
    AND sp.status = 'paid'
    AND sp.paid_at >= start_of_year
    AND sp.paid_at < start_of_next_year
  GROUP BY 1
  ORDER BY 1;
END;
$$;

COMMIT;
