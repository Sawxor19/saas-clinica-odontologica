-- 006_patient_intake.sql
alter table clinics add column if not exists whatsapp_number text;
alter table signup_intents add column if not exists whatsapp_number text;

create table if not exists patient_intake_links (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  phone text not null,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table patient_intake_links enable row level security;
-- no policies: service role only