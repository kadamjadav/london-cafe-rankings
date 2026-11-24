# ☕ London Café Rankings

Every London café I've visited, ranked on a map, with community reviews.

I score each café on **coffee, food, vibe, value and how laptop-friendly it is**. The site turns those scores into an overall ranking and plots every café on an interactive map of London. Visitors can sign in to post their own review with a photo, like other reviews, comment and report abuse.

**Live site:** _add your Vercel URL here_

<!-- Add a screenshot: save one as docs/screenshot.png and uncomment the line below -->
<!-- ![Screenshot](docs/screenshot.png) -->

## Features

- **Ranked list:** search, filter by area, and sort by any category or by most recent visit
- **Map of London:** numbered pins match the ranking, panning is limited to Greater London, and clicking a card flies the map to that café
- **A page for each café:** score breakdown, write-up, "must order", photos and a mini map. Pages are statically generated, so they're fast and SEO-friendly.
- **Community** (needs Supabase)
  - Passwordless email sign-in (magic link)
  - One review per person per café, with a star rating, text and an optional photo
  - Likes, comments on each review, a report button and an admin moderation queue at `/admin`
  - Photos are re-encoded in the browser before upload, which **strips GPS/EXIF metadata**

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS | Static pages for the rankings, client components for interactive parts |
| Map | Leaflet + react-leaflet + OpenStreetMap tiles | Free, no API key, no billing account |
| Backend | Supabase (Postgres, Auth, Storage) | Postgres with Row Level Security instead of a custom API server |
| Hosting | Vercel | Every push to `main` deploys automatically |

## Design decisions

**The database enforces security, not the frontend.** The browser talks to Postgres directly with a public key, so every permission is written as a Row Level Security policy in [`supabase/schema.sql`](supabase/schema.sql). You can only edit or delete your own reviews and comments, you can only like a review once, a review's photo must sit in the uploader's own storage folder, and only admins can read reports or delete other people's content. Someone who bypasses the UI and calls the API directly still gets blocked.

**Constraints live in the schema.** Rating range, text length, one review per user per café and one like per user per review are all `CHECK` / `UNIQUE` constraints, so bad data can't get in even if a client is buggy.

**Privacy by default.**
- Phones embed GPS coordinates in photos, often the user's home. Photos are redrawn onto a canvas and exported as a fresh JPEG before upload, which drops all metadata. They're also resized to a maximum of 1600 px.
- Public display names are random (`coffee-fan-a1b2c3`), never derived from the email address. Users can change their name.
- The storage bucket accepts only JPEG files up to 5 MB.

**Moderation from day one.** Any signed-in user can report a review or comment. Admins see a queue at `/admin` where they can delete the content (and its photo) or dismiss the report. Admin status is checked server-side through a `SECURITY DEFINER` function, `is_admin()`.

**Rankings are code, not a database.** My own café scores live in a typed TypeScript file (`src/data/cafes.ts`), so adding a café is a reviewed git commit and the pages can be fully static. Only user-generated content needs a database.

**Works without a backend.** If the Supabase keys are missing, the rankings and map still work and the community section shows a notice, so the project runs immediately after `git clone`.

## Running it locally

```bash
npm install
npm run dev          # http://localhost:3000
```

### Turning on community features

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query:** paste [`supabase/schema.sql`](supabase/schema.sql) and run it.
3. **Authentication → URL Configuration:** set the Site URL to your deployed URL and add `http://localhost:3000/**` to Redirect URLs.
4. `cp .env.example .env.local`, then fill in the values from **Project Settings → API**.
5. Sign in on the site once, then make yourself an admin in the SQL Editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

## Adding a café

Edit [`src/data/cafes.ts`](src/data/cafes.ts) and copy an existing entry. The comment at the top of the file explains each field. Put photos in `public/cafes/`. The overall score and the rank are calculated for you.

## Deploying

1. Push to GitHub.
2. On [vercel.com](https://vercel.com), import the repository.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as environment variables, then deploy.
4. Put the Vercel URL into Supabase's Auth Site URL (step 3 above).

## Project structure

```
src/
  app/
    page.tsx              # ranking + map
    cafe/[slug]/page.tsx  # one page per café (statically generated)
    admin/page.tsx        # moderation queue
    privacy/page.tsx      # privacy notice + community rules
  components/             # map, ranking explorer, community reviews, auth
  data/cafes.ts           # ← my rankings
  lib/                    # scoring, Supabase client, image sanitising
supabase/schema.sql       # tables, constraints, RLS policies, storage bucket
```

## Possible next steps

- Rate limiting on posts (a Postgres trigger or a Supabase Edge Function)
- Automated image moderation before photos become public
- Self-service account deletion
- Tests for the scoring logic and end-to-end tests for the review flow
