# M-Pesa STK Push setup (Lipa Na M-Pesa Online)

With STK Push switched on, a client who books gets an **M-Pesa PIN prompt on
their phone** for the deposit. They enter their PIN and the payment, with its
M-Pesa receipt number, appears on the booking in the admin automatically.
Magdalene can also send a prompt for a deposit or the balance from any
appointment card.

Until the keys below are set, the site keeps working exactly as before (the
client sends money to the M-Pesa number and pastes the confirmation message).

---

## 1. Decide which M-Pesa account receives the money

| You have | Use | `MPESA_TRANSACTION_TYPE` | `MPESA_SHORTCODE` | `MPESA_TILL_NUMBER` |
|---|---|---|---|---|
| A **Paybill** | Paybill | `CustomerPayBillOnline` | the Paybill number | leave empty |
| A **Buy Goods Till** | Till | `CustomerBuyGoodsOnline` | the **Head Office / Store number** of the till (not the till itself) | the Till number |

A personal M-Pesa line (07…) **cannot** receive STK Push payments. Safaricom
only allows a Paybill or a Till. If Magdalene has neither, she can apply for a
free **Lipa Na M-Pesa Buy Goods Till** at a Safaricom shop or through the
M-PESA for Business portal (ID + KRA PIN, usually a few days).

## 2. Test first in the sandbox (free, no real money)

1. Create an account at <https://developer.safaricom.co.ke> and **Create App**
   with **Lipa Na M-Pesa Sandbox** ticked.
2. Copy the app's **Consumer Key** and **Consumer Secret**.
3. Under **APIs → M-Pesa Express → Simulate**, the sandbox test shortcode is
   `174379` and the test passkey is shown there.
4. In Vercel → Project → **Settings → Environment Variables**, add:

```
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=<sandbox consumer key>
MPESA_CONSUMER_SECRET=<sandbox consumer secret>
MPESA_SHORTCODE=174379
MPESA_PASSKEY=<sandbox passkey>
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
MPESA_CALLBACK_SECRET=<run: openssl rand -hex 24>
NEXT_PUBLIC_SITE_URL=https://<your-domain>
```

5. Redeploy, make a test booking with your own Safaricom number and check that
   the prompt arrives. (Sandbox prompts reach real phones; no money moves.)

## 3. Go live

1. On the Daraja portal choose **Go Live**, pick the Paybill/Till from step 1
   and complete the verification (an OTP goes to the business admin's phone).
2. Safaricom emails the **production passkey**. Your production app gets its
   own **Consumer Key/Secret**.
3. Change the Vercel variables to the live values and set `MPESA_ENV=production`.
   For a till also set `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline` and
   `MPESA_TILL_NUMBER`.
4. Redeploy. **Admin → Availability → M-Pesa payments** should say
   *Switched on (live payments)*.
5. Make one small real booking (e.g. a KES 10 test service) to confirm the
   money lands and the receipt shows on the booking.

## How it works (for developers)

- `src/lib/mpesa.ts`: Daraja client (OAuth token cache, STK push, STK query, callback parsing).
- `src/lib/payments.ts`: decides the amount **on the server** (deposit % from
  settings, or the balance), records each request in the `MpesaPayment` table,
  and applies results idempotently (a repeated callback never double-counts).
- `POST /api/payments/mpesa/stk`: the client starts a deposit prompt
  (same-origin only, rate limited, max 5 prompts per booking per hour).
- `GET /api/payments/mpesa/status?id=`: the booking page polls this. If
  Safaricom's callback is slow or lost, it asks Safaricom directly (STK query),
  and expires prompts nobody answered after 3 minutes.
- `POST /api/payments/mpesa/callback/<MPESA_CALLBACK_SECRET>`: Safaricom posts
  results here. Daraja does not sign callbacks, so the long secret in the URL is
  what stops anyone else from faking a payment; keep it private and long.
- Admin → **Payments** lists every prompt with receipt numbers for reconciling
  against the M-Pesa statement.

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| "M-Pesa payments are not switched on yet" | A variable is missing, or `MPESA_CALLBACK_SECRET` is shorter than 16 characters, or `NEXT_PUBLIC_SITE_URL` is not set. |
| Prompt never arrives | Wrong shortcode/passkey pair, or the number is not Safaricom. Check Vercel → Logs for `STK push rejected`. |
| `Invalid Access Token` / auth failed | Consumer key/secret are from the other environment (sandbox vs production). |
| Paid but booking still shows unpaid | Callback URL not reachable. The status check will still pick it up within a minute; confirm `NEXT_PUBLIC_SITE_URL` is your real https domain. |
| `The initiator information is invalid` / wrong account | Till setup: `MPESA_SHORTCODE` must be the store/HO number and `MPESA_TILL_NUMBER` the till. |
