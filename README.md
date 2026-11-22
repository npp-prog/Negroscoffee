# Kape Negros

A map-first web app listing coffee shops on Negros Island, Philippines (Negros Occidental and
Negros Oriental), filterable by **price tier** (from the price of a 12 oz hot latte) and **shop
type** (specialty, chain, local kapihan). Installable on phones as an app (PWA).

- **Visitors:** map with clustered pins, filters and search kept in the URL, "near me", open-now
  in Philippine time, shop pages with hours, menu prices, photos and directions.
- **Community:** suggest a shop, suggest an edit, claim a shop as its owner.
- **Admins:** dashboard, quick review of imported drafts, full shop editor (pin, hours, menu,
  photos), submissions queue, bulk publish/hide.
- **Data:** your own Supabase database; cafés can be imported from OpenStreetMap.

Built with Next.js 16, Tailwind CSS 4, MapLibre + MapTiler, Supabase (Postgres + PostGIS, Auth,
Storage), TanStack Query and Zod. See [PLAN.md](./PLAN.md) for the milestones and
[CLAUDE.md](./CLAUDE.md) for architecture notes and conventions.

---

## 1. Accounts and keys you need

| Service                                      | What for                  | Where to find the values                                       |
| -------------------------------------------- | ------------------------- | -------------------------------------------------------------- |
| [Supabase](https://supabase.com) (free tier) | Database, sign-in, photos | Project Settings → **API Keys** / **Data API**                 |
| [MapTiler](https://cloud.maptiler.com)       | Map tiles                 | Account → **Keys** (restrict it to your domains)               |
| [Vercel](https://vercel.com) (Hobby)         | Hosting                   | Import the GitHub repository                                   |
| Google Cloud (optional)                      | "Continue with Google"    | APIs & Services → Credentials → OAuth client (Web application) |

Environment variables (see [`.env.example`](./.env.example)):

| Variable                                | Required | Notes                                                                |
| --------------------------------------- | -------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`              | yes      | `https://<project-ref>.supabase.co`                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`         | yes      | The public anon / publishable key                                    |
| `NEXT_PUBLIC_MAPTILER_KEY`              | yes      | Without it the app works but shows a placeholder instead of the map  |
| `NEXT_PUBLIC_SITE_URL`                  | no       | Your public URL; defaults to Vercel's production URL                 |
| `SUPABASE_SERVICE_ROLE_KEY`             | import   | OpenStreetMap import and email lookups. Secret: never in the browser |
| `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMS` | no       | `on` only on a Supabase plan with Image Transformations (Pro)        |
| `NEXT_PUBLIC_CONTACT_EMAIL`             | no       | Contact address shown on `/privacy` (any inbox you check)            |
| `RESEND_API_KEY`                        | no       | Turns on email notifications (section 3)                             |
| `EMAIL_FROM`                            | no       | Sender, e.g. `Kape Negros <hello@yourdomain.com>` (verified domain)  |
| `NOTIFY_ADMIN_EMAILS`                   | no       | Comma-separated admin inboxes; default: admins with emails on        |
| `EMAIL_REPLY_TO`                        | no       | Reply address; default: first `NOTIFY_ADMIN_EMAILS` entry            |

`NEXT_PUBLIC_*` values are baked in at build time: after changing them in Vercel, **redeploy**.

## 2. Set up the database (Supabase, in the browser)

1. Create a Supabase project. Southeast Asia (Singapore) is closest to Negros.
2. Open **SQL Editor → New query** and run, in order, each file in
   [`supabase/migrations/`](./supabase/migrations/):
   1. `…01_core_schema.sql` — tables, PostGIS, price-tier trigger
   2. `…02_rls_and_search.sql` — row-level security, `shop_cards` view, search functions
   3. `…03_storage.sql` — `shop-photos` (public) and `submission-proofs` (private) buckets
   4. `…04_api_grants.sql` — table privileges for the API roles (needed on newer projects)
   5. `20261122000001_owner_editing.sql` — owner self-service permissions and edit log
   6. `20261122000002_reviews_favorites.sql` — reviews, ratings, favorites and "visited"
   7. `20261122000003_published_at.sql` — publish dates for the "New" filter and badges
   8. `20261122000004_email_notifications.sql` — per-person email on/off setting
   9. `20261122000005_visitor_photos.sql` — visitor photo uploads (private until approved)
   10. `20261122000006_shop_insights.sql` — anonymous daily visit counters for owner insights
   11. `20261122000007_shop_lists.sql` — curated coffee lists
   12. `20261122000008_security_hardening.sql` — locks ratings/photo credits, spam limits,
       atomic menu/list saves, indexes
3. Run [`supabase/seed.sql`](./supabase/seed.sql): 57 Negros cities/municipalities plus 10
   fictional demo shops (slugs `demo-*`). Remove the demos before launch:

   ```sql
   delete from public.shops where slug like 'demo-%';
   ```

Each file runs once; the grants file is safe to re-run. With the Supabase CLI instead:
`npx supabase link` then `npm run db:push`, and `psql "$DATABASE_URL" -f supabase/seed.sql`.

## 3. Sign-in and your admin account

1. Supabase → **Authentication → URL Configuration**
   - **Site URL:** your site, e.g. `https://kapenegros.vercel.app`
   - **Redirect URLs:** `https://<your-domain>/auth/callback` (and
     `http://localhost:3000/auth/callback` for local development)
2. **Authentication → Sign In / Providers:** Email is on by default (magic link). For Google:
   create an OAuth client (type _Web application_) in Google Cloud with
   - Authorized JavaScript origin: `https://<your-domain>`
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`

   publish the consent screen, then paste the client ID and secret into the Google provider.

3. Sign in once at `/login`, then make yourself admin in the SQL editor:

   ```sql
   update profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

4. Open `/admin`.

### Shop owners

When you approve a claim from a signed-in claimant, their account becomes an **owner** of that
shop. Owners sign in and go to `/owner` to update prices (the tier follows the latte price), hours,
menu, description, contact links and photos; changes go live immediately and appear under
**Recent owner edits** on your dashboard. Name, type, address, map pin and status stay with
admins. If a claim was approved before the owner signed in, ask them to sign in once, then use
the **Owner** panel in the shop editor to link their email.

### Coffee lists

Make hand-picked lists ("Best kapihan in Bacolod", "Dumaguete under ₱100") at `/admin/lists`:
add published shops by name, order them, add a short note to each, then set the list to
Published. Lists appear at `/lists` (also linked from the map), each with its own shareable page
and preview image, and listed shops show "Featured in" on their page.

### Owner insights

Owners see **Insights · last 30 days** on their shop in My shop: page views, map taps,
directions and calls/links taps (with change vs the previous 30 days), a daily chart, plus how
many people saved the shop or marked it "been here". Your dashboard lists the **most viewed**
shops of the week. Counting is anonymous (daily totals per shop, no visitor ids, IPs or cookies);
each visitor counts once per browser session per action, and only browsers that run JavaScript
count.

### Reviews and saved shops

Signed-in visitors rate shops (1–5 stars, optional text, one review per shop) and save shops as
**favorites** or **visited** (listed on `/saved`, where they also set the name shown on their
reviews). Averages appear on shop pages and map cards. Owners reply from **My shop**; admins
hide abusive reviews at `/admin/reviews` (hidden reviews don't count toward ratings).

### Visitor photos

Signed-in visitors tap **Add a photo** on a shop page. Photos wait privately until you approve
them at `/admin/photos`; approved ones join the end of the shop's gallery with "Photo by" and the
visitor's display name (declined files are deleted). Visitors follow their photos on `/saved`
and can withdraw pending ones. Limit: 20 photos per person per day.

### Email notifications (optional)

- Owners get an email when someone reviews their shop.
- Admins get one for each new suggestion, edit, claim or visitor photo.
- Claimants hear when their claim is approved or declined.

Everyone can switch emails off on `/saved` (claim decisions are always sent).

1. Create a free [Resend](https://resend.com) account → **API Keys → Create** (sending access).
2. In Vercel add `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (and optionally
   `NOTIFY_ADMIN_EMAILS`), then redeploy.
3. Until you verify a domain in Resend (**Domains**), Resend only delivers to your own account
   email. After verifying, set `EMAIL_FROM` to an address on that domain.

Emails go out after the page responds, so a slow or failed send never blocks visitors. Failures
are logged in Vercel's function logs (`[email]`).

## 4. Deploy (Vercel)

1. Vercel → **Add New → Project** → import this repository.
2. Add the environment variables from section 1 (Production and Preview).
3. Deploy. Pushes to `main` deploy to production automatically.
4. Optional: Settings → Functions → **Region** to match your Supabase region (e.g. Singapore)
   for faster admin pages.
5. Add your domain(s) to the MapTiler key's **Allowed HTTP Origins**, one per line:

   ```
   kapenegros.vercel.app
   *.vercel.app
   ```

### Before launch

The admin dashboard shows a **Launch checklist** until the required items are done: demo shops
removed (one tap), at least 20 real shops published, map key, and the service key (needed for
self-service account deletion). Optional: contact email on `/privacy`, email notifications,
custom domain.

Visitors can read `/privacy` (privacy & community rules, Philippine Data Privacy Act) and delete
their own account at the bottom of `/saved`: this removes their account, reviews, lists and
pending photos, releases claimed shops (they stay verified) and keeps approved photos without the
name. Admin accounts can't delete themselves there.

## 5. Add real coffee shops

- **From OpenStreetMap (no computer needed):** add repository secrets `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` (GitHub → Settings → Secrets and variables → Actions), then
  **Actions → Import from OpenStreetMap → Run workflow** (try _Dry run_ first). Places arrive
  as drafts; safe to re-run (only untouched drafts are refreshed).
- **Review them:** `/admin/review` shows one draft at a time: pick the type, enter the latte price
  or tap a tier, then Publish, "Not a coffee shop", or Skip.
- **By hand:** `/admin/shops/new`.
- **From visitors:** suggestions and claims appear in `/admin/submissions`.

Locally: `npm run import:osm -- --dry-run`, then `npm run import:osm`.

## 6. Develop locally

Requires Node.js 22.

```bash
npm install
cp .env.example .env.local   # fill in the keys
npm run dev                  # http://localhost:3000
```

| Command                                 | What it does                                                       |
| --------------------------------------- | ------------------------------------------------------------------ |
| `npm run lint` / `typecheck` / `format` | ESLint, TypeScript, Prettier                                       |
| `npm test`                              | Vitest unit tests (`tests/`)                                       |
| `npm run e2e`                           | Production build + Playwright smoke tests (`e2e/`, no keys needed) |
| `npm run db:test`                       | Migrations + seed + RLS/search tests on a local PostGIS database   |
| `npm run import:osm`                    | OpenStreetMap import (`--dry-run`, `--file`, `--save`)             |
| `npm run db:push` / `db:types`          | Apply migrations / regenerate `lib/db/types.ts` (Supabase CLI)     |

`npm run db:test` needs PostgreSQL with PostGIS and `PGHOST`/`PGPORT`/`PGUSER` (and
`PGPASSWORD`) set; it uses a small shim that fakes Supabase's `auth`/`storage` schemas.

**CI:** [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs lint, types, formatting,
unit tests, database tests (PostGIS service) and the Playwright smoke tests on every push to
`main` and every pull request.

## 7. Project layout

```
app/                Next.js routes: map (/), /shop/[slug], /suggest, /claim/[slug], /login,
                    /admin/*, manifest, sitemap, robots, offline page
components/         UI: explore (map shell, list, sheet), map, shop, forms, admin, ui
hooks/              Client hooks (URL state, shops query, media query, …)
lib/                Framework-free logic: db/ (data layer), filters, hours, osm, validation, …
lib/supabase/       Browser, server and service-role clients
scripts/            import-osm.ts
supabase/           migrations/, seed.sql, tests/
public/             icons, service worker (sw.js)
e2e/, tests/        Playwright smoke tests, Vitest unit tests
```

## Credits

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL); map
tiles © [MapTiler](https://www.maptiler.com/copyright/). Shops imported from OpenStreetMap show
an attribution on their page.
