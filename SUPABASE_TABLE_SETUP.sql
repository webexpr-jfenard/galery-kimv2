-- =============================================
-- GALERIE KIM — SCHÉMA DE RÉFÉRENCE (état au 12 septembre 2026)
-- =============================================
-- Ce fichier décrit la base telle qu'elle existe après les migrations de
-- supabase/migrations/. Les migrations restent la source de vérité pour faire
-- évoluer une base existante ; ce script sert à comprendre le modèle ou à
-- recréer une base vierge (à compléter par les politiques de storage).
-- Extensions requises : pgcrypto (schéma extensions), fournie par Supabase.

-- ---------- Comptes admin (Supabase Auth) ----------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon;
grant select on public.admin_users to authenticated;
create policy admin_users_self_select on public.admin_users for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin_user() returns boolean
language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid());
$$;

-- Identité visiteur : sha256 du jeton secret envoyé en en-tête x-user-token
create or replace function public.request_user_id() returns text
language sql stable set search_path = public as $$
  select case
    when coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-user-token', '') = '' then null
    else encode(extensions.digest(current_setting('request.headers', true)::json ->> 'x-user-token', 'sha256'), 'hex')
  end;
$$;

-- ---------- Galeries ----------
create table if not exists public.galleries (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_public boolean default true,           -- sans effet fonctionnel, conservé
  password text,                            -- toujours null : le mot de passe est haché dans gallery_secrets
  has_password boolean not null default false,
  bucket_folder text,
  bucket_name text default 'photos',
  photo_count integer default 0,            -- maintenu par trigger
  view_count integer default 0,             -- non utilisé
  allow_comments boolean default true,
  allow_favorites boolean default true,
  category text,
  featured_photo_url text,
  featured_photo_id text,
  folder_tree jsonb,                        -- [{name, children?: string[]}] : hiérarchie et ordre des sous-dossiers
  instructions jsonb                        -- consignes de sélection propres à la galerie (null = désactivées)
);
alter table public.galleries enable row level security;
create policy galleries_select on public.galleries for select using (true);
create policy galleries_insert on public.galleries for insert with check (public.is_admin_user());
create policy galleries_update on public.galleries for update using (public.is_admin_user()) with check (public.is_admin_user());
create policy galleries_delete on public.galleries for delete using (public.is_admin_user());

-- Mots de passe de galerie (bcrypt), jamais lisibles par un client
create table if not exists public.gallery_secrets (
  gallery_id text primary key references public.galleries(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.gallery_secrets enable row level security;
revoke all on public.gallery_secrets from anon, authenticated;

create or replace function public.set_gallery_password(p_gallery_id text, p_password text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_user() then raise exception 'not allowed'; end if;
  if p_password is null or btrim(p_password) = '' then
    delete from public.gallery_secrets where gallery_id = p_gallery_id;
    update public.galleries set has_password = false where id = p_gallery_id;
    return;
  end if;
  insert into public.gallery_secrets (gallery_id, password_hash)
  values (p_gallery_id, extensions.crypt(p_password, extensions.gen_salt('bf')))
  on conflict (gallery_id) do update set password_hash = excluded.password_hash, updated_at = now();
  update public.galleries set has_password = true where id = p_gallery_id;
end $$;
revoke execute on function public.set_gallery_password(text, text) from anon;

create or replace function public.verify_gallery_password(p_gallery_id text, p_password text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gallery_secrets s
                 where s.gallery_id = p_gallery_id and s.password_hash = extensions.crypt(p_password, s.password_hash));
$$;

-- ---------- Photos ----------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id text not null references public.galleries(id) on delete cascade,
  name text not null,                       -- nom d'origine, affiché
  url text not null,                        -- URL publique de l'original
  description text,
  subfolder text,                           -- nom de feuille (la hiérarchie est dans galleries.folder_tree)
  file_size bigint,
  file_type text,
  bucket_path text,                         -- chemin réel dans le bucket (originaux)
  thumbnail_url text,                       -- vignette générée à l'upload (gallery-<id>/thumbs/...)
  width integer,
  height integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists idx_photos_gallery_id on public.photos(gallery_id);
create index if not exists idx_photos_gallery_subfolder on public.photos(gallery_id, subfolder);
alter table public.photos enable row level security;
create policy photos_select on public.photos for select using (true);
create policy photos_insert on public.photos for insert with check (public.is_admin_user());
create policy photos_update on public.photos for update using (public.is_admin_user()) with check (public.is_admin_user());
create policy photos_delete on public.photos for delete using (public.is_admin_user());

create or replace function public.get_gallery_subfolders(gallery_id_param text)
returns table(subfolder text, photo_count bigint)
language sql stable set search_path = public as $$
  select p.subfolder, count(*) from public.photos p
  where p.gallery_id = gallery_id_param and p.subfolder is not null and p.subfolder <> ''
  group by p.subfolder order by p.subfolder;
$$;

create or replace function public.sync_gallery_photo_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    update public.galleries set photo_count = (select count(*) from public.photos where gallery_id = new.gallery_id) where id = new.gallery_id;
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    update public.galleries set photo_count = (select count(*) from public.photos where gallery_id = old.gallery_id) where id = old.gallery_id;
  end if;
  return null;
end $$;
create trigger photos_sync_gallery_count after insert or delete or update of gallery_id on public.photos
  for each row execute function public.sync_gallery_photo_count();

-- ---------- Favoris et commentaires ----------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  gallery_id text not null references public.galleries(id) on delete cascade,
  photo_id text not null,
  device_id text not null,
  user_id text,                             -- sha256 du jeton visiteur
  user_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (gallery_id, photo_id, user_id)
);
create index if not exists idx_favorites_gallery_id on public.favorites(gallery_id);
create index if not exists idx_favorites_gallery_user on public.favorites(gallery_id, user_id);
alter table public.favorites enable row level security;
create policy favorites_select on public.favorites for select using (true);
create policy favorites_insert on public.favorites for insert
  with check (gallery_id is not null and photo_id is not null and user_id is not null
              and (user_id = public.request_user_id() or public.is_admin_user()));
create policy favorites_update on public.favorites for update
  using (user_id = public.request_user_id() or public.is_admin_user())
  with check (user_id = public.request_user_id() or public.is_admin_user());
create policy favorites_delete on public.favorites for delete
  using (user_id = public.request_user_id() or public.is_admin_user());

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  gallery_id text not null references public.galleries(id) on delete cascade,
  photo_id text not null,
  device_id text not null,
  user_id text,
  user_name text,
  comment text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_comments_gallery_id on public.comments(gallery_id);
create index if not exists idx_comments_gallery_user on public.comments(gallery_id, user_id);
alter table public.comments enable row level security;
create policy comments_select on public.comments for select using (true);
create policy comments_insert on public.comments for insert
  with check (gallery_id is not null and photo_id is not null and user_id is not null and comment is not null
              and (user_id = public.request_user_id() or public.is_admin_user()));
create policy comments_update on public.comments for update
  using (user_id = public.request_user_id() or public.is_admin_user())
  with check (user_id = public.request_user_id() or public.is_admin_user());
create policy comments_delete on public.comments for delete
  using (user_id = public.request_user_id() or public.is_admin_user());

-- ---------- Consignes de sélection ----------
create table if not exists public.instruction_templates (
  id text primary key,
  name text not null,
  sort_order integer not null default 0,
  content jsonb not null,                   -- {title, quota, intro, steps[], help}
  updated_at timestamptz not null default now()
);
alter table public.instruction_templates enable row level security;
grant select on public.instruction_templates to anon, authenticated;
grant insert, update, delete on public.instruction_templates to authenticated;
create policy instruction_templates_select on public.instruction_templates for select using (true);
create policy instruction_templates_insert on public.instruction_templates for insert with check (public.is_admin_user());
create policy instruction_templates_update on public.instruction_templates for update using (public.is_admin_user()) with check (public.is_admin_user());
create policy instruction_templates_delete on public.instruction_templates for delete using (public.is_admin_user());
-- Les trois modèles de départ (textes de Kim) sont insérés par la migration data_model_audit_2026_09.

-- ---------- updated_at ----------
create or replace function public.update_updated_at_column() returns trigger as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$ language plpgsql;
create trigger update_galleries_updated_at before update on public.galleries for each row execute function public.update_updated_at_column();
create trigger update_photos_updated_at before update on public.photos for each row execute function public.update_updated_at_column();
create trigger update_favorites_updated_at before update on public.favorites for each row execute function public.update_updated_at_column();
create trigger update_comments_updated_at before update on public.comments for each row execute function public.update_updated_at_column();

-- ---------- Storage (bucket "photos", public en lecture) ----------
-- create policy photos_public_read on storage.objects for select using (bucket_id = 'photos');
-- create policy photos_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'photos' and public.is_admin_user());
-- create policy photos_admin_update on storage.objects for update to authenticated using (bucket_id = 'photos' and public.is_admin_user()) with check (bucket_id = 'photos' and public.is_admin_user());
-- create policy photos_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'photos' and public.is_admin_user());
