-- =============================================
-- ADD CATEGORY FIELD TO GALLERIES TABLE
-- =============================================
-- This SQL script adds a category field to organize galleries by client
-- Execute this in your Supabase SQL Editor

-- 1. Add category column to galleries table
ALTER TABLE galleries
ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Create index for better performance when filtering by category
CREATE INDEX IF NOT EXISTS idx_galleries_category ON galleries(category);

-- 3. Update the galleries table with a comment
COMMENT ON COLUMN galleries.category IS 'Client name or category to organize galleries';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Category field added successfully!';
    RAISE NOTICE '📋 You can now assign categories (client names) to your galleries';
    RAISE NOTICE '🔍 An index has been created for efficient category filtering';
END $$;
