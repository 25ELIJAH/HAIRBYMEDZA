# Taking payments with Paystack

The site takes deposits (and balances) through **Paystack**:

- **M-Pesa prompt:** after booking, the client gets an M-Pesa PIN prompt on
  their phone. They enter the PIN and the payment shows on the booking in the
  admin automatically.
- **Card:** the client can tap **"Pay by card instead"** to pay on Paystack's
  secure page and is brought back to the site afterwards.
- **From the admin:** any appointment card can send the client a deposit or
  balance prompt, or record a cash payment.

Paystack collects the money and **pays it out** to the account set in the
Paystack dashboard. The website never holds money or card details.

> **Receiving number: 0701508259.** This is the salon's M-Pesa number. It is
> shown to clients for manual payments (and used when online payments are
> off), and it is the number to give Paystack as the payout destination if
> Paystack offers M-Pesa payouts on the account (see step 4).

Until a Paystack key is added, the site keeps the manual option: "send the
deposit to M-Pesa 0701508259 and paste the confirmation".

---

## 1. Create the Paystack account

1. Sign up at <https://paystack.com> and choose **Kenya**.
2. You land in **test mode** straight away. No real money moves, so you can
   try everything first.

## 2. Test on the live site (no real money)

1. Paystack dashboard → **Settings → API Keys & Webhooks**. Copy the **Test
   Secret Key** (`sk_test_…`).
2. In the same page set the **Test Webhook URL** to
   `https://<your-domain>/api/payments/paystack/webhook`.
3. In Vercel → Project → Settings → Environment Variables add:
   ```
   PAYSTACK_SECRET_KEY=sk_test_…
   NEXT_PUBLIC_SITE_URL=https://<your-domain>
   ```
4. Redeploy. **Admin → Availability → Online payments** should say
   *Switched on (test mode)*.
5. Make a booking and pay with Paystack's **test M-Pesa number / test card**
   (listed in Paystack's docs under *Test payments*). The booking should show
   *Partial* with the payment listed under **Admin → Payments**.

## 3. Go live

1. Complete Paystack's **activation / compliance** form (business details,
   ID and KRA PIN, and the payout account). Paystack reviews it, usually
   within a few days.
2. Make sure **M-Pesa (mobile money)** is enabled for the business. If a
   payment prompt is refused with a message about the channel not being
   available, ask Paystack support to enable M-Pesa for your account.
3. Copy the **Live Secret Key** (`sk_live_…`) and set the **Live Webhook URL**
   to the same `/api/payments/paystack/webhook` address.
4. In Vercel, replace `PAYSTACK_SECRET_KEY` with the live key and redeploy.
   The admin should now say *Switched on (live payments)*.
5. Pay one small real deposit to yourself to confirm the money arrives.

## 4. Where the money goes (payouts)

Paystack pays out the collected money on its settlement schedule to the
payout account on the business profile (Dashboard → Settings → **Payouts**).

- If Paystack offers **M-Pesa payouts** for the account, add **0701508259**.
- Otherwise add a **Kenyan bank account** in Magdalene's or the business's
  name. Paystack decides which payout options an account gets, so confirm
  this during activation.

Paystack charges a fee per successful payment. See the current rates at
<https://paystack.com/ke/pricing>.

## 5. Also check in the admin

**Admin → Availability → Booking rules & business info**:

- **M-Pesa number:** `0701508259`
- **Deposit percent:** e.g. 50 (set to 0 to stop asking for a deposit online)

---

## How it works (for developers)

| Piece | What it does |
|---|---|
| `src/lib/paystack.ts` | Paystack API client: M-Pesa charge, hosted checkout, transaction verify, webhook signature check |
| `src/lib/payments.ts` | Works out the amount **on the server** (deposit % or balance), records each attempt in the `Payment` table, and applies results idempotently, so money is added to a booking only once |
| `POST /api/payments/start` | Client starts an M-Pesa prompt (same-origin only, rate limited, max 5 attempts per booking per hour) |
| `POST /api/payments/checkout` | Client starts a card payment and gets Paystack's checkout URL |
| `GET /api/payments/status?id=` | Polled while the client enters their PIN. Asks Paystack directly if the webhook is slow, and expires unanswered prompts after 3 minutes |
| `POST /api/payments/paystack/webhook` | Paystack's events. The `x-paystack-signature` HMAC is checked, then the transaction is **verified with Paystack** before anything is recorded |
| `/pay/complete` | Where card payers return. Shows the verified result, never what the URL claims |

A payment is only accepted when Paystack confirms it as successful **in KES
for at least the amount due**.

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| Admin says payments are not switched on | `PAYSTACK_SECRET_KEY` missing, or doesn't start with `sk_test_` / `sk_live_` |
| "Card payments are not set up yet" | `NEXT_PUBLIC_SITE_URL` not set (needed for the return address) |
| Prompt never arrives | Number is not Safaricom, or M-Pesa isn't enabled on the Paystack account. Check Vercel → Logs for `Paystack charge rejected` |
| Paid, but the booking is slow to update | The webhook URL isn't set in Paystack. The page still confirms the payment by asking Paystack directly, but set the webhook so the admin updates instantly |
| Test payments don't move real money | Correct: test keys never do. Switch to the live key to go live |
