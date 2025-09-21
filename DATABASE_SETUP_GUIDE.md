# Database Setup Guide

## 🚨 Database Setup Required

If you're seeing errors like :
- `relation "public.photos" does not exist`
- `Could not find the function public.get_gallery_subfolders`

This means your Supabase database needs to be set up with the required tables and functions.

## 📋 Quick Setup Steps

### 1. **Open Supabase SQL Editor**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New Query"**

### 2. **Execute the Setup Script**
1. Copy the entire contents of `/SUPABASE_FOLDERS_UPDATE.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** to execute all commands

### 3. **Verify Setup**
After running the script, you should see:
```
✅ Tables created: galleries, photos, favorites, comments
✅ Functions created: get_gallery_subfolders, update_updated_at_column
✅ Indexes created for performance
✅ Row Level Security policies set
```

## 🏗️ What Gets Created

### **Tables:**
- **`galleries`** - Main gallery metadata
- **`photos`** - Photo records with subfolder support
- **`favorites`** - User favorites across devices  
- **`comments`** - User comments on photos

### **Functions:**
- **`get_gallery_subfolders()`** - Returns subfolders and photo counts
- **`update_updated_at_column()`** - Auto-updates timestamps

### **Features Enabled:**
- ✅ **Subfolder organization** - Group photos by categories
- ✅ **Multi-device sync** - Favorites/comments sync across devices
- ✅ **Performance optimized** - Proper indexes for fast queries
- ✅ **Secure access** - Row Level Security policies

## 🔧 Alternative Setup (Manual)

If you prefer to run commands one by one:

```sql
-- 1. Create galleries table
CREATE TABLE IF NOT EXISTS public.galleries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT TRUE,
  password TEXT,
  bucket_folder TEXT,
  bucket_name TEXT DEFAULT 'photos',
  photo_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  allow_comments BOOLEAN DEFAULT TRUE,
  allow_favorites BOOLEAN DEFAULT TRUE
);

-- 2. Create photos table
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  subfolder TEXT DEFAULT NULL,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
);

-- 3. Create subfolder function
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
```

## 🐛 Troubleshooting

### **Error: "permission denied for table"**
```sql
GRANT ALL ON public.galleries TO anon, authenticated;
GRANT ALL ON public.photos TO anon, authenticated;
```

### **Error: "function does not exist"**
```sql
GRANT EXECUTE ON FUNCTION get_gallery_subfolders(TEXT) TO anon, authenticated;
```

### **Error: "RLS policy"**
```sql
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON public.galleries FOR ALL USING (true);
```

## ✅ Testing Your Setup

After setup, test with:
```sql
-- Test basic functionality
SELECT 'Database setup successful!' as status;

-- Test function
SELECT * FROM get_gallery_subfolders('test-gallery-id');

-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('galleries', 'photos', 'favorites', 'comments');
```

## 🎯 Next Steps

Once database is set up:
1. **Refresh your app** - The errors should disappear
2. **Create a gallery** - Test the admin panel
3. **Upload photos** - Try subfolder organization
4. **Test sync** - Check favorites across devices

## 💡 Pro Tips

- **Backup first** - Always backup before running SQL scripts
- **Check logs** - Monitor Supabase logs for any issues  
- **Start small** - Test with a few photos first
- **Use subfolders** - Organize by event, date, or category

Need help? Check the [Supabase documentation](https://supabase.com/docs) or reach out for support! 🚀
