-- Voice Clone Tables Migration
-- Run this in Supabase SQL Editor to enable voice cloning features

-- Table for storing cloned voices
CREATE TABLE IF NOT EXISTS voice_clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_id TEXT NOT NULL, -- ElevenLabs voice ID
  name TEXT NOT NULL,
  description TEXT,
  samples_count INTEGER DEFAULT 0,
  category TEXT DEFAULT 'cloned',
  is_legacy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tracking voice generations (TTS)
CREATE TABLE IF NOT EXISTS voice_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_id TEXT NOT NULL,
  text TEXT NOT NULL,
  text_length INTEGER NOT NULL,
  model TEXT DEFAULT 'eleven_monolingual_v1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE voice_clones ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_clones
DROP POLICY IF EXISTS "Users can view own voice clones" ON voice_clones;
CREATE POLICY "Users can view own voice clones"
  ON voice_clones FOR SELECT
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can create own voice clones" ON voice_clones;
CREATE POLICY "Users can create own voice clones"
  ON voice_clones FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can delete own voice clones" ON voice_clones;
CREATE POLICY "Users can delete own voice clones"
  ON voice_clones FOR DELETE
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can update own voice clones" ON voice_clones;
CREATE POLICY "Users can update own voice clones"
  ON voice_clones FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- RLS Policies for voice_generations
DROP POLICY IF EXISTS "Users can view own voice generations" ON voice_generations;
CREATE POLICY "Users can view own voice generations"
  ON voice_generations FOR SELECT
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can create own voice generations" ON voice_generations;
CREATE POLICY "Users can create own voice generations"
  ON voice_generations FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_clones_creator_id ON voice_clones(creator_id);
CREATE INDEX IF NOT EXISTS idx_voice_clones_voice_id ON voice_clones(voice_id);
CREATE INDEX IF NOT EXISTS idx_voice_generations_creator_id ON voice_generations(creator_id);
CREATE INDEX IF NOT EXISTS idx_voice_generations_created_at ON voice_generations(created_at DESC);

CREATE OR REPLACE FUNCTION refresh_voice_clones_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_voice_clones_updated_at ON voice_clones;
CREATE TRIGGER trg_voice_clones_updated_at
  BEFORE UPDATE ON voice_clones
  FOR EACH ROW EXECUTE FUNCTION refresh_voice_clones_updated_at();

-- Add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'voice_clones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE voice_clones;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'voice_generations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE voice_generations;
  END IF;
END $$;

COMMENT ON TABLE voice_clones IS 'Stores AI voice clones created by creators using ElevenLabs';
COMMENT ON TABLE voice_generations IS 'Tracks text-to-speech generations for usage monitoring';
