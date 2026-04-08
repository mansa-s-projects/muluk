-- ============================================================
-- 037_bookings.sql
-- 1:1 Booking System — availability slots, bookings, payments
-- ============================================================

BEGIN;

-- ── Availability slots ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS availability (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot_date        DATE        NOT NULL,
  start_time       TIME        NOT NULL,
  duration_minutes INT         NOT NULL DEFAULT 60,
  price_cents      INT         NOT NULL DEFAULT 5000,
  meeting_link     TEXT,
  is_booked        BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(creator_id, slot_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_creator   ON availability(creator_id);
CREATE INDEX IF NOT EXISTS idx_availability_date      ON availability(slot_date);
CREATE INDEX IF NOT EXISTS idx_availability_available ON availability(creator_id, slot_date) WHERE is_booked = FALSE AND is_active = TRUE;

-- ── Bookings ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bookings (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id           UUID        NOT NULL REFERENCES availability(id) ON DELETE CASCADE,
  creator_id                UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fan_name                  TEXT        NOT NULL,
  fan_email                 TEXT        NOT NULL,
  stripe_session_id         TEXT        UNIQUE,
  stripe_payment_intent_id  TEXT,
  status                    TEXT        NOT NULL DEFAULT 'pending'
                              CHECK(status IN ('pending','paid','confirmed','cancelled','completed')),
  amount_cents              INT         NOT NULL,
  meeting_link              TEXT,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_creator        ON bookings(creator_id);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'stripe_session_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session ON bookings(stripe_session_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'availability_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_bookings_availability ON bookings(availability_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'creator_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(creator_id, status);
  END IF;
END $$;

-- ── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings     ENABLE ROW LEVEL SECURITY;

-- Availability: public reads of active, unbooked future slots
CREATE POLICY "public_read_availability"
  ON availability FOR SELECT
  USING (is_active = TRUE AND is_booked = FALSE);

-- Availability: creator manages their own slots
CREATE POLICY "creator_manage_availability"
  ON availability FOR ALL
  USING (creator_id = auth.uid());

-- Bookings: creator reads their own bookings
CREATE POLICY "creator_read_bookings"
  ON bookings FOR SELECT
  USING (creator_id = auth.uid());

-- Bookings: creator updates status (e.g. mark completed)
CREATE POLICY "creator_update_bookings"
  ON bookings FOR UPDATE
  USING (creator_id = auth.uid());

-- ── Triggers ─────────────────────────────────────────────────────────────

-- Re-use the function if it already exists from a prior migration
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'availability_updated_at'
  ) THEN
    CREATE TRIGGER availability_updated_at
      BEFORE UPDATE ON availability
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'bookings_updated_at'
  ) THEN
    CREATE TRIGGER bookings_updated_at
      BEFORE UPDATE ON bookings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

COMMIT;
