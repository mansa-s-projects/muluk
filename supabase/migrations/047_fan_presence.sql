-- 047_fan_presence.sql
-- Add last_seen_at to fan_codes_v2 for online/offline fan presence tracking in admin
ALTER TABLE fan_codes_v2 ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_fan_codes_v2_last_seen_at ON fan_codes_v2(last_seen_at DESC NULLS LAST);
