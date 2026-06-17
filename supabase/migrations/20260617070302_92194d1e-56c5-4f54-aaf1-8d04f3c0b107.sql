
CREATE POLICY "Episodes audio public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'episodes');
