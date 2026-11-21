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
- Time logic uses `Asia/Manila`.
- Never hardcode keys; use `.env.local`, document in `.env.example`.
- Google Places: store `google_place_id` only, no other Google data.
- Show OpenStreetMap attribution wherever OSM-imported data appears on the map.

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
- Later milestones: `npm run e2e` (Playwright), `npm run import:osm`

## Database notes

- Migrations: `supabase/migrations/` (core schema → RLS + search RPCs → storage buckets).
- Search: `shops_near(lat, lng, radius_m, types, tiers, city, q)` and
  `shops_in_bbox(min_lng, min_lat, max_lng, max_lat, …)`; both return published shops only.
  Use them through `lib/db/shops.ts`, never raw.
- `shop_cards` view = flat card shape (lat/lng, city, cover photo); `security_invoker` so RLS applies.
- Tier: `public.price_tier_for()` + trigger auto-fills `price_tier` when null; mirrors `lib/tier.ts`.
- Roles live in `profiles.role`; only admins can change a role (trigger `profiles_guard_role`).
  Make the first admin in the SQL editor: `update profiles set role = 'admin' where id = '<uuid>';`
- Storage buckets: `shop-photos` (public), `submission-proofs` (private, uploads under `claims/` or `suggestions/`).
