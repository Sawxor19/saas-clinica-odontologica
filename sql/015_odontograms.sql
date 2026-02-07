-- 015_odontograms.sql
create table if not exists odontograms (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (patient_id)
);

alter table odontograms enable row level security;

drop policy if exists odontograms_select on odontograms;
drop policy if exists odontograms_insert on odontograms;
drop policy if exists odontograms_update on odontograms;

create policy odontograms_select on odontograms
  for select using (clinic_id = public.get_current_clinic_id());

create policy odontograms_insert on odontograms
  for insert with check (clinic_id = public.get_current_clinic_id());

create policy odontograms_update on odontograms
  for update using (clinic_id = public.get_current_clinic_id())
  with check (clinic_id = public.get_current_clinic_id());
