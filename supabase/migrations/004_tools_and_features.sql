-- CIPHER Platform - Migration 004: Tools & Insane Features
-- Run this in Supabase SQL Editor

-- Enable pgcrypto for potential future DB-level encryption helpers
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Content Calendar: add scheduled_for column
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS auto_shared BOOLEAN DEFAULT false;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS share_text TEXT;

-- Creator profile: phantom mode, vault PIN, bio
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS phantom_mode BOOLEAN DEFAULT false;
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS vault_pin_hash TEXT;
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS bio TEXT;

-- Fan Messages table (Fan Message Blast tool)
CREATE TABLE IF NOT EXISTS fan_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message       TEXT NOT NULL,
  segment       TEXT NOT NULL DEFAULT 'all',
  recipient_count INT DEFAULT 0,
  sent_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE fan_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fan_messages_creator_all" ON fan_messages;
CREATE POLICY "fan_messages_creator_all" ON fan_messages
  FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Collab Proposals table (Collaboration Finder tool)
CREATE TABLE IF NOT EXISTS collab_proposals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_creator_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_handle         TEXT NOT NULL,
  split_percentage  INT DEFAULT 50 CHECK (split_percentage BETWEEN 0 AND 100),
  message           TEXT,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE collab_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collab_proposals_creator_all" ON collab_proposals;
CREATE POLICY "collab_proposals_creator_all" ON collab_proposals
  FOR ALL
  USING (
    auth.uid() = from_creator_id
    OR EXISTS (
      SELECT 1
      FROM creator_applications ca
      WHERE ca.user_id = auth.uid()
        AND lower(regexp_replace(coalesce(ca.handle, ''), '^@', '')) = lower(regexp_replace(coalesce(collab_proposals.to_handle, ''), '^@', ''))
    )
  )
  WITH CHECK (
    auth.uid() = from_creator_id
    OR EXISTS (
      SELECT 1
      FROM creator_applications ca
      WHERE ca.user_id = auth.uid()
        AND lower(regexp_replace(coalesce(ca.handle, ''), '^@', '')) = lower(regexp_replace(coalesce(collab_proposals.to_handle, ''), '^@', ''))
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fan_messages_creator ON fan_messages(creator_id);
CREATE INDEX IF NOT EXISTS idx_collab_proposals_from ON collab_proposals(from_creator_id);
CREATE INDEX IF NOT EXISTS idx_content_items_scheduled ON content_items(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Social connections table
CREATE TABLE IF NOT EXISTS social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_username TEXT,
  platform_user_id TEXT,
  -- access_token and refresh_token store AES-256-GCM encrypted ciphertext (hex).
  -- Application code must encrypt before insert and decrypt after select.
  -- See TOKEN_ENCRYPTION_KEY env var and encryptToken/decryptToken helpers.
  access_token TEXT,
  refresh_token TEXT,
  follower_count BIGINT DEFAULT 0,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, platform)
);

ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "social_connections_all" ON social_connections;
CREATE POLICY "social_connections_all" ON social_connections
  FOR ALL USING (auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS idx_social_connections_creator ON social_connections(creator_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_platform ON social_connections(platform);
