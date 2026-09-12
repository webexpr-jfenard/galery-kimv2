-- =============================================
-- MIGRATION: visitor_identity_policies (applied together with the client that sends x-user-token)
-- =============================================
-- Visitors prove ownership of their favorites/comments with a secret token kept in their
-- browser and sent as the x-user-token header; user_id = sha256(token) (request_user_id()).
-- Reads stay public (the photographer and the other guests see every selection).

drop policy if exists favorites_insert on public.favorites;
drop policy if exists favorites_update on public.favorites;
drop policy if exists favorites_delete on public.favorites;
create policy favorites_insert on public.favorites for insert
  with check (gallery_id is not null and photo_id is not null and user_id is not null
              and (user_id = public.request_user_id() or public.is_admin_user()));
create policy favorites_update on public.favorites for update
  using (user_id = public.request_user_id() or public.is_admin_user())
  with check (user_id = public.request_user_id() or public.is_admin_user());
create policy favorites_delete on public.favorites for delete
  using (user_id = public.request_user_id() or public.is_admin_user());

drop policy if exists comments_insert on public.comments;
drop policy if exists comments_update on public.comments;
drop policy if exists comments_delete on public.comments;
create policy comments_insert on public.comments for insert
  with check (gallery_id is not null and photo_id is not null and user_id is not null and comment is not null
              and (user_id = public.request_user_id() or public.is_admin_user()));
create policy comments_update on public.comments for update
  using (user_id = public.request_user_id() or public.is_admin_user())
  with check (user_id = public.request_user_id() or public.is_admin_user());
create policy comments_delete on public.comments for delete
  using (user_id = public.request_user_id() or public.is_admin_user());
