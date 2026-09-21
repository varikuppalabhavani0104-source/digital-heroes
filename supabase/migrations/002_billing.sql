-- =====================================================================
-- 002 — Billing support (provider-neutral). Safe to run more than once,
-- and safe whether or not you ran earlier versions of 001/002.
-- =====================================================================

-- 1) Normalise any legacy vendor-specific column names to provider_* (no-op otherwise)
do $$
declare r record;
begin
  for r in select * from (values
    ('subscriptions',         'stripe_customer_id',       'provider_customer_id'),
    ('subscriptions',         'razorpay_customer_id',     'provider_customer_id'),
    ('subscriptions',         'stripe_subscription_id',   'provider_subscription_id'),
    ('subscriptions',         'razorpay_subscription_id', 'provider_subscription_id'),
    ('subscriptions',         'razorpay_plan_id',         'provider_plan_id'),
    ('charity_contributions', 'stripe_invoice_id',        'provider_payment_id'),
    ('charity_contributions', 'razorpay_payment_id',      'provider_payment_id'),
    ('donations',             'stripe_session_id',        'provider_payment_id'),
    ('donations',             'razorpay_payment_id',      'provider_payment_id')
  ) as t(tbl, from_col, to_col)
  loop
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name=r.tbl and column_name=r.from_col)
       and not exists (select 1 from information_schema.columns where table_schema='public' and table_name=r.tbl and column_name=r.to_col) then
      execute format('alter table public.%I rename column %I to %I', r.tbl, r.from_col, r.to_col);
    end if;
  end loop;
end $$;

-- 2) New columns
alter table subscriptions add column if not exists provider_plan_id text;
alter table subscriptions add column if not exists last_event_at timestamptz;   -- ignore late, out-of-order webhooks
alter table profiles      add column if not exists phone text;                  -- mandatory for UPI/card mandates

-- 3) A member may hold at most ONE live (active / past_due) subscription
create unique index if not exists one_live_subscription_per_user
  on subscriptions (user_id) where status in ('active', 'past_due');

-- 4) Webhook log: idempotency (providers retry) + audit trail. Service role only.
create table if not exists payment_events (
  id            text primary key,
  event         text not null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz
);
alter table payment_events enable row level security;

-- 5) Real-time entitlement check (used by RLS + app). 2-day grace lets a renewal
--    that is debited a few hours after the period ends land without locking anyone out.
create or replace function has_active_subscription(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions
    where user_id = uid and status = 'active'
      and (current_period_end is null or current_period_end + interval '2 days' > now())
  );
$$;

-- 6) THE payment ledger function. One atomic, idempotent step:
--    • records the charity contribution for this payment (unique key → replays are no-ops)
--    • extends the paid-through date by one billing cycle
--    • marks the subscription active
--    Returns true if the payment was new, false if it had already been processed.
create or replace function record_subscription_payment(
  p_provider_sub_id text, p_payment_key text, p_amount_paise int
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  s subscriptions%rowtype;
  p profiles%rowtype;
  v_inserted uuid;
  v_base timestamptz;
begin
  select * into s from subscriptions where provider_subscription_id = p_provider_sub_id for update;
  if not found then return false; end if;
  select * into p from profiles where id = s.user_id;

  insert into charity_contributions (user_id, charity_id, subscription_id, amount_paise, percent_applied, provider_payment_id)
  values (s.user_id, p.charity_id, s.id, floor(p_amount_paise * p.charity_percent / 100.0)::int, p.charity_percent, p_payment_key)
  on conflict (provider_payment_id) do nothing
  returning id into v_inserted;
  if v_inserted is null then return false; end if;

  -- first payment starts the clock now; renewals extend from the previous end date (no drift)
  v_base := case when s.current_period_end is null or s.current_period_end < now() - interval '2 days'
                 then now() else s.current_period_end end;
  update subscriptions
     set status = 'active',
         current_period_end = v_base + case s.plan when 'monthly' then interval '1 month' else interval '1 year' end,
         updated_at = now()
   where id = s.id;
  return true;
end $$;

revoke all on function record_subscription_payment(text, text, int) from public, anon, authenticated;
grant execute on function record_subscription_payment(text, text, int) to service_role;
