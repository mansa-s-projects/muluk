-- Migration 053: Backfill referral codes for all existing creators
-- Ensures every creator in creator_applications has a unique referral code.
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING).

INSERT INTO creator_referral_codes (creator_id, referral_code)
SELECT
  ca.user_id,
  lower(
    -- Build a collision-safe code: sanitised handle/referral_handle + 6 hex chars from user_id
    CASE
      WHEN length(regexp_replace(COALESCE(ca.referral_handle, ''), '[^a-zA-Z0-9_-]', '', 'g')) >= 3
        THEN substring(regexp_replace(COALESCE(ca.referral_handle, ''), '[^a-zA-Z0-9_-]', '', 'g'), 1, 18)
             || '-' || substring(replace(ca.user_id::text, '-', ''), 1, 6)
      WHEN length(regexp_replace(COALESCE(ca.handle, ''), '[^a-zA-Z0-9_-]', '', 'g')) >= 3
        THEN substring(regexp_replace(COALESCE(ca.handle, ''), '[^a-zA-Z0-9_-]', '', 'g'), 1, 18)
             || '-' || substring(replace(ca.user_id::text, '-', ''), 1, 6)
      ELSE 'creator-' || substring(replace(ca.user_id::text, '-', ''), 1, 10)
    END
  )
FROM creator_applications ca
WHERE ca.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM creator_referral_codes crc WHERE crc.creator_id = ca.user_id
  )
ON CONFLICT (creator_id) DO NOTHING;

-- Also deduplicate any code collisions that snuck in from migration 049
-- by appending more user_id bytes to any duplicate codes.
WITH dupes AS (
  SELECT referral_code
  FROM creator_referral_codes
  GROUP BY referral_code
  HAVING count(*) > 1
)
UPDATE creator_referral_codes crc
SET referral_code = crc.referral_code || '-' || substring(replace(crc.creator_id::text, '-', ''), 7, 4)
FROM dupes d
WHERE crc.referral_code = d.referral_code;
