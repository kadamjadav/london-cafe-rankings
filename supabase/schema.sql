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
-- Short public bio shown on the profile page (added later; safe to re-run).
alter table public.profiles add column if not exists bio text check (bio is null or char_length(bio) <= 280);

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

-- ───────────────────────── API access ─────────────────────────
-- New Supabase projects don't expose new tables to the API automatically, so grant
-- exactly what the site needs. RLS policies below still decide which ROWS each user can touch.
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.reviews, public.review_likes, public.comments to anon, authenticated;
grant update (display_name, bio) on public.profiles to authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant insert, delete on public.review_likes to authenticated;
grant insert, delete on public.comments to authenticated;
grant insert, select, update (resolved) on public.reports to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
-- public.admins gets no grants at all: it is only readable through is_admin().

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
-- Storage's delete API looks the object up first, so deleting also needs a read policy.
drop policy if exists "photos readable" on storage.objects;
create policy "photos readable" on storage.objects for select
  using (bucket_id = 'review-photos');
drop policy if exists "photos owner or admin delete" on storage.objects;
create policy "photos owner or admin delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'review-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ───────────────────────── Community cafés ─────────────────────────
-- Cafés added by any signed-in user. Kadam's own scored rankings stay in src/data/cafes.ts.
create table if not exists public.community_cafes (
  id uuid not null unique default gen_random_uuid(),
  slug text primary key check (slug ~ '^c-[a-z0-9-]{2,78}$'), -- "c-" prefix: never collides with Kadam's café URLs
  name text not null check (char_length(name) between 2 and 80),
  area text not null check (char_length(area) between 2 and 40),
  address text check (address is null or char_length(address) <= 160),
  -- Greater London only
  lat double precision not null check (lat between 51.28 and 51.70),
  lng double precision not null check (lng between -0.51 and 0.33),
  added_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
-- Block exact duplicates (same name in the same area, ignoring case and spaces).
create unique index if not exists community_cafes_name_area_idx
  on public.community_cafes (lower(regexp_replace(name, '\s+', ' ', 'g')), lower(area));

-- How many cafés this user added in the last 24h (used to rate-limit spam).
create or replace function public.cafes_added_today(uid uuid)
returns int
language sql
stable
security definer set search_path = public
as $$
  select count(*)::int from public.community_cafes
  where added_by = uid and created_at > now() - interval '1 day';
$$;

-- Deleting a café removes its reviews too (reviews reference cafés by slug, not a foreign key,
-- because Kadam's own cafés live in code, not in the database).
create or replace function public.delete_cafe_reviews()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.reviews where cafe_slug = old.slug;
  return old;
end;
$$;
drop trigger if exists on_community_cafe_deleted on public.community_cafes;
create trigger on_community_cafe_deleted
  after delete on public.community_cafes
  for each row execute function public.delete_cafe_reviews();

-- Cafés can be reported too.
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('review', 'comment', 'cafe'));

grant select on public.community_cafes to anon, authenticated;
grant insert (slug, name, area, address, lat, lng) on public.community_cafes to authenticated;
grant delete on public.community_cafes to authenticated;
grant execute on function public.cafes_added_today(uuid) to authenticated;
revoke execute on function public.delete_cafe_reviews() from public, anon, authenticated;

alter table public.community_cafes enable row level security;
drop policy if exists "community cafes readable" on public.community_cafes;
create policy "community cafes readable" on public.community_cafes for select using (true);
drop policy if exists "community cafes own insert" on public.community_cafes;
create policy "community cafes own insert" on public.community_cafes for insert to authenticated
  with check (auth.uid() = added_by and public.cafes_added_today(auth.uid()) < 5);
-- Only admins delete (an owner deleting would also wipe other people's reviews).
drop policy if exists "community cafes admin delete" on public.community_cafes;
create policy "community cafes admin delete" on public.community_cafes for delete to authenticated
  using (public.is_admin());

-- ───────────────────────── Quick ratings ─────────────────────────
-- Score a café out of 10 per category without writing a review. One rating per person per café;
-- any category can be left blank, but at least one must be scored.
create table if not exists public.ratings (
  cafe_slug text not null check (cafe_slug ~ '^[a-z0-9-]{1,80}$'),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  coffee smallint check (coffee between 1 and 10),
  food smallint check (food between 1 and 10),
  vibe smallint check (vibe between 1 and 10),
  value smallint check (value between 1 and 10),
  laptop smallint check (laptop between 1 and 10),
  updated_at timestamptz not null default now(),
  primary key (cafe_slug, user_id),
  constraint ratings_at_least_one check (coalesce(coffee, food, vibe, value, laptop) is not null)
);

grant select on public.ratings to anon, authenticated;
grant insert (cafe_slug, coffee, food, vibe, value, laptop) on public.ratings to authenticated;
-- cafe_slug is deliberately NOT updatable: a rating can't be moved to another café.
grant update (coffee, food, vibe, value, laptop, updated_at) on public.ratings to authenticated;
grant delete on public.ratings to authenticated;

alter table public.ratings enable row level security;
drop policy if exists "ratings readable" on public.ratings;
create policy "ratings readable" on public.ratings for select using (true);
drop policy if exists "ratings own insert" on public.ratings;
create policy "ratings own insert" on public.ratings for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "ratings own update" on public.ratings;
create policy "ratings own update" on public.ratings for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "ratings owner or admin delete" on public.ratings;
create policy "ratings owner or admin delete" on public.ratings for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Removing a community café removes its ratings as well as its reviews.
create or replace function public.delete_cafe_reviews()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.reviews where cafe_slug = old.slug;
  delete from public.ratings where cafe_slug = old.slug;
  return old;
end;
$$;
revoke execute on function public.delete_cafe_reviews() from public, anon, authenticated;
-- Seed: 54 well-known independent London cafés from OpenStreetMap (© OpenStreetMap contributors, ODbL).
-- No reviews or scores: they're listed so visitors can find them and be the first to review.
alter table public.community_cafes alter column added_by drop not null;
alter table public.community_cafes add column if not exists source text not null default 'user'
  check (source in ('user', 'osm'));
insert into public.community_cafes (slug, name, area, address, lat, lng, source) values
  ('c-prufrock-coffee-holborn', 'Prufrock Coffee', 'Holborn', '23–25 Leather Lane, EC1N 7TE', 51.51995, -0.10952, 'osm'),
  ('c-monmouth-coffee-company-covent-garden', 'Monmouth Coffee Company', 'Covent Garden', '27 Monmouth Street, WC2H 9EU', 51.51437, -0.1268, 'osm'),
  ('c-monmouth-coffee-company-borough', 'Monmouth Coffee Company', 'Borough', '2 Park Street, SE1 9AB', 51.5055, -0.09143, 'osm'),
  ('c-monmouth-coffee-company-bermondsey', 'Monmouth Coffee Company', 'Bermondsey', '3–4 Dockley Road, SE16 3AF', 51.4956, -0.06933, 'osm'),
  ('c-workshop-coffee-co-clerkenwell', 'Workshop Coffee Co.', 'Clerkenwell', '27 Clerkenwell Road, EC1M 5RN', 51.52234, -0.10236, 'osm'),
  ('c-workshop-coffee-co-marylebone', 'Workshop Coffee Co.', 'Marylebone', '1 Barrett Street', 51.5152, -0.14998, 'osm'),
  ('c-kaffeine-fitzrovia', 'Kaffeine', 'Fitzrovia', '66 Great Titchfield Street, W1W 7QJ', 51.51845, -0.14034, 'osm'),
  ('c-ozone-coffee-roasters-shoreditch', 'Ozone Coffee Roasters', 'Shoreditch', '11 Leonard Street, EC2A 4AQ', 51.5247, -0.08674, 'osm'),
  ('c-ozone-coffee-city-of-london', 'Ozone Coffee', 'City of London', '56 Ludgate Hill, EC4M 7AW', 51.51426, -0.10297, 'osm'),
  ('c-allpress-espresso-bar-shoreditch', 'Allpress Espresso Bar', 'Shoreditch', '58 Redchurch Street, E2 7DP', 51.52442, -0.07424, 'osm'),
  ('c-allpress-london-roastery-and-cafe-dalston', 'Allpress London Roastery and Cafe', 'Dalston', '55 Dalston Lane, E8 2NG', 51.54645, -0.07056, 'osm'),
  ('c-climpson-and-sons-london-fields', 'Climpson & Sons', 'London Fields', '67 Broadway Market, E8 4PH', 51.53746, -0.06131, 'osm'),
  ('c-store-street-espresso-bloomsbury', 'Store Street Espresso', 'Bloomsbury', '40 Store Street, WC1E 7DB', 51.52005, -0.13067, 'osm'),
  ('c-flat-white-soho', 'Flat White', 'Soho', '17 Berwick Street, W1F 0PT', 51.5136, -0.13481, 'osm'),
  ('c-fernandez-and-wells-st-giles', 'Fernandez & Wells', 'St Giles', '1 Denmark Street, WC2H 8LP', 51.51534, -0.12903, 'osm'),
  ('c-kiss-the-hippo-fitzrovia', 'Kiss the Hippo', 'Fitzrovia', '51 Margaret Street, W1W 8SG', 51.51648, -0.14162, 'osm'),
  ('c-kiss-the-hippo-richmond', 'Kiss the Hippo', 'Richmond', '21 Sheen Road, TW9 1AD', 51.46118, -0.30217, 'osm'),
  ('c-redemption-roasters-bloomsbury', 'Redemption Roasters', 'Bloomsbury', '86 Lamb''s Conduit Street', 51.52284, -0.11894, 'osm'),
  ('c-redemption-roasters-st-james-s', 'Redemption Roasters', 'St James''s', '35 Jermyn Street, SW1Y 6DT', 51.50847, -0.13687, 'osm'),
  ('c-redemption-roasters-king-s-cross', 'Redemption Roasters', 'King''s Cross', 'Stable Street, N1C 4AQ', 51.53591, -0.12617, 'osm'),
  ('c-redemption-roasters-hampstead', 'Redemption Roasters', 'Hampstead', '53 South End Road, NW3 2QB', 51.55545, -0.16674, 'osm'),
  ('c-saint-espresso-angel', 'Saint Espresso', 'Angel', '26 Pentonville Road, N1 9HJ', 51.53204, -0.10761, 'osm'),
  ('c-saint-espresso-hackney-wick', 'Saint Espresso', 'Hackney Wick', '13 East Bay Lane, E20 3BS', 51.54624, -0.02198, 'osm'),
  ('c-nagare-coffee-soho', 'Nagare Coffee', 'Soho', '2 Newburgh Street, W1F 7RD', 51.51344, -0.13845, 'osm'),
  ('c-nagare-coffee-spitalfields', 'Nagare Coffee', 'Spitalfields', '40 Brushfield Street, E1 6AG', 51.51896, -0.07694, 'osm'),
  ('c-notes-covent-garden', 'Notes', 'Covent Garden', '31 St Martin''s Lane, WC2N 4ER', 51.5097, -0.12666, 'osm'),
  ('c-notes-king-s-cross', 'Notes', 'King''s Cross', '1 Pancras Square, N1C 4AG', 51.53311, -0.12512, 'osm'),
  ('c-lantana-cafe-camden', 'Lantana Café', 'Camden', '45 Middle Yard, Camden Lock Place, NW1 8AF', 51.54135, -0.14628, 'osm'),
  ('c-lantana-dl78-fitzrovia', 'Lantana DL78', 'Fitzrovia', '78 Charlotte Street, W1T 4QS', 51.5209, -0.13704, 'osm'),
  ('c-attendant-fitzrovia', 'Attendant', 'Fitzrovia', '27A Foley Street, W1W 6DY', 51.51922, -0.1407, 'osm'),
  ('c-attendant-holborn', 'Attendant', 'Holborn', '75 Leather Lane, EC1N 7TJ', 51.52109, -0.11001, 'osm'),
  ('c-curators-coffee-city-of-london', 'Curators Coffee', 'City of London', '9A Cullum Street, EC3M 7JJ', 51.51208, -0.08251, 'osm'),
  ('c-rosslyn-city-of-london', 'Rosslyn', 'City of London', '20 Royal Exchange, EC3V 3LP', 51.5139, -0.08673, 'osm'),
  ('c-chapter-72-bermondsey', 'Chapter 72', 'Bermondsey', '72 Bermondsey Street, SE1 3UD', 51.50142, -0.08227, 'osm'),
  ('c-watchhouse-bermondsey', 'WatchHouse', 'Bermondsey', '199 Bermondsey Street, SE1 3UW', 51.498, -0.08124, 'osm'),
  ('c-watchhouse-shad-thames', 'WatchHouse', 'Shad Thames', '37 Shad Thames, SE1 2NJ', 51.50365, -0.07442, 'osm'),
  ('c-watchhouse-somerset-house-strand', 'WatchHouse Somerset House', 'Strand', null, 51.51145, -0.11678, 'osm'),
  ('c-paper-and-cup-shoreditch', 'Paper & Cup', 'Shoreditch', '18 Calvert Avenue, E2 7JP', 51.52622, -0.07684, 'osm'),
  ('c-dark-arts-coffee-shoreditch', 'Dark Arts Coffee', 'Shoreditch', 'Holywell Lane', 51.52386, -0.07782, 'osm'),
  ('c-sacred-grounds-soho', 'Sacred Grounds', 'Soho', '54 Dean Street, W1D 6AE', 51.51236, -0.13179, 'osm'),
  ('c-department-of-coffee-and-social-affairs-soho', 'Department of Coffee and Social Affairs', 'Soho', '3 Lowndes Court, W1F 7HD', 51.51357, -0.13899, 'osm'),
  ('c-brick-lane-coffee-shop-spitalfields', 'Brick Lane Coffee Shop', 'Spitalfields', '47 Brick Lane, E1 6PU', 51.51874, -0.07172, 'osm'),
  ('c-exmouth-coffee-company-whitechapel', 'Exmouth Coffee Company', 'Whitechapel', '83 Whitechapel High Street, E1 7QX', 51.51599, -0.07039, 'osm'),
  ('c-granger-and-co-marylebone', 'Granger & Co.', 'Marylebone', '105 Marylebone High Street, W1U 4RS', 51.5191, -0.15192, 'osm'),
  ('c-daisy-green-marylebone', 'Daisy Green', 'Marylebone', '20 Seymour Street', 51.5149, -0.15797, 'osm'),
  ('c-ole-and-steen-covent-garden', 'Ole & Steen', 'Covent Garden', '41 Neal Street', 51.51445, -0.12592, 'osm'),
  ('c-bageriet-covent-garden', 'Bageriet', 'Covent Garden', '24 Rose Street, WC2E 9EA', 51.51193, -0.12619, 'osm'),
  ('c-arome-bakery-covent-garden', 'Arôme Bakery', 'Covent Garden', '9 Mercer Street, WC2H 9QJ', 51.51299, -0.12614, 'osm'),
  ('c-formative-coffee-westminster', 'Formative Coffee', 'Westminster', '4 Butler Place, SW1H 0RH', 51.49788, -0.13551, 'osm'),
  ('c-vagabond-n7-holloway', 'Vagabond N7', 'Holloway', '105 Holloway Road, N7 8LT', 51.54812, -0.10674, 'osm'),
  ('c-sacred-cafe-holloway', 'Sacred Cafe', 'Holloway', '8 Hornsey Street', 51.5511, -0.11402, 'osm'),
  ('c-taylor-st-baristas-mayfair', 'Taylor St. Baristas', 'Mayfair', '22 Brook''s Mews', 51.51219, -0.14725, 'osm'),
  ('c-pophams-islington', 'Pophams', 'Islington', null, 51.53685, -0.09634, 'osm'),
  ('c-ginger-and-white-hampstead', 'Ginger & White', 'Hampstead', null, 51.55551, -0.17824, 'osm')
on conflict do nothing;
