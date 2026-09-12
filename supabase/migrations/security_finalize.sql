-- =============================================
-- MIGRATION: security_finalize (apply once Kim and Jeremy have signed in with Supabase Auth)
-- =============================================
-- Removes the legacy header-based admin mechanism (x-admin-secret / is_admin()) that the
-- audit of 2026-09-12 found shipped in the public bundle. After this, only Supabase Auth
-- accounts listed in admin_users can write.

drop policy if exists galleries_insert on public.galleries;
drop policy if exists galleries_update on public.galleries;
drop policy if exists galleries_delete on public.galleries;
create policy galleries_insert on public.galleries for insert with check (public.is_admin_user());
create policy galleries_update on public.galleries for update using (public.is_admin_user()) with check (public.is_admin_user());
create policy galleries_delete on public.galleries for delete using (public.is_admin_user());

drop policy if exists photos_insert on public.photos;
drop policy if exists photos_update on public.photos;
drop policy if exists photos_delete on public.photos;
create policy photos_insert on public.photos for insert with check (public.is_admin_user());
create policy photos_update on public.photos for update using (public.is_admin_user()) with check (public.is_admin_user());
create policy photos_delete on public.photos for delete using (public.is_admin_user());

drop policy if exists photos_legacy_admin_insert on storage.objects;

drop function if exists public.is_admin();
drop table if exists public.app_config;
