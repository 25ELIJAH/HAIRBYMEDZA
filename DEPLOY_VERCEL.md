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
**Neon** (https://neon.tech) or **Supabase** (https://supabase.com). After
creating it, copy two connection strings:
- **Pooled** (Neon: the `-pooler` host / Supabase: port `6543`) → `DATABASE_URL`
- **Direct** (Neon: non-pooler host / Supabase: port `5432`) → `DIRECT_URL`

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
| `ADMIN_EMAIL` | your admin email |
| `ADMIN_PASSWORD` | a strong passphrase |
| `SALON_NAME`, `SALON_LOCATION`, `WHATSAPP_NUMBER`, `OWNER_EMAIL` | your details |
| `WEB3FORMS_ACCESS_KEY`, `NEXT_PUBLIC_WEB3FORMS_KEY`, `NEXT_PUBLIC_OWNER_EMAIL` | your Web3Forms values |
| `DEV_WHATSAPP` | footer credit number |
| `BLOB_READ_WRITE_TOKEN` | added automatically in step 3 |

## 5. Create the tables + seed (run once, locally)
With the same `DATABASE_URL`/`DIRECT_URL` in your local `.env`:
```bash
npx prisma db push      # creates the tables in Postgres
npm run db:seed         # adds services, hours, settings, admin
```

## 6. Deploy
Push to `main` (or click **Redeploy** in Vercel). The build runs
`prisma generate && next build`. Visit your domain — it should load.

---

### Notes
- The app **refuses to build** if `AUTH_SECRET` is missing/short in production —
  that's intentional. Set it (step 4) and the build succeeds.
- Uploaded photos go to Vercel Blob and persist. Locally they fall back to
  `./public/uploads`.
- For higher traffic, back the rate limiter with Upstash Redis (see SECURITY.md).
