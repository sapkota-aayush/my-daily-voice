-- Create storage bucket for selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to selfies
CREATE POLICY "Public read access for selfies"
ON storage.objects FOR SELECT
USING (bucket_id = 'selfies');

-- Allow public insert/update for selfies (single-user prototype)
CREATE POLICY "Public insert access for selfies"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'selfies');

CREATE POLICY "Public update access for selfies"
ON storage.objects FOR UPDATE
USING (bucket_id = 'selfies');

