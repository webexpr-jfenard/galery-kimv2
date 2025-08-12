-- Complete Supabase setup for photo galleries with subfolder support
-- Execute these commands in your Supabase SQL Editor

-- 1. Create galleries table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.galleries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  password TEXT,
  bucket_folder TEXT,
  bucket_name TEXT DEFAULT 'photos',
  photo_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  allow_comments BOOLEAN DEFAULT TRUE,
  allow_favorites BOOLEAN DEFAULT TRUE
);

-- 2. Create photos table with subfolder support
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  subfolder TEXT DEFAULT NULL,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
);

-- 3. Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(gallery_id, photo_id, device_id)
);

-- 4. Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photos_gallery_id ON public.photos(gallery_id);
CREATE INDEX IF NOT EXISTS idx_photos_gallery_subfolder ON public.photos(gallery_id, subfolder);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON public.photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_gallery_id ON public.favorites(gallery_id);
CREATE INDEX IF NOT EXISTS idx_favorites_photo_id ON public.favorites(photo_id);
CREATE INDEX IF NOT EXISTS idx_comments_gallery_id ON public.comments(gallery_id);
CREATE INDEX IF NOT EXISTS idx_comments_photo_id ON public.comments(photo_id);

-- 6. Create function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_galleries_updated_at ON public.galleries;
CREATE TRIGGER update_galleries_updated_at
  BEFORE UPDATE ON public.galleries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_photos_updated_at ON public.photos;
CREATE TRIGGER update_photos_updated_at
  BEFORE UPDATE ON public.photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_favorites_updated_at ON public.favorites;
CREATE TRIGGER update_favorites_updated_at
  BEFORE UPDATE ON public.favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Create function to get gallery subfolders
CREATE OR REPLACE FUNCTION get_gallery_subfolders(gallery_id_param TEXT)
RETURNS TABLE(subfolder TEXT, photo_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.subfolder::TEXT,
    COUNT(*)::BIGINT as photo_count
  FROM public.photos p 
  WHERE p.gallery_id = gallery_id_param 
    AND p.subfolder IS NOT NULL 
    AND p.subfolder != ''
  GROUP BY p.subfolder
  ORDER BY p.subfolder;
END;
$$ LANGUAGE plpgsql;

-- 9. Create views for statistics
CREATE OR REPLACE VIEW gallery_subfolders_stats AS
SELECT 
  gallery_id,
  subfolder,
  COUNT(*) as photo_count,
  MIN(created_at) as first_photo_date,
  MAX(created_at) as last_photo_date
FROM public.photos 
WHERE subfolder IS NOT NULL AND subfolder != ''
GROUP BY gallery_id, subfolder
ORDER BY gallery_id, subfolder;

-- 10. Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 11. Create permissive policies (allow all operations for now)
-- You can make these more restrictive based on your needs

DROP POLICY IF EXISTS "Allow all operations on galleries" ON public.galleries;
CREATE POLICY "Allow all operations on galleries" ON public.galleries
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on photos" ON public.photos;
CREATE POLICY "Allow all operations on photos" ON public.photos
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on favorites" ON public.favorites;
CREATE POLICY "Allow all operations on favorites" ON public.favorites
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on comments" ON public.comments;
CREATE POLICY "Allow all operations on comments" ON public.comments
FOR ALL USING (true) WITH CHECK (true);

-- 12. Grant necessary permissions
GRANT ALL ON public.galleries TO anon, authenticated;
GRANT ALL ON public.photos TO anon, authenticated;
GRANT ALL ON public.favorites TO anon, authenticated;
GRANT ALL ON public.comments TO anon, authenticated;

GRANT EXECUTE ON FUNCTION get_gallery_subfolders(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO anon, authenticated;

-- 13. Test queries (uncomment to test after setup)
-- SELECT 'Setup completed successfully' as status;
-- SELECT * FROM get_gallery_subfolders('test-gallery-id');

-- 14. Sample data insert (uncomment if you want to test)
/*
INSERT INTO public.galleries (id, name, description) VALUES 
('test-gallery', 'Test Gallery', 'A test gallery for development');

INSERT INTO public.photos (gallery_id, name, url, subfolder) VALUES 
('test-gallery', 'test1.jpg', 'https://example.com/test1.jpg', 'wedding'),
('test-gallery', 'test2.jpg', 'https://example.com/test2.jpg', 'wedding'),
('test-gallery', 'test3.jpg', 'https://example.com/test3.jpg', 'reception');

SELECT * FROM get_gallery_subfolders('test-gallery');
*/

COMMENT ON TABLE public.galleries IS 'Main galleries table storing gallery metadata';
COMMENT ON TABLE public.photos IS 'Photos table with subfolder support for organization';
COMMENT ON TABLE public.favorites IS 'User favorites across devices';
COMMENT ON TABLE public.comments IS 'User comments on photos';
COMMENT ON FUNCTION get_gallery_subfolders IS 'Function to get subfolders and photo counts for a gallery';