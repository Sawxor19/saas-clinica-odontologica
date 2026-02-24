-- 027_provisioning_hardening.sql

create table if not exists memberships (
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','dentist','assistant','receptionist')),
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

insert into memberships (clinic_id, user_id, role)
select clinic_id, user_id, role
from profiles
on conflict (clinic_id, user_id) do update set role = excluded.role;

alter table clinics
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists clinics_owner_user_id_unique
  on clinics (owner_user_id)
  where owner_user_id is not null;

update clinics c
set owner_user_id = p.user_id
from profiles p
where p.clinic_id = c.id
  and p.role = 'admin'
  and c.owner_user_id is null;

alter table subscriptions add column if not exists stripe_customer_id text;
alter table subscriptions add column if not exists created_at timestamptz not null default now();
alter table subscriptions add column if not exists updated_at timestamptz not null default now();

update subscriptions s
set stripe_customer_id = p.stripe_customer_id
from profiles p
where p.clinic_id = s.clinic_id
  and p.role = 'admin'
  and p.stripe_customer_id is not null
  and s.stripe_customer_id is null;

with ranked_customers as (
  select
    id,
    row_number() over (
      partition by stripe_customer_id
      order by current_period_end desc nulls last, id
    ) as rn
  from subscriptions
  where stripe_customer_id is not null
)
update subscriptions s
set stripe_customer_id = null
from ranked_customers r
where s.id = r.id
  and r.rn > 1;

with ranked_subscriptions as (
  select
    id,
    row_number() over (
      partition by stripe_subscription_id
      order by current_period_end desc nulls last, id
    ) as rn
  from subscriptions
  where stripe_subscription_id is not null
)
update subscriptions s
set stripe_subscription_id = null
from ranked_subscriptions r
where s.id = r.id
  and r.rn > 1;

create unique index if not exists subscriptions_stripe_customer_id_unique
  on subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists subscriptions_stripe_subscription_id_unique
  on subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create unique index if not exists payments_history_invoice_unique
  on payments_history (stripe_invoice_id);

create index if not exists signup_intents_checkout_session_idx
  on signup_intents (checkout_session_id);

create table if not exists webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing'
    check (status in ('received','processing','processed','failed')),
  payload_json jsonb not null,
  error_message text,
  received_at timestamptz not null default now(),
  processing_started_at timestamptz,
  processed_at timestamptz,
  last_seen_at timestamptz not null default now(),
  attempt_count integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists provisioning_jobs (
  job_id uuid primary key default gen_random_uuid(),
  stripe_event_id text references webhook_events(event_id) on delete set null,
  stripe_checkout_session_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  intent_id uuid references signup_intents(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  clinic_id uuid references clinics(id) on delete set null,
  status text not null
    check (status in (
      'received',
      'user_ok',
      'profile_ok',
      'clinic_ok',
      'membership_ok',
      'subscription_ok',
      'done',
      'failed'
    )),
  error_message text,
  payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists provisioning_jobs_stripe_event_id_unique
  on provisioning_jobs (stripe_event_id)
  where stripe_event_id is not null;

create unique index if not exists provisioning_jobs_checkout_session_unique
  on provisioning_jobs (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists provisioning_jobs_intent_idx
  on provisioning_jobs (intent_id);

create index if not exists provisioning_jobs_user_idx
  on provisioning_jobs (user_id);

create index if not exists provisioning_jobs_clinic_idx
  on provisioning_jobs (clinic_id);

insert into webhook_events (
  event_id,
  event_type,
  status,
  payload_json,
  received_at,
  processing_started_at,
  processed_at,
  last_seen_at,
  attempt_count,
  updated_at
)
select
  id as event_id,
  type as event_type,
  'processed' as status,
  jsonb_build_object('legacy', true, 'id', id, 'type', type) as payload_json,
  created_at as received_at,
  created_at as processing_started_at,
  created_at as processed_at,
  created_at as last_seen_at,
  1 as attempt_count,
  created_at as updated_at
from stripe_events
on conflict (event_id) do nothing;

alter table signup_intents
  add column if not exists clinic_id uuid references clinics(id) on delete set null;

create or replace function public.get_current_clinic_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select clinic_id
      from memberships
      where user_id = auth.uid()
      order by created_at asc
      limit 1
    ),
    (
      select clinic_id
      from profiles
      where user_id = auth.uid()
      limit 1
    )
  );
$$;

create or replace function public.get_current_role()
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role
      from memberships
      where user_id = auth.uid()
      order by created_at asc
      limit 1
    ),
    (
      select role
      from profiles
      where user_id = auth.uid()
      limit 1
    )
  );
$$;

alter table memberships enable row level security;
alter table webhook_events enable row level security;
alter table provisioning_jobs enable row level security;

drop policy if exists memberships_select on memberships;
drop policy if exists memberships_insert on memberships;
drop policy if exists memberships_update on memberships;
drop policy if exists memberships_delete on memberships;

create policy memberships_select on memberships
  for select using (
    user_id = auth.uid()
    or (
      clinic_id = public.get_current_clinic_id()
      and public.get_current_role() = 'admin'
    )
  );

create policy memberships_insert on memberships
  for insert with check (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() = 'admin'
  );

create policy memberships_update on memberships
  for update using (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() = 'admin'
  )
  with check (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() = 'admin'
  );

create policy memberships_delete on memberships
  for delete using (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() = 'admin'
  );

-- webhook_events and provisioning_jobs are intentionally service-role only.
