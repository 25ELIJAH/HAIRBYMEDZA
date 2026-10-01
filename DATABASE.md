# Database: recommendation and setup

## Recommendation: Neon Postgres, connected through Vercel

All client data (customers, bookings, payments, services, hours, settings)
lives in one **PostgreSQL** database that the app talks to through Prisma. For
this salon over the long term, the best fit is **Neon**, added from inside
Vercel.

| Need | Why Neon fits |
|---|---|
| Always on | Free databases **are not paused** for inactivity. When idle they scale down and wake on the next visit (the first request after a quiet spell can take about a second). |
| Cost | The free plan easily holds years of bookings for a one-person salon. Upgrade only for longer backup history or more capacity. |
| Fits this code | The app is already built for Postgres + Prisma, with pooled and direct connections, so nothing needs rewriting. |
| Simple to run | Added from the Vercel dashboard, with billing and connection settings in one place. No server to look after. |
| Safety | Point-in-time restore lets you rewind the database after a mistake (how far back depends on the plan), and you can make a *branch*, a full copy, to test changes safely. |

### Why not the others

- **Supabase:** also Postgres and works with this code, but **free projects are
  paused after about a week without activity**, which would take the booking
  site down. Its extra features (its own logins, storage, realtime) aren't used
  here. It's a fine choice only on the paid plan.
- **Firebase / MongoDB:** not relational. Moving would mean rewriting the
  booking, availability and payment logic. No benefit for this project.
- **SQLite file on Vercel:** Vercel wipes local files on every deploy, so
  bookings would vanish. This is very likely how bookings from an earlier
  version of the site were lost.

## Setup (once)

1. Vercel → your project → **Storage** → **Create Database** → **Neon**
   (Postgres). Pick the region closest to Kenya that's offered (a European
   region such as Frankfurt is usually lowest latency), then connect it to the
   project for **Production** and **Preview**.
2. Vercel adds the connection variables to the project. Make sure these two
   exist (copy the values from the Neon variables Vercel created if the names
   differ):
   - `DATABASE_URL` = the **pooled** connection string (host contains
     `-pooler`), ending in `?sslmode=require&pgbouncer=true`
   - `DIRECT_URL` = the **direct (unpooled)** connection string
3. Redeploy. The production build creates all tables automatically
   (`scripts/db-sync.mjs` runs `prisma db push`, which never deletes data).
4. Fill it once from your computer, with the same two URLs in a local `.env`:
   ```bash
   npm run db:seed     # services, opening hours, settings (M-Pesa 0701508259), admin login
   ```
5. Sign in to the admin and check **Availability** (hours, address, deposit %).

## Moving existing data

**If the current `DATABASE_URL` already points at Neon,** keep it. Nothing to
move.

**If it points at another Postgres** (for example Supabase), copy everything
across in one go (needs the Postgres tools installed):

```bash
pg_dump  "<OLD DIRECT_URL>" --no-owner --no-acl -Fc -f medza.dump
pg_restore --no-owner --no-acl -d "<NEW DIRECT_URL>" medza.dump
```

Then point `DATABASE_URL` / `DIRECT_URL` in Vercel at the new database and
redeploy.

**If the old data isn't in any database** (for example an old SQLite build),
re-enter it with **Admin → Customers → Import past clients** and **Admin →
Appointments → + Add booking**.

## Backups

- **Built in:** the Neon dashboard's restore (point-in-time) and branching.
- **Your own copy:** download **Export CSV** from Admin → Customers and Admin →
  Appointments once a month and keep it somewhere safe (e.g. Google Drive).
