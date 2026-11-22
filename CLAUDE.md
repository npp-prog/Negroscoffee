# CLAUDE.md — Kape Negros

Map-first web app listing coffee shops on Negros Island (Philippines), categorized by
price tier and shop type. See PLAN.md for milestones. Source plan: the
"Negros Coffee Map — Plan & Claude Code Build Prompt" doc.

## Stack

- Next.js 16 (App Router, Turbopack, `cacheComponents` on) + TypeScript strict. Next 16 differs from
  older versions: read `node_modules/next/dist/docs/` before using an API (see AGENTS.md).
  Request APIs (`params`, `searchParams`, `cookies()`) are async only.
- Tailwind CSS v4 + shadcn/ui (Radix, `components/ui/`, hand-added: the shadcn registry may be
  unreachable) + lucide-react + Framer Motion (the `motion` package, `import from "motion/react"`)
- Theming: `next-themes` (class strategy), tokens in `app/globals.css`, `ThemeToggle` component
- MapLibre GL JS via `react-map-gl/maplibre`, MapTiler vector style (`NEXT_PUBLIC_MAPTILER_KEY`)
- Supabase: Postgres + PostGIS, Auth (magic link + Google), Storage (`shop-photos` bucket)
- Zod for validation, TanStack Query for client fetching
- Vitest (unit), Playwright (smoke), ESLint + Prettier
- Deploy: Vercel; installable PWA

## Conventions

- All data access goes through `lib/db/*` using generated types in `lib/db/types.ts`.
  Keep it free of Next.js imports so the future Expo app can reuse it.
- Supabase clients live in `lib/supabase/` (browser, server, service-role admin). The
  service-role client is server-only; never import it from client components.
- Schema changes = new SQL file in `supabase/migrations/` (timestamped). Never edit an applied migration.
- Filters and selected shop are stored in the URL query string (`lib/filters.ts`): `q`, `type`,
  `tier`, `open`, `new`, `city`, `shop`. "New" = `shops.published_at` within 14 days
  (`lib/new.ts`); `published_at` is set only by trigger (migration `20261122000003`) when a shop
  becomes published. `NewBadge` decides in the browser (prerendered pages can't read the clock). Read with `useExploreState()`; it writes via the History API
  (filters replace, selecting a shop pushes).
- Map: `components/map/map-view.tsx` (client-only, `next/dynamic` with `ssr: false`). Pins are
  HTML markers clustered with `supercluster`. MapLibre's worker URL is set explicitly
  (`setWorkerUrl`) because bundling breaks its default lookup. Keep the attribution control visible.
  If the style fails before load (401/403 = key/domain refused, network error, or >15 s), MapView
  shows a notice with Retry; tile errors after load are ignored. Root layout preconnects to
  MapTiler and Supabase.
- Open-now logic lives in `lib/hours.ts` (Asia/Manila); the "Open now" filter runs client-side.
- Shop page `/shop/[slug]`: data via `getPublicShop()` in `app/shop/[slug]/data.ts` (`"use cache"`,
  `cacheLife("hours")`, tags `shop:<slug>` and `shops`). After admin edits call
  `revalidateTag(shopTag(slug))`. Open status and today's hours render client-side so cached HTML
  never goes stale. Unknown slugs stream the shop not-found page (200 + `noindex`; Next's
  documented behavior with Cache Components, where `dynamicParams` is unavailable).
- Time logic uses `Asia/Manila`.
- Never hardcode keys; use `.env.local`, document in `.env.example`.
- Google Places: store `google_place_id` only, no other Google data.
- Show OpenStreetMap attribution wherever OSM-imported data appears on the map. Shop pages with an
  `osm_id` show "Some details from © OpenStreetMap contributors".
- Public forms: `/suggest` (new shop; `?shop=<slug>` = correction) and `/claim/[slug]`. Zod schemas
  in `lib/validation.ts`; Server Actions validate, then insert via `lib/db/submissions.ts` using the
  visitor's own Supabase client (RLS applies, no read-back since anon can't SELECT submissions).
  Photos are resized in the browser and stored privately in `submission-proofs` (`claims/`,
  `suggestions/`); server caps 3 MB, `serverActions.bodySizeLimit` is 4 MB. Spam guard = honeypot
  `website_hp` + minimum fill time (`startedAt`, set after mount). Admins review in milestone 7.
- Auth: `/login` (magic link + Google via `signInWithOtp` / `signInWithOAuth`, PKCE) →
  `/auth/callback` exchanges the code; `proxy.ts` refreshes the session on `/admin` and `/login`.
  `getServerSupabase()` calls `await connection()` first (session code reads the clock, which
  prerenders and partial prefetches don't allow). `safeNext()` in `lib/auth.ts` blocks open redirects.
- Admin (`/admin`): `app/admin/layout.tsx` gates on `profiles.role = 'admin'` inside Suspense.
  Every admin Server Action calls `requireAdmin()` (actions are public endpoints); writes use the
  admin's own client (RLS admin policies), never the service role. After shop writes call
  `expireShops([slugs])` (`updateTag`) so public pages refresh. Data access: `lib/db/admin.ts`.
- Owners (`/owner`): verified owners (`profiles.role = 'owner'`, `shops.claimed_by` = them) edit
  description, latte price (tier follows it), hours, menu, phone/website/socials and photos of their
  own shops; changes go live. Migration `20261122000001_owner_editing.sql`: `owns_shop()`, owner
  RLS on shops/menu/photos/storage (`<shop_id>/…`), `shops_guard_owner_edit` trigger locks name,
  slug, type, status, pin, town, address, claim/verification (insufficient_privilege), and logs
  non-admin field edits to `shop_edits` (menu/photo edits logged by the app via `logShopEdit`).
  Actions that edit one shop use `requireShopEditor(shopId)` (admin or that shop's owner).
  Admin tools: "Recent owner edits" on the dashboard; Owner panel in the shop editor uses RPCs
  `admin_link_owner(shop, email)` / `admin_unlink_owner` / `admin_owner_email`. Owners hitting
  /admin are redirected to /owner. Data access: `lib/db/owner.ts`.
- Reviews & saved shops (migration `20261122000002_reviews_favorites.sql`): `reviews` (1–5 stars +
  text, one per user per shop, `author_name` snapshot from `profiles.display_name`, status
  visible/hidden, `owner_reply`), guard trigger (authors edit rating/body, owners only the reply,
  admins moderate), `shops.rating_avg/rating_count` kept by trigger (visible only) and exposed on
  `shop_cards`; `saved_shops` (favorite/visited, private per user). Shop page: `ReviewsSection`
  starts from the cached list then refreshes client-side (pre-built pages serve one stale copy
  while regenerating); `SaveButtons` read/write own rows with the browser client. Don't call
  `router.refresh()` after actions on pre-built public pages (its RSC refetch can 404 and force a
  full reload). Pages: `/saved` (favorites, visited, display name), owner replies on
  `/owner/shops/[id]`, moderation at `/admin/reviews`. Data access: `lib/db/reviews.ts`.
- Email (migration `20261122000004`, `profiles.notify_email`): `lib/email/send.ts` (Resend HTTP
  API, no-op without `RESEND_API_KEY`, never throws), pure templates in `lib/email/templates.ts`,
  recipients in `lib/notifications.ts` (service role, server-only; looks up addresses with
  `auth.admin.getUserById`). Actions schedule sends with `after()` from `next/server`: new review
  (created, not edited) → shop owner; suggestion/correction/claim → admins (`NOTIFY_ADMIN_EMAILS`
  or admins with emails on); claim approve/reject → claimant (always). Toggle on `/saved`.
- Visitor photos (migration `20261122000005`): signed-in visitors upload via `AddPhoto` on the
  shop page (`addPhotoAction`) into private bucket `photo-submissions` (`<user_id>/…`) + a
  `photo_submissions` row (pending; RLS: own folder, published shops, 20/day trigger). Admins
  review at `/admin/photos`: approve copies the file into `shop-photos/<shop_id>/…` and inserts
  `shop_photos` with `credit` (display name) + `contributed_by`, then deletes the private file;
  reject deletes the file and keeps the row. Admin's own client throughout, no service role.
  Visitors see status and withdraw pending photos on `/saved`. Data access: `lib/db/photos.ts`.
- Owner insights (migration `20261122000006`): `shop_daily_stats` (shop × Manila day: views,
  map_opens, directions, contacts; no visitor data). Written only via security-definer RPC
  `track_shop_event(slug, kind)` (anon OK, published shops only; table privileges revoked);
  read by owners/admins (RLS) and via `shop_insights(shop_id, days)` (series, previous period,
  favorites/visited counts). Browser side: `trackOnce()` in `lib/track.ts` (once per tab session
  per shop+kind); `ShopTracker` on the shop page counts views and clicks on `data-track=
"directions" | "contact"` links; ExploreShell counts `map` when `state.shop` changes. Pure
  helpers in `lib/insights.ts` (tested); data in `lib/db/insights.ts`. UI: `InsightsCard` on
  `/owner/shops/[id]` (published shops), "Most viewed · last 7 days" on `/admin`. Chart bar color
  token `--chart-bar` (validated with the dataviz palette checker).
- Coffee lists (migration `20261122000007`): `shop_lists` (slug, title, description, status
  draft/published, sort_order, published_at by trigger) + `shop_list_items` (position, note).
  Public read of published lists/items (RLS), admins write with their own client. Data:
  `lib/db/lists.ts`. Public: `/lists`, `/lists/[slug]` (cached in `app/lists/data.ts`, tags
  `lists`, `list:<slug>` via `listTag()` in `lib/lists.ts`, plus `shops`; ItemList JSON-LD; OG
  image), "Featured in" chips on shop pages (`getPublicShop` also tags `lists`). Admin:
  `/admin/lists` + editor (`components/admin/list-editor.tsx`); actions call `expireLists()`.
  Publishing an empty list is refused; empty lists are hidden from `/lists`.
- `/admin/review`: one-card-at-a-time draft review (type, latte price or tier, Publish / "Not a
  coffee shop" (hidden) / Skip), ordered by province → town → name. `quickReviewShop()` refuses to
  publish without type, tier/price and province.
- PWA: `app/manifest.ts`, icons in `public/icons/` (rendered from the logo mark), `public/sw.js`
  (offline fallback `/offline` + cache-first `/_next/static` and icons; never caches pages, admin,
  Supabase or tiles), registered by `components/pwa-register.tsx` in production only. Bump
  `VERSION` in `sw.js` when changing caching. SEO: `app/sitemap.ts` (published shops, cached with
  tag `shops`), `app/robots.ts` (disallows /admin, /owner, /saved, /login, /auth/, /claim/).
- Photo URLs: build with `shopPhotoUrl(SUPABASE_URL, path, size?)`; never create a Supabase client
  during render just for URLs.
- `supabase/seed.sql` includes 10 fictional demo shops (slugs `demo-*`). Remove before launch:
  dashboard "Remove demo shops" (`removeDemoShopsAction`) or
  `delete from public.shops where slug like 'demo-%';`
- Launch: `lib/launch.ts` (pure checklist, tested) feeds `LaunchChecklist` on `/admin` (shown on top
  until required items pass). `/privacy` = privacy & community rules (`NEXT_PUBLIC_CONTACT_EMAIL`
  optional). Account deletion on `/saved` (`deleteAccountAction` → `deleteAccount()` in
  `lib/db/account.ts`, service role: removes private photo files, clears photo credits, then
  `auth.admin.deleteUser`; DB cascades do the rest, see `06_account_deletion.test.sql`). Not for
  admins. Redirects to `/?deleted=1` (`FlashNotice` toast). `app/error.tsx` is the friendly
  error page; `app/opengraph-image.tsx` is the default social image.

## Domain

- Price tier from 12 oz hot latte price (PHP): 1 Budget <100, 2 Mid-range 100–149,
  3 Premium 150–199, 4 Luxury 200+. Auto-suggested, admin can override.
- Shop type enum: `specialty`, `chain`, `kapihan`.
- Shop status: `draft` | `published` | `hidden`. Source: `admin` | `owner` | `import_osm`.

## Design tokens (CSS variables in `app/globals.css`)

| Token          | Light   | Dark      |
| -------------- | ------- | --------- |
| background     | #F6F1EA | #15100C   |
| surface        | #FFFFFF | #211913   |
| text           | #2B1D14 | #F3EAE0   |
| muted          | #8A7768 | #A8968A   |
| border         | #E7DED3 | #33271F   |
| accent         | #C8893B | #E0A458   |
| type-specialty | #5A3A22 | lightened |
| type-chain     | #C2613F | lightened |
| type-kapihan   | #6E8B6A | lightened |

- Fonts (next/font): Fraunces headings, Inter body/UI, tabular numerals for prices.
- Radius 16–20px, soft layered shadows, translucent blurred top bar over the map.
- Motion: Framer Motion springs, 150–250ms, respect `prefers-reduced-motion`.
- Accessibility: WCAG AA, focus rings, 44px touch targets, mobile-first down to 360px.

## Commands

- `npm run dev` — local dev server
- `npm run lint` / `npm run typecheck` / `npm run format`
- `npm run db:push` — apply migrations to the linked Supabase project (`npx supabase link` first)
- `npm run db:types` — regenerate `lib/db/types.ts` from the linked project
- `npm run db:test` — apply shim + migrations + seed to a local Postgres with PostGIS and run
  `supabase/tests/*.test.sql` (needs `PGHOST`/`PGPORT`/`PGUSER`). The shim fakes Supabase's
  `auth`/`storage`/roles; it is test-only.
- `npm run db:types:local` — regenerate types from `$TEST_DATABASE_URL` (e.g. the test DB)
- `npm test` — Vitest unit tests in `tests/` (filters, open-now)
- `npm run import:osm` — import cafés from OpenStreetMap (Overpass, Negros province boundaries) as
  drafts keyed by `osm_id`. Flags: `--dry-run`, `--file <overpass.json>`, `--save <path>`. Needs
  `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Re-runs refresh only untouched
  drafts (`source = import_osm`, `status = draft`); curated shops are never overwritten. Mapping
  logic is pure in `lib/osm.ts` (tested); writes in `lib/db/osm-import.ts`.
  Also runnable from GitHub: Actions → "Import from OpenStreetMap" (`.github/workflows/import-osm.yml`,
  manual trigger, optional dry run; needs repo secrets `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).
  The script cycles through several Overpass endpoints with exponential backoff (up to `OVERPASS_DEADLINE_MIN`, default 25) and fails if OSM returns no places; the workflow uses `set -o pipefail` so a failed import shows red.
- `npm run e2e` — production build + Playwright smoke tests in `e2e/` (desktop + mobile), run with
  no Supabase/MapTiler keys so pages must degrade gracefully. CI: `.github/workflows/ci.yml` (lint,
  types, format, unit, `db:test` on a PostGIS service, e2e).

## Database notes

- Migrations: `supabase/migrations/` (core schema → RLS + search RPCs → storage buckets → explicit
  API grants → owner editing → reviews & saved shops → published_at → email prefs → visitor photos → shop insights → coffee lists). The grants file restores Supabase's standard table privileges for projects created
  with "automatically expose new tables" off; RLS policies still decide row access.
- Search: `shops_near(lat, lng, radius_m, types, tiers, city, q)` and
  `shops_in_bbox(min_lng, min_lat, max_lng, max_lat, …)`; both return published shops only.
  Use them through `lib/db/shops.ts`, never raw.
- `shop_cards` view = flat card shape (lat/lng, city, cover photo); `security_invoker` so RLS applies.
- Tier: `public.price_tier_for()` + trigger auto-fills `price_tier` when null; mirrors `lib/tier.ts`.
- Roles live in `profiles.role`; only admins can change a role (trigger `profiles_guard_role`).
  Make the first admin in the SQL editor: `update profiles set role = 'admin' where id = '<uuid>';`
- Storage buckets: `shop-photos` (public), `submission-proofs` (private, uploads under `claims/` or `suggestions/`),
  `photo-submissions` (private, visitor photos awaiting review under `<user_id>/`).
