-- Fan Messaging & File Uploads
-- Created: 2024

-- Fan messages table
CREATE TABLE IF NOT EXISTS fan_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fan_code TEXT NOT NULL,
  content TEXT NOT NULL,
  from_creator BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Backward-compat: migration 004 created fan_messages with different columns.
ALTER TABLE fan_messages
  ADD COLUMN IF NOT EXISTS fan_code TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS from_creator BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Enable RLS
ALTER TABLE fan_messages ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Creators can view their fan messages" ON fan_messages;
CREATE POLICY "Creators can view their fan messages"
  ON fan_messages FOR SELECT
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Fans can view messages by code" ON fan_messages;
CREATE POLICY "Fans can view messages by code"
  ON fan_messages FOR SELECT
  USING (true); -- Fan access controlled by fan_code in query

DROP POLICY IF EXISTS "Creators can send messages" ON fan_messages;
CREATE POLICY "Creators can send messages"
  ON fan_messages FOR INSERT
  WITH CHECK (creator_id = auth.uid() AND from_creator = true);

DROP POLICY IF EXISTS "Anyone can send fan messages" ON fan_messages;
CREATE POLICY "Anyone can send fan messages"
  ON fan_messages FOR INSERT
  WITH CHECK (from_creator = false);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fan_messages_creator ON fan_messages(creator_id);
CREATE INDEX IF NOT EXISTS idx_fan_messages_code ON fan_messages(fan_code);
CREATE INDEX IF NOT EXISTS idx_fan_messages_created ON fan_messages(created_at DESC);

-- Storage bucket for creator content
INSERT INTO storage.buckets (id, name, public)
VALUES ('creator-content', 'creator-content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Creators can upload their content" ON storage.objects;
CREATE POLICY "Creators can upload their content"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'creator-content' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can view content" ON storage.objects;
CREATE POLICY "Anyone can view content"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'creator-content');

-- Add fan_code to notifications
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN
    ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS fan_code TEXT;
  END IF;
END $$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_creator_id UUID, p_fan_code TEXT)
RETURNS void AS $$
BEGIN
  UPDATE fan_messages
  SET read_at = now()
  WHERE creator_id = p_creator_id
    AND fan_code = p_fan_code
    AND from_creator = false
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql;
