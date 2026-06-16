-- Migration 011: supporter messaging removed

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
