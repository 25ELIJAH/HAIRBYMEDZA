# Hair by Medza: site assessment and changes

_October 2026_

This file covers what was found on the site, what has been changed, and what is
still recommended before and after launch. The two things the owner asked for
were online payments (now Paystack) and getting past clients to show in the admin. Both are
done. The rest of the file covers polish and the remaining risks.

---

## 1. Why past bookings and clients were missing from the admin

There was no single cause. Five separate problems all made bookings look
missing. Each one is now fixed:

| # | Problem | Effect | Fix |
|---|---|---|---|
| 1 | **The spam trap ate real bookings.** The hidden anti-bot field was named `company`. Chrome, Safari and password managers fill "company/organisation" fields automatically, so a real client using autofill was treated as a bot. The booking was **thrown away without a trace**, yet the client saw "Thank you" and the owner still got the Web3Forms email. | Owner gets an email but the booking is not in the admin. This fits the reported symptom exactly. | Field renamed to something browsers never autofill. Anything the filter still catches is **saved**, not dropped, under **Appointments → "held by the spam filter"**, with a one-tap **Restore**. |
| 2 | **"All" showed only the 100 oldest bookings.** The list was sorted oldest-first and cut off at 100. | Once there were more than 100 bookings, new ones never appeared under "All". | Real pagination, newest first, with every booking reachable. |
| 3 | **Past bookings disappeared from the default view.** "Upcoming" hides past dates, and a past booking that was never marked completed or cancelled showed up in no useful view. Revenue only counts completed bookings, so revenue was under-reported too. | Clients the owner served look as if they are missing. | New **Needs attention** and **Past** views. Dashboard banner: "N past bookings are still pending". |
| 4 | **One client was split into several records.** "0712…", "+254712…" and "254712…" were saved as different customers. | A client's history is scattered, and visit counts and spend are wrong. | Phone numbers are now stored in one format (`2547…`), returning clients are matched whatever format they type, and a **Find & merge duplicates** button in Customers fixes existing records. |
| 5 | **The server clock was in UTC, not Nairobi time.** Vercel runs in UTC, so between midnight and 3 am "today" was still yesterday. | Bookings near midnight landed on the wrong day in the dashboard, and late-night slots could be offered in the past. | All "today/now" logic uses Africa/Nairobi. Bookings for a time that has already passed are rejected. |

### Bookings this code cannot bring back
`DEPLOY_VERCEL.md` says the live site used to build from an **older repo**. If
that version saved to a different database, or to a SQLite file (Vercel wipes
those on every deploy), those bookings are not in the current database and no
code change can bring them back. To recover them:

1. In Vercel → Settings → Environment Variables, check that `DATABASE_URL`
   has always pointed at the same database. If an older database
   still exists, its data can be exported and imported.
2. Otherwise, use the booking emails (Web3Forms sent one per booking) and the
   new tools:
   - **Customers → Import past clients**: paste `Name, Phone, Email, Notes` rows
     from Excel, Google Sheets or the emails.
   - **Appointments → + Add booking**: re-enter an old booking (set status
     *Completed* and the amount paid, and tick "allow overlap").

## 2. Payments with Paystack (done)

- At the review step the client chooses **"Pay deposit now"** (recommended) or
  **"Book now, pay later"**. After booking, an **M-Pesa PIN prompt** pops up on
  their phone through Paystack, or they can tap **"Pay by card instead"**. The
  page waits for the payment and confirms it.
- The amount is always worked out **on the server** from the service price and
  the deposit % set in Admin → Availability. The browser cannot change it.
- Every booking card in the admin shows its payment history, with **Request
  deposit / balance** buttons and **Record cash / manual payment**.
- New **Payments** page: every online payment with its reference and the last
  30 days' total, for checking against the Paystack dashboard.
- Built to be reliable and safe:
  - Paystack's webhook is signature-checked and every result is verified with
    Paystack before it counts.
  - A repeated webhook or a page reload is never counted twice.
  - Payments in the wrong currency or for less than the amount due are refused.
  - Requests from other websites are refused, and attempts are rate limited.
- **Receiving number: 0701508259.** It is the default M-Pesa number for manual
  deposits, and the payout number to give Paystack if M-Pesa payouts are offered
  (otherwise a bank account). See **PAYMENTS_SETUP.md**.
- Until a Paystack key is added, the site keeps the manual "send to M-Pesa
  0701508259 and paste the message" method, so nothing breaks.

## Database: Neon Postgres (recommended)

Long term, the data should live in **Neon Postgres**, added from Vercel. Free
databases there aren't paused for inactivity, unlike Supabase's free tier,
which would take the site down. It needs no code changes, and it has
point-in-time restore. Full reasoning and setup steps are in **DATABASE.md**.

## 3. Other improvements made

- **Client profiles**: click any client to see their full booking history,
  totals and notes, edit their details, WhatsApp them, or book them again.
- **Search** on Appointments and Customers by name, phone (any format), email
  or notes.
- **CSV export** of all clients and all bookings, for backups or Excel.
  Exported text is protected against spreadsheet formula injection.
- **+ Add booking** for walk-ins and WhatsApp or phone bookings.
- **SEO**:
  - canonical URL, Open Graph and Twitter previews (link previews on WhatsApp)
  - `sitemap.xml`, and a dynamic `robots.txt` that points to it
  - structured data that tells Google this is a **hair salon** in Nairobi,
    with opening hours, prices and M-Pesa accepted
- The booking page used the hard-coded text "along Ngong Road". It now shows
  the address set in admin.
- Restored `.gitignore` (it had been deleted, which risks committing `.env`
  with the database password) and `.env.example`, now documenting the new
  variables.
- Production deploys create new database tables automatically
  (`scripts/db-sync.mjs` runs `prisma db push`, which never deletes data).
  Preview deploys never touch the database.

## 4. Recommended next steps (not done yet), in priority order

**Before launch**
1. **Activate Paystack and switch to the live key** (PAYMENTS_SETUP.md). Do one real
   KES 10 test.
2. **Set `NEXT_PUBLIC_SITE_URL`** to the real domain. Ideally buy a `.co.ke`
   domain (about KES 1,000 a year) and connect it in Vercel.
3. **Replace the Unsplash stock photos with Magdalene's own work.** This is the
   biggest trust factor for a braiding business. Add a gallery of real clients
   (with permission) and link Instagram and TikTok.
4. **Create a Google Business Profile** (free) with the same name, phone and
   hours. Ask happy clients for reviews.
5. Re-enter or import clients from before the website (section 1).

**Soon after**
6. **Real client notifications.** Client messages are only *logged*
   (`NotificationLog`) and never sent. Add SMS through Africa's Talking (about
   KES 0.8 per SMS) or the WhatsApp Cloud API for confirmations and a
   **reminder 24 hours before** each appointment. This cuts no-shows.
7. **Release unpaid holds.** A "pay later" booking that is never confirmed
   blocks its slot forever. Suggested rule: free the slot after 12 hours with
   no deposit and no confirmation.
8. **Send the owner's booking email from the server.** It is currently sent
   from the client's browser through Web3Forms, so an ad blocker can stop it.
   A server-side sender such as Resend (free tier) is more reliable.
9. **Client self-service**: a private link in the confirmation to view,
   reschedule or cancel.
10. **Use a shared rate limiter** (Upstash Redis, free tier). The current one
    is in memory, and each Vercel instance has its own copy.

**Later**
11. Two-factor login for the admin.
12. Move from `prisma db push` to versioned `prisma migrate` once the schema
    settles.
13. The "Home visit fee" setting is not used anywhere: out-call prices are set
    per service. Remove it, or use it to calculate out-call prices.
14. Vercel Analytics, to see where bookings come from.
15. Check the Neon point-in-time restore window, and export a CSV monthly as an
    extra backup.

## 5. Go-live checklist

- [ ] `DATABASE_URL` / `DIRECT_URL` point at the production database that holds all past data
- [ ] `AUTH_SECRET` is set (32+ random characters) and the admin password is strong
- [ ] `NEXT_PUBLIC_SITE_URL` = real https domain
- [ ] Live `PAYSTACK_SECRET_KEY` set, webhook URL added in Paystack, payout account (0701508259 or bank) confirmed, and one small real payment received (PAYMENTS_SETUP.md)
- [ ] Database on Neon via Vercel, seeded once (DATABASE.md)
- [ ] Admin → Availability: M-Pesa number is 0701508259
- [ ] Admin → Availability: correct hours, address, phone, deposit %
- [ ] Real photos uploaded for each service
- [ ] Customers → **Find & merge duplicates** run once
- [ ] Appointments → **Needs attention** cleared (mark past bookings completed or cancelled)
- [ ] Test a booking on a phone: in-call and out-call, pay now and pay later
