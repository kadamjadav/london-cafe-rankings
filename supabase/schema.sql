-- London Café Rankings — database schema
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Security model: the browser talks to Postgres directly with the public key, so EVERY
-- permission is enforced here with Row Level Security (RLS), not in the frontend.

-- ───────────────────────── Profiles ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  created_at timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Deliberately NOT derived from the email address, so emails never leak publicly.
  -- Users can change it from the account menu.
  insert into public.profiles (id, display_name)
  values (new.id, 'coffee-fan-' || left(replace(new.id::text, '-', ''), 6))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Admins ─────────────────────────
-- Add yourself after signing up once:
--   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ───────────────────────── Reviews ─────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  cafe_slug text not null check (cafe_slug ~ '^[a-z0-9-]{1,80}$'),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 2000),
  photo_path text check (photo_path is null or char_length(photo_path) < 200),
  created_at timestamptz not null default now(),
  unique (cafe_slug, user_id) -- one review per person per café
);
create index if not exists reviews_cafe_idx on public.reviews (cafe_slug, created_at desc);

create table if not exists public.review_likes (
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id) -- you can only like a review once
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists comments_review_idx on public.comments (review_id, created_at);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('review', 'comment')),
  target_id uuid not null,
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles     enable row level security;
alter table public.admins       enable row level security;
alter table public.reviews      enable row level security;
alter table public.review_likes enable row level security;
alter table public.comments     enable row level security;
alter table public.reports      enable row level security;

-- Profiles: public names, you can only edit your own.
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select using (true);
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- Admins table: nobody reads or writes it through the API (only via is_admin()).

-- Reviews: anyone can read; signed-in users write their own; owner or admin deletes.
drop policy if exists "reviews readable" on public.reviews;
create policy "reviews readable" on public.reviews for select using (true);
drop policy if exists "reviews own insert" on public.reviews;
create policy "reviews own insert" on public.reviews for insert to authenticated
  with check (
    auth.uid() = user_id
    -- a photo, if any, must live in the uploader's own folder
    and (photo_path is null or photo_path like auth.uid()::text || '/%')
  );
drop policy if exists "reviews own update" on public.reviews;
create policy "reviews own update" on public.reviews for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and (photo_path is null or photo_path like auth.uid()::text || '/%'));
drop policy if exists "reviews owner or admin delete" on public.reviews;
create policy "reviews owner or admin delete" on public.reviews for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Likes
drop policy if exists "likes readable" on public.review_likes;
create policy "likes readable" on public.review_likes for select using (true);
drop policy if exists "likes own insert" on public.review_likes;
create policy "likes own insert" on public.review_likes for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "likes own delete" on public.review_likes;
create policy "likes own delete" on public.review_likes for delete to authenticated
  using (auth.uid() = user_id);

-- Comments
drop policy if exists "comments readable" on public.comments;
create policy "comments readable" on public.comments for select using (true);
drop policy if exists "comments own insert" on public.comments;
create policy "comments own insert" on public.comments for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "comments owner or admin delete" on public.comments;
create policy "comments owner or admin delete" on public.comments for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Reports: anyone signed in can file one; only admins can see or resolve them.
drop policy if exists "reports own insert" on public.reports;
create policy "reports own insert" on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id);
drop policy if exists "reports admin read" on public.reports;
create policy "reports admin read" on public.reports for select to authenticated
  using (public.is_admin());
drop policy if exists "reports admin update" on public.reports;
create policy "reports admin update" on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────── Photo storage ─────────────────────────
-- Public-read bucket, 5 MB per file, images only. Files are stored as <user_id>/<uuid>.jpg.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos own upload" on storage.objects;
create policy "photos own upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "photos owner or admin delete" on storage.objects;
create policy "photos owner or admin delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'review-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
