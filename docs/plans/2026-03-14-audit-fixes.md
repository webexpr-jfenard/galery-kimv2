# Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical, high, and medium issues identified in the full audit of admin auth, gallery sharing, favorites/comments, and email systems.

**Architecture:** Direct fixes to existing services and components. Database migration via SQL. No new abstractions needed.

**Tech Stack:** TypeScript, React, Supabase, Vercel serverless functions

---

### Task 1: Database Schema — Add missing user columns

**Files:**
- Create: `supabase/migrations/add_user_columns.sql`
- Modify: `SUPABASE_TABLE_SETUP.sql`

**Step 1: Create migration SQL**
```sql
-- Add user_id and user_name to favorites
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Add user_id and user_name to comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_gallery_user ON favorites(gallery_id, user_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_gallery_user ON comments(gallery_id, user_id);

-- Add category column to galleries if missing
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS featured_photo_url TEXT;
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS featured_photo_id TEXT;
```

**Step 2: Update SUPABASE_TABLE_SETUP.sql** to include user_id/user_name in CREATE TABLE statements.

**Step 3: Run migration against live Supabase**

**Step 4: Commit**

---

### Task 2: Admin Auth — Environment variable password + rate limiting

**Files:**
- Modify: `services/authService.ts`

Changes:
1. Read admin password from `import.meta.env.VITE_ADMIN_PASSWORD` with fallback
2. Add failed attempt tracking (max 5 attempts, 15min lockout)
3. Fix `changeAdminPassword()` to actually work (store hash in localStorage)

---

### Task 3: Route Protection — Protect QuoteCalculator

**Files:**
- Modify: `App.tsx`

Change: Wrap QuoteCalculator rendering with same admin auth check as AdminPanel.

---

### Task 4: Email API — Add secret token auth

**Files:**
- Modify: `api/send-gmail-final.js`
- Modify: `services/gmailService.ts`

Changes:
1. API checks `Authorization: Bearer <GMAIL_API_SECRET>` header
2. gmailService sends the token from env var
3. Reject unauthenticated requests

---

### Task 5: Selection Service — Remove hardcoded email

**Files:**
- Modify: `services/selectionService.ts`

Change: Use Gmail config from localStorage instead of hardcoding `redlerkim@gmail.com`. Only fallback to hardcoded if no config exists.

---

### Task 6: Comment deletion — Fix auth to use user_id

**Files:**
- Modify: `services/favoritesService.ts:593-609`

Change: `removeCommentSupabase` should filter by `user_id` instead of `device_id`.

---

### Task 7: Selection service — Fix snake_case field access

**Files:**
- Modify: `services/selectionService.ts:198-219`

Change: Use `f.userId` (camelCase mapped field) instead of `f.user_id` for filtering. Same for comments.

---

### Task 8: FavoritesPage — Performance optimization

**Files:**
- Modify: `components/FavoritesPage.tsx`

Changes:
1. Wrap `favoritePhotos` and `filteredFavoritePhotos` in `useMemo`
2. Use Set for O(1) favorite lookups instead of Array.some()

---

### Task 9: Unique constraint — Update to support multi-user

**Files:**
- Create: migration SQL

Change: Drop old UNIQUE(gallery_id, photo_id, device_id) and add UNIQUE(gallery_id, photo_id, user_id) so multiple users can favorite the same photo.

---
