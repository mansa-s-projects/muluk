-- CIPHER Platform - Migration 013: Fan messages security hardening
-- Tighten fan_messages policies to prevent broad anonymous reads/writes.

ALTER TABLE fan_messages ENABLE ROW LEVEL SECURITY;

-- Remove legacy broad policies.
DROP POLICY IF EXISTS "Fans can view messages by code" ON fan_messages;
DROP POLICY IF EXISTS "Anyone can send fan messages" ON fan_messages;
DROP POLICY IF EXISTS "Creators can view their fan messages" ON fan_messages;
DROP POLICY IF EXISTS "Creators can send messages" ON fan_messages;

-- Creator read scope stays strict.
CREATE POLICY "Creators can view their fan messages"
  ON fan_messages FOR SELECT
  USING (creator_id = auth.uid());

-- Creator can send messages only as themselves.
CREATE POLICY "Creators can send messages"
  ON fan_messages FOR INSERT
  WITH CHECK (creator_id = auth.uid() AND from_creator = true);

-- Anonymous/authenticated fans can send only to valid creator/fan-code mapping.
CREATE POLICY "Fans can send validated messages"
  ON fan_messages FOR INSERT
  WITH CHECK (
    from_creator = false
    AND creator_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM fan_codes fc
      WHERE fc.code = fan_code
        AND fc.creator_id = creator_id
    )
  );
