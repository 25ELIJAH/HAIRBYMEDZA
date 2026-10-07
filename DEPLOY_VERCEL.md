# Deploying to Vercel

Vercel is serverless, so the app needs a **hosted Postgres** database and **Blob
storage** for uploads (a local SQLite file cannot work there). The code is now
configured for both. Follow these steps once.

## 1. Get the fixed code into a GitHub repo
The current `hairbymedza` deployment builds from an **older repo**. Push this
folder (`C:\dev\medz-salon`) to GitHub and point Vercel at it:

```bash
cd C:\dev\medz-salon
git init            # if not already a repo
git add -A
git commit -m "Production-ready: Postgres + Blob + security"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/hairbymedza.git
git branch -M main
git push -u origin main
```
In Vercel → your project → **Settings → Git**, connect this repo (or import it
fresh and delete the old project).

## 2. Create a Postgres database (free)
Use **Neon**, added from Vercel → Storage (see **DATABASE.md** for why and the
exact steps). Copy two connection strings:
- **Pooled** (the `-pooler` host) → `DATABASE_URL`
- **Direct** (the non-pooler host) → `DIRECT_URL`

## 3. Create a Vercel Blob store
Vercel → your project → **Storage → Create → Blob**. This auto-adds the
`BLOB_READ_WRITE_TOKEN` environment variable.

## 4. Set environment variables in Vercel
Project → **Settings → Environment Variables** (Production + Preview):

| Variable | Value |
|---|---|
| `DATABASE_URL` | pooled Postgres URL |
| `DIRECT_URL` | direct Postgres URL |
| `AUTH_SECRET` | run `openssl rand -base64 48` |
| `ADMIN_LOGIN_PATH` | the owner's private sign-in address, e.g. `/medza-desk-4821` (letters, numbers, `-`; bookmark it). Without it the address is `/owner-desk` |
| `ADMIN_EMAIL` | your admin email |
| `ADMIN_PASSWORD` | a strong passphrase |
| `SALON_NAME`, `SALON_LOCATION`, `WHATSAPP_NUMBER`, `OWNER_EMAIL` | your details |
| `WEB3FORMS_ACCESS_KEY`, `NEXT_PUBLIC_WEB3FORMS_KEY`, `NEXT_PUBLIC_OWNER_EMAIL` | your Web3Forms values |
| `DEV_WHATSAPP` | footer credit number |
| `BLOB_READ_WRITE_TOKEN` | added automatically in step 3 |
| `NEXT_PUBLIC_SITE_URL` | your live address, e.g. `https://hairbymedza.co.ke` (SEO + card payment return) |
| `SALON_TIMEZONE` | `Africa/Nairobi` (optional, this is the default) |
| `PAYSTACK_SECRET_KEY` | Paystack secret key, see **PAYMENTS_SETUP.md** (optional; leave out to keep manual deposits) |
| `MPESA_NUMBER` | `0701508259`, the salon's M-Pesa number (used when seeding) |

## 5. Create the tables + seed (run once, locally)
> The Vercel build (`npm run vercel-build`) now runs `prisma db push` itself,
> so new tables (such as `MpesaPayment`) are created automatically on deploy.
> It never drops data: a change that would delete data makes the build fail
> instead. You still need to **seed once** for a brand-new database.

With the same `DATABASE_URL`/`DIRECT_URL` in your local `.env`:
```bash
npx prisma db push      # creates the tables in Postgres
npm run db:seed         # adds services, hours, settings, admin
```

## 6. Deploy
Push to `main` (or click **Redeploy** in Vercel). The build runs
`prisma generate && prisma db push && next build`. Visit your domain — it should load.

> **Important:** make sure the Vercel project's `DATABASE_URL` points at the
> same database you seeded and have always used. If an older deployment wrote
> bookings to a different database (or to a SQLite file, which Vercel wipes on
> every deploy), those bookings will not appear in this admin. See
> ASSESSMENT.md → "Why old bookings were missing".

---

### Notes
- The admin area **refuses to run** if `AUTH_SECRET` is missing/short in
  production — that's intentional. Set it (step 4). Builds themselves no
  longer need it, so preview deployments without secrets still build.
- Schema sync (`prisma db push`) only runs on **production** deployments.
  Previews never touch the database schema.
- Uploaded photos go to Vercel Blob and persist. Locally they fall back to
  `./public/uploads`.
- For higher traffic, back the rate limiter with Upstash Redis (see SECURITY.md).
