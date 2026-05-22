-- CIPHER Platform - Migration 009: Content Management Enhancements
-- Adds features for the content management system

-- Add new columns to content_items
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS earnings DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fan_codes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create index for faster content queries
CREATE INDEX IF NOT EXISTS idx_content_items_creator_status 
  ON content_items (creator_id, status);

-- Create storage bucket for creator content
-- Note: Run in Supabase dashboard as it requires admin
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'creator-content', 
--   'creator-content', 
--   true, 
--   52428800, -- 50MB limit
--   ARRAY['image/*', 'video/*', 'audio/*']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Comments
COMMENT ON COLUMN content_items.type IS 'Content type: image, video, audio, text, link';
COMMENT ON COLUMN content_items.is_free IS 'Whether content is free to access';
COMMENT ON COLUMN content_items.thumbnail_url IS 'URL to thumbnail/preview image';
COMMENT ON COLUMN content_items.file_url IS 'URL to actual content file';
COMMENT ON COLUMN content_items.access_count IS 'Number of times content was accessed';
COMMENT ON COLUMN content_items.earnings IS 'Total earnings from this content';
COMMENT ON COLUMN content_items.fan_codes IS 'Array of fan codes with exclusive access';
