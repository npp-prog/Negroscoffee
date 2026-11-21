# Kape Negros — Phase 1 (MVP) Plan

Map-first web app (installable PWA) listing every coffee shop on Negros Island
(Negros Occidental + Negros Oriental), filterable by **price tier** and **shop type**.
Phase 2 (community) and Phase 3 (Expo mobile) reuse the same Supabase backend.

## Milestones

Each milestone ends with a commit and a short summary.

| #   | Milestone                                              | Done when                                                                                      |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1   | Scaffold, design tokens, layout shell, dark mode       | `npm run dev` shows the app shell in light/dark; lint + typecheck pass                         |
| 2   | Supabase schema, RLS, seed cities, generated types     | Migrations apply cleanly; `shops_near` RPC works; types in `lib/db/types.ts`                   |
| 3   | Map with pins, clustering, filters, list sync, near me | Filters in URL; pins colored by type with tier badge; bottom sheet on mobile, panel on desktop |
| 4   | Shop detail page                                       | `/shop/[slug]` SSR with metadata + OG image, open-now logic (Asia/Manila)                      |
| 5   | OSM import script + 10 sample shops                    | `npm run import:osm` upserts drafts by OSM id; `supabase/seed.sql` has demo shops              |
| 6   | Suggest and claim forms + submissions                  | `/suggest`, `/claim/[slug]` insert into `submissions` with Zod validation                      |
| 7   | Admin dashboard and editor                             | `/admin` shops table, editor with pin + photos + menu, submissions queue, counts               |
| 8   | PWA, SEO, tests, README, deploy                        | Manifest + SW, sitemap/robots, Vitest + Playwright green, README complete                      |

## Key decisions (defaults — change in CLAUDE.md if they change)

- App name: **Kape Negros** (placeholder)
- Price tiers by 12 oz hot latte (PHP): 1 Budget <100 · 2 Mid-range 100–149 · 3 Premium 150–199 · 4 Luxury 200+
- Shop types: `specialty`, `chain`, `kapihan`
- Map: MapLibre GL JS + MapTiler vector style
- Language: English only
- Launch focus: Bacolod and Dumaguete, data model covers all of Negros

## File tree (target)

```
.
├── app/
│   ├── layout.tsx                 # fonts, theme provider, toaster
│   ├── globals.css                # design tokens (light/dark)
│   ├── page.tsx                   # map home
│   ├── manifest.ts                # PWA manifest
│   ├── sitemap.ts / robots.ts
│   ├── shop/[slug]/
│   │   ├── page.tsx
│   │   └── opengraph-image.tsx
│   ├── suggest/page.tsx
│   ├── claim/[slug]/page.tsx
│   ├── about/page.tsx
│   ├── auth/                      # magic link + Google callback
│   └── admin/
│       ├── layout.tsx             # admin guard
│       ├── page.tsx               # dashboard counts
│       ├── shops/page.tsx         # table + bulk actions
│       ├── shops/[id]/page.tsx    # editor
│       └── submissions/page.tsx   # review queue
├── components/
│   ├── ui/                        # shadcn/ui
│   ├── map/                       # MapView, ShopPin, ClusterLayer, NearMeButton
│   ├── explore/                   # SearchBar, FilterChips, ResultsList, BottomSheet, SidePanel
│   ├── shop/                      # PhotoCarousel, TierBadge, TypeChip, OpenStatus, MenuPrices
│   ├── admin/
│   └── theme-toggle.tsx
├── lib/
│   ├── db/                        # shared data layer (reusable by Expo)
│   │   ├── types.ts               # generated Supabase types
│   │   ├── shops.ts               # queries
│   │   └── submissions.ts
│   ├── supabase/                  # browser / server / admin clients
│   ├── tier.ts                    # latte price → tier
│   ├── hours.ts                   # open-now (Asia/Manila)
│   ├── filters.ts                 # URL query <-> filter state
│   └── validation.ts              # Zod schemas
├── scripts/import-osm.ts
├── supabase/
│   ├── migrations/
│   └── seed.sql                   # cities + sample shops
├── public/                        # icons, sw.js, cup illustration
├── tests/                         # Vitest unit tests
├── e2e/                           # Playwright smoke test
├── .env.example
├── CLAUDE.md
└── README.md
```

## Secrets needed

| Variable                        | Where from                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project settings → API                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project settings → API                                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase → Project settings → API (server only, import script + admin actions) |
| `NEXT_PUBLIC_MAPTILER_KEY`      | maptiler.com → Account → Keys                                                  |
| `NEXT_PUBLIC_SITE_URL`          | Deployed URL (defaults to `http://localhost:3000`)                             |
