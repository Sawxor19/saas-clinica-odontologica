-- 012_payables.sql
create table if not exists payables (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  amount numeric(10,2) not null default 0,
  due_date date not null,
  payment_method text,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

alter table payables enable row level security;

drop policy if exists payables_select on payables;
drop policy if exists payables_insert on payables;
drop policy if exists payables_update on payables;
drop policy if exists payables_delete on payables;

create policy payables_select on payables
  for select using (clinic_id = public.get_current_clinic_id());

create policy payables_insert on payables
  for insert with check (clinic_id = public.get_current_clinic_id());

create policy payables_update on payables
  for update using (clinic_id = public.get_current_clinic_id())
  with check (clinic_id = public.get_current_clinic_id());

create policy payables_delete on payables
  for delete using (clinic_id = public.get_current_clinic_id());
