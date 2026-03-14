-- =============================================
-- MIGRATION: add_user_columns
-- =============================================
-- Run this against an existing database to add user tracking columns,
-- missing gallery columns, and updated indexes/constraints.

-- Add user tracking columns to favorites
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Add user tracking columns to comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Add missing gallery columns
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS featured_photo_url TEXT;
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS featured_photo_id TEXT;

-- Add indexes for user filtering
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_gallery_user ON favorites(gallery_id, user_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_gallery_user ON comments(gallery_id, user_id);

-- Update unique constraint to support multi-user (same photo, different users)
-- First drop old constraint if it exists
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_gallery_id_photo_id_device_id_key;
-- Add new constraint based on user_id
ALTER TABLE favorites ADD CONSTRAINT favorites_gallery_id_photo_id_user_id_key UNIQUE(gallery_id, photo_id, user_id);
