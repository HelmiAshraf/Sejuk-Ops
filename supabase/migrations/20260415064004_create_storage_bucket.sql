-- ============================================================
-- Create job-photos storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-photos',
  'job-photos',
  true,                          -- public bucket so getPublicUrl() works without signing
  10485760,                      -- 10 MB per file
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf',
    'video/mp4'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─── Storage RLS policies ────────────────────────────────────
-- Allow anyone to upload (anon key) — matches app's mock-auth model
CREATE POLICY "allow_upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'job-photos');

-- Allow anyone to read / download
CREATE POLICY "allow_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'job-photos');

-- Allow anyone to delete (technician can remove their own photos)
CREATE POLICY "allow_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'job-photos');
