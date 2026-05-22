-- ============================================================
-- 045_bookings_unique_slot_constraint.sql
-- Prevent double-booking race condition on availability slots:
-- at most one active (pending or confirmed) booking per slot.
-- ============================================================

BEGIN;

-- Ensure availability_id column exists (may be absent if 037 was applied from an older version)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS availability_id UUID REFERENCES availability(id);

-- Partial unique index: at most one active booking per slot (prevents double-booking race condition)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_one_active_per_slot
  ON bookings(availability_id)
  WHERE status IN ('pending', 'confirmed');

COMMIT;
