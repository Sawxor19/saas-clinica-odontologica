-- 029_stripe_trial_checkout.sql
alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists trial_used boolean not null default false;
alter table profiles add column if not exists trial_used_at timestamptz;
alter table profiles add column if not exists stripe_subscription_id text;
alter table profiles add column if not exists subscription_status text;
alter table profiles add column if not exists trial_end timestamptz;
alter table profiles add column if not exists current_period_end timestamptz;
alter table profiles add column if not exists cancel_at_period_end boolean;

create unique index if not exists profiles_stripe_customer_id_unique
  on profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create table if not exists processed_stripe_events (
  event_id text primary key,
  created_at timestamptz not null default now()
);
