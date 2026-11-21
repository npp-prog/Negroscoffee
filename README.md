# Kape Negros

A map-first web app listing every coffee shop on Negros Island, Philippines, by price tier and shop type.

Status: Phase 1 in progress (see [PLAN.md](./PLAN.md)). Full setup, migration and deploy docs come in milestone 8.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase + MapTiler keys
npm run dev                  # http://localhost:3000
```

Scripts: `npm run lint`, `npm run typecheck`, `npm run format`, `npm run build`.

## Supabase auth setup (one time)

1. Authentication → URL Configuration: set **Site URL** to your site, and add
   `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback` to **Redirect URLs**.
2. Authentication → Providers: enable **Email** (magic link) and, optionally, **Google** (needs a
   Google OAuth client ID/secret; authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`).
3. Sign in once at `/login`, then make yourself admin in the SQL editor:
   `update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`
