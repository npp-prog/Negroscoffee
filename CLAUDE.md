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
  `tier`, `open`, `city`, `shop`. Read with `useExploreState()`; it writes via the History API
  (filters replace, selecting a shop pushes).
- Map: `components/map/map-view.tsx` (client-only, `next/dynamic` with `ssr: false`). Pins are
  HTML markers clustered with `supercluster`. MapLibre's worker URL is set explicitly
  (`setWorkerUrl`) because bundling breaks its default lookup. Keep the attribution control visible.
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
- `/admin/review`: one-card-at-a-time draft review (type, latte price or tier, Publish / "Not a
  coffee shop" (hidden) / Skip), ordered by province → town → name. `quickReviewShop()` refuses to
  publish without type, tier/price and province.
- Photo URLs: build with `shopPhotoUrl(SUPABASE_URL, path, size?)`; never create a Supabase client
  during render just for URLs.
- `supabase/seed.sql` includes 10 fictional demo shops (slugs `demo-*`). Remove before launch:
  `delete from public.shops where slug like 'demo-%';`

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
- Later milestones: `npm run e2e` (Playwright)

## Database notes

- Migrations: `supabase/migrations/` (core schema → RLS + search RPCs → storage buckets → explicit
  API grants). The grants file restores Supabase's standard table privileges for projects created
  with "automatically expose new tables" off; RLS policies still decide row access.
- Search: `shops_near(lat, lng, radius_m, types, tiers, city, q)` and
  `shops_in_bbox(min_lng, min_lat, max_lng, max_lat, …)`; both return published shops only.
  Use them through `lib/db/shops.ts`, never raw.
- `shop_cards` view = flat card shape (lat/lng, city, cover photo); `security_invoker` so RLS applies.
- Tier: `public.price_tier_for()` + trigger auto-fills `price_tier` when null; mirrors `lib/tier.ts`.
- Roles live in `profiles.role`; only admins can change a role (trigger `profiles_guard_role`).
  Make the first admin in the SQL editor: `update profiles set role = 'admin' where id = '<uuid>';`
- Storage buckets: `shop-photos` (public), `submission-proofs` (private, uploads under `claims/` or `suggestions/`).
