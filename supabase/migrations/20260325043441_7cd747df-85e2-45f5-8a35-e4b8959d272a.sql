INSERT INTO storage.buckets (id, name, public) VALUES ('instagram-media', 'instagram-media', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'instagram-media');

CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'instagram-media');