# Digital Heroes

A subscription platform that turns golf performance into charity impact and monthly prize draws.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Auth, Postgres, RLS, Storage) · **Cashfree Payments** (sandbox subscriptions) · Vercel

## Local setup
1. `npm install`
2. Copy `.env.example` → `.env.local` and fill in Supabase + Cashfree keys.
3. Supabase → SQL Editor: run `001_schema.sql`, then `002_billing.sql`, then `seed.sql`.
4. Supabase → Authentication → Providers → Email: turn **off** "Confirm email".
5. `npm run dev` → http://localhost:3000
6. Promote yourself to admin: `update profiles set role = 'admin' where email = 'you@example.com';`

> Cashfree redirects members back to your site after payment, so test checkout on the deployed https URL
> (set `NEXT_PUBLIC_SITE_URL` to it).

## Billing architecture (Cashfree Subscriptions)
```
Pricing → POST /api/subscribe          create PERIODIC subscription (plan defined inline), store 'incomplete'
        → Cashfree hosted checkout     member authorises a UPI/card mandate; the auth payment IS the first cycle
        → /api/subscribe/return        ignore the redirect payload; ask Cashfree's API for the real status → 'active'
Cashfree ─► POST /api/webhooks/cashfree signed webhook = source of truth for renewals, failures, cancellations
```
| Cashfree event | Our status | Effect |
|---|---|---|
| `SUBSCRIPTION_PAYMENT_SUCCESS` (auth / renewal) | `active` | paid-through date +1 cycle, charity ledger row |
| `SUBSCRIPTION_PAYMENT_FAILED` (renewal) / status `ON_HOLD` | `past_due` | access paused while retried |
| status `CANCELLED` | `active` + `cancel_at_period_end` (until paid period ends) → `cancelled` | future debits stopped, access kept |
| status `COMPLETED` / `EXPIRED` | `expired` | lapsed |

- Payments are recorded by one **atomic, idempotent Postgres function** (`record_subscription_payment`): charity ledger + period extension + activation in a single transaction, keyed by a unique payment key so replays do nothing.
- Webhooks: **HMAC-verified** over `timestamp + raw body`, idempotent (`payment_events`), and order-safe (`last_event_at`).
- Access is **time-checked in Postgres** (`has_active_subscription()`, 2-day renewal grace): an `active` row past its paid-through date has no access even if a webhook was missed.
- Column names are provider-neutral (`provider_subscription_id`, …), so the payment vendor can be swapped without a schema change.
- Secrets (`CASHFREE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) exist only in server code.

## Other notes
- All money is stored in **paise** (integers); INR formatting happens at the UI edge.
- Authorization is layered: middleware → server-layout check → **Postgres RLS**.
- Rolling-5 scores and one-score-per-date are enforced in the database.

(Draw algorithm, schema diagram and demo accounts are added as features land.)
