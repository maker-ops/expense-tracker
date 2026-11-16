# Expense Tracker

Small self-hosted, single-user expense tracker. SvelteKit 3 (SSR + API routes in one app), SQLite (better-sqlite3 + Drizzle), Tailwind, installable PWA. One container, no external services.

## Run locally

```bash
npm install
npm run seed          # optional: demo people, groups and ~2 months of expenses (uses .env)
npm run dev           # reads .env
```

`.env` (copy `.env.example`): `APP_PASSWORD`, `EARNINGS_PIN` (4-6 digits), `SESSION_SECRET` (32+ chars), `DATABASE_PATH`.

Docker:

```bash
docker compose up --build     # http://localhost:3000, demo password "demo-password", PIN 1234
```

(Compose reads a local `.env` too; its values override the defaults.) `SEED_DEMO=1` fills an empty database with sample data. Remove it for real use.

## Deploy on Coolify

1. Push this repo to Git (GitHub/GitLab).
2. Coolify: **Project → + New Resource → Public/Private Repository**, pick the repo and branch.
3. **Build Pack: Dockerfile**. Set **Ports Exposes** to `3000`.
4. **Domains**: set `https://expenses.yourdomain.com` (DNS A record pointing to the server). HTTPS is required for PWA install and for the secure session cookie.
5. **Persistent Storage → Add volume**: name `expenses-data`, destination path `/data`.
6. **Environment Variables** (runtime only; do not tick "build variable"):

   | Variable | Value |
   |---|---|
   | `APP_PASSWORD` | your login password |
   | `EARNINGS_PIN` | 4-6 digit PIN for the hidden menu |
   | `SESSION_SECRET` | output of `openssl rand -hex 32` |
   | `TZ` | `Europe/Sofia` |
   | `DATABASE_PATH` | `/data/app.db` |
   | `ORIGIN` | `https://expenses.yourdomain.com` (required, else login POST gets 403 behind the proxy) |
   | `ADDRESS_HEADER` | `X-Forwarded-For` |
   | `XFF_DEPTH` | `1` (number of proxies in front; 2 if also behind Cloudflare) |

   `ADDRESS_HEADER`/`XFF_DEPTH` make the login rate limit see the real client IP. Set them only behind a proxy.
7. **Deploy**. Health check: `/api/health` (also built into the image). Migrations run automatically on start.
8. Install: iOS Safari → Share → *Add to Home Screen*; Android Chrome → *Install app*.

If `/data` is a host bind mount instead of a named volume, give it to the container user: `chown -R 10001:10001 <host path>`.

Backup: Settings → Export JSON/CSV, or back up the `/data` volume.

## How it works

- **Auth**: password hashed (bcrypt) at startup; HMAC-signed httpOnly, SameSite=Strict, Secure cookie, 30 days; 5 failed logins / 15 min / IP. `COOKIE_SECURE=false` is only for plain-http testing.
- **Hidden earnings**: long-press the logo 1.5 s, or tap the month total 5 times, then enter the PIN. The server returns a session-bound token valid for 10 minutes (`EARNINGS_TTL_SECONDS`), kept only in `sessionStorage` (per tab). Every `/api/earnings/*` call needs the session **and** this token (otherwise 404); exports/imports include earnings only when it is valid. The UI code is lazy-loaded and absent from normal views. Tokens are stateless, so "Lock" discards it client-side but a copied token stays valid until its expiry.
- **Soft delete**: deleted rows are kept 7 days; the 5 s Undo restores them.
- Amounts are integer cents; totals sum all rows regardless of currency (change currency in Settings applies to new entries).
- Service worker caches the JS/CSS shell; pages and `/api` always go to the network, with an offline banner and offline page.

## Layout

`src/lib/server` (db, schema, auth, queries, seed) · `src/routes` (pages + `api/*`) · `src/lib/components` · `drizzle/` (migrations; regenerate with `npm run db:generate`) · `scripts/` (icons, seed).
