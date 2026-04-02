-- 000_bootstrap.sql
-- Fresh-project bootstrap for Supabase.
-- Consolidates sql/001 through sql/032 in a single execution order.
-- Helper auth functions are declared early so policy creation works on an empty database.

-- ===== BEGIN 001_schema.sql =====
-- 001_schema.sql
create extension if not exists "pgcrypto";

create table if not exists clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subscription_status text not null default 'trialing',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin','dentist','assistant','receptionist')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  birth_date date,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  dentist_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists procedures (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists clinical_notes (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  dentist_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  dentist_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  status text not null default 'draft',
  discount numeric(5,2) default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  procedure_id uuid not null references procedures(id) on delete cascade,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null default 0
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  amount numeric(10,2) not null,
  method text not null,
  paid_at timestamptz not null,
  notes text
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null unique references clinics(id) on delete cascade,
  stripe_subscription_id text,
  plan text not null,
  status text not null,
  current_period_end timestamptz
);

create table if not exists payments_history (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  amount numeric(10,2) not null,
  stripe_invoice_id text not null,
  paid_at timestamptz not null
);

create table if not exists clinic_features (
  clinic_id uuid not null references clinics(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (clinic_id, feature_key)
);

create table if not exists signup_intents (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null,
  admin_name text not null,
  email text not null,
  password_cipher text not null,
  plan text not null,
  created_at timestamptz not null default now()
);

create table if not exists stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);
-- ===== END 001_schema.sql =====

-- ===== BEGIN bootstrap_helper_functions.sql =====
create or replace function public.get_current_clinic_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select clinic_id from profiles where user_id = auth.uid();
$$;

create or replace function public.get_current_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from profiles where user_id = auth.uid();
$$;
-- ===== END bootstrap_helper_functions.sql =====

-- ===== BEGIN 004_add_patient_fields.sql =====
-- 004_add_patient_fields.sql
alter table patients add column if not exists cpf text;
alter table patients add column if not exists address text;
alter table patients add column if not exists emergency_contact text;
alter table patients add column if not exists allergies text;
alter table patients add column if not exists chronic_conditions text;
alter table patients add column if not exists medications text;
alter table patients add column if not exists alerts text;
alter table patients add column if not exists status text default 'active';
alter table patients add column if not exists dentist_id uuid references auth.users(id);
-- ===== END 004_add_patient_fields.sql =====

-- ===== BEGIN 005_add_patient_cep.sql =====
-- 005_add_patient_cep.sql
alter table patients add column if not exists cep text;
-- ===== END 005_add_patient_cep.sql =====

-- ===== BEGIN 006_patient_intake.sql =====
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
-- ===== END 006_patient_intake.sql =====

-- ===== BEGIN 007_add_intake_patient_id.sql =====
-- 007_add_intake_patient_id.sql
alter table patient_intake_links add column if not exists patient_id uuid references patients(id);
-- ===== END 007_add_intake_patient_id.sql =====

-- ===== BEGIN 008_add_rooms_and_appointments_fields.sql =====
-- 008_add_rooms_and_appointments_fields.sql
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table rooms enable row level security;

alter table appointments add column if not exists room_id uuid references rooms(id);
-- ===== END 008_add_rooms_and_appointments_fields.sql =====

-- ===== BEGIN 009_materials_and_procedures.sql =====
-- 009_materials_and_procedures.sql
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  unit text not null default 'un',
  current_stock numeric(10,2) not null default 0,
  min_stock numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists procedure_materials (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  procedure_id uuid not null references procedures(id) on delete cascade,
  material_id uuid not null references materials(id) on delete cascade,
  quantity numeric(10,2) not null default 1
);

alter table materials enable row level security;
alter table procedure_materials enable row level security;

drop policy if exists materials_select on materials;
drop policy if exists materials_insert on materials;
drop policy if exists materials_update on materials;
drop policy if exists materials_delete on materials;
drop policy if exists procedure_materials_select on procedure_materials;
drop policy if exists procedure_materials_insert on procedure_materials;
drop policy if exists procedure_materials_update on procedure_materials;

create policy materials_select on materials
  for select using (clinic_id = public.get_current_clinic_id());

create policy materials_insert on materials
  for insert with check (clinic_id = public.get_current_clinic_id());

create policy materials_update on materials
  for update using (clinic_id = public.get_current_clinic_id())
  with check (clinic_id = public.get_current_clinic_id());

create policy materials_delete on materials
  for delete using (clinic_id = public.get_current_clinic_id());

create policy procedure_materials_select on procedure_materials
  for select using (clinic_id = public.get_current_clinic_id());

create policy procedure_materials_insert on procedure_materials
  for insert with check (clinic_id = public.get_current_clinic_id());

create policy procedure_materials_update on procedure_materials
  for update using (clinic_id = public.get_current_clinic_id())
  with check (clinic_id = public.get_current_clinic_id());
-- ===== END 009_materials_and_procedures.sql =====

-- ===== BEGIN 002_rls.sql =====
-- 002_rls.sql
create or replace function public.get_current_clinic_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select clinic_id from profiles where user_id = auth.uid();
$$;

create or replace function public.get_current_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from profiles where user_id = auth.uid();
$$;

drop policy if exists clinics_select on clinics;
drop policy if exists clinics_update on clinics;
drop policy if exists profiles_select on profiles;
drop policy if exists profiles_select_self on profiles;
drop policy if exists profiles_insert_admin on profiles;
drop policy if exists profiles_update_admin on profiles;
drop policy if exists patients_select on patients;
drop policy if exists patients_insert on patients;
drop policy if exists patients_update on patients;
drop policy if exists patients_delete on patients;
drop policy if exists appointments_select on appointments;
drop policy if exists appointments_insert on appointments;
drop policy if exists appointments_update on appointments;
drop policy if exists appointments_delete on appointments;
drop policy if exists procedures_select on procedures;
drop policy if exists procedures_insert on procedures;
drop policy if exists procedures_update on procedures;
drop policy if exists clinical_notes_select on clinical_notes;
drop policy if exists procedures_delete on procedures;
drop policy if exists clinical_notes_insert on clinical_notes;
drop policy if exists clinical_notes_update on clinical_notes;
drop policy if exists prescriptions_select on prescriptions;

create policy procedures_delete on procedures
  for delete using (clinic_id = public.get_current_clinic_id());
drop policy if exists prescriptions_insert on prescriptions;
drop policy if exists attachments_select on attachments;
drop policy if exists attachments_insert on attachments;
drop policy if exists attachments_delete on attachments;
drop policy if exists procedure_materials_delete on procedure_materials;
drop policy if exists budgets_select on budgets;
drop policy if exists budgets_insert on budgets;
drop policy if exists payments_select on payments;

create policy procedure_materials_delete on procedure_materials
  for delete using (clinic_id = public.get_current_clinic_id());
drop policy if exists payments_insert on payments;
drop policy if exists audit_logs_select on audit_logs;
drop policy if exists audit_logs_insert on audit_logs;
drop policy if exists subscriptions_select on subscriptions;
drop policy if exists payments_history_select on payments_history;
drop policy if exists clinic_features_select on clinic_features;
drop policy if exists clinic_features_write on clinic_features;
drop policy if exists clinic_features_update on clinic_features;
drop policy if exists rooms_select on rooms;
drop policy if exists rooms_insert on rooms;
drop policy if exists storage_select_attachments on storage.objects;
drop policy if exists storage_insert_attachments on storage.objects;

alter table clinics enable row level security;
alter table profiles enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table procedures enable row level security;
alter table clinical_notes enable row level security;
alter table prescriptions enable row level security;
alter table attachments enable row level security;
alter table budgets enable row level security;
alter table budget_items enable row level security;
alter table payments enable row level security;
alter table audit_logs enable row level security;
alter table subscriptions enable row level security;
alter table payments_history enable row level security;
alter table clinic_features enable row level security;
alter table signup_intents enable row level security;
alter table stripe_events enable row level security;
alter table rooms enable row level security;

create policy clinics_select on clinics
  for select using (id = public.get_current_clinic_id());

create policy clinics_update on clinics
  for update using (id = public.get_current_clinic_id() and public.get_current_role() = 'admin')
  with check (id = public.get_current_clinic_id() and public.get_current_role() = 'admin');

create policy profiles_select on profiles
  for select using (clinic_id = public.get_current_clinic_id());

create policy profiles_select_self on profiles
  for select using (user_id = auth.uid());

create policy profiles_insert_admin on profiles
  for insert with check (
    clinic_id = public.get_current_clinic_id() and public.get_current_role() = 'admin'
  );

create policy profiles_update_admin on profiles
  for update using (
    clinic_id = public.get_current_clinic_id() and public.get_current_role() = 'admin'
  )
  with check (
    clinic_id = public.get_current_clinic_id() and public.get_current_role() = 'admin'
  );

create policy patients_select on patients
  for select using (clinic_id = public.get_current_clinic_id());

create policy patients_insert on patients
  for insert with check (clinic_id = public.get_current_clinic_id());

create policy patients_update on patients
  for update using (clinic_id = public.get_current_clinic_id())
  with check (clinic_id = public.get_current_clinic_id());

create policy patients_delete on patients
  for delete using (clinic_id = public.get_current_clinic_id());

create policy appointments_select on appointments
  for select using (clinic_id = public.get_current_clinic_id());

create policy appointments_insert on appointments
  for insert with check (clinic_id = public.get_current_clinic_id());

create policy appointments_update on appointments
  for update using (clinic_id = public.get_current_clinic_id())
  with check (clinic_id = public.get_current_clinic_id());

create policy appointments_delete on appointments
  for delete using (clinic_id = public.get_current_clinic_id());

create policy procedures_select on procedures
  for select using (clinic_id = public.get_current_clinic_id());

create policy procedures_insert on procedures
  for insert with check (clinic_id = public.get_current_clinic_id());

create policy procedures_update on procedures
  for update using (clinic_id = public.get_current_clinic_id())
  with check (clinic_id = public.get_current_clinic_id());

create policy clinical_notes_select on clinical_notes
  for select using (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin','dentist','assistant')
  );

create policy clinical_notes_insert on clinical_notes
  for insert with check (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin','dentist')
  );

create policy clinical_notes_update on clinical_notes
  for update using (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin','dentist')
  )
  with check (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin','dentist')
  );

create policy prescriptions_select on prescriptions
  for select using (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin','dentist')
  );

create policy prescriptions_insert on prescriptions
  for insert with check (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin','dentist')
  );

create policy attachments_select on attachments
  for select using (clinic_id = public.get_current_clinic_id());

create policy attachments_insert on attachments
  for insert with check (clinic_id = public.get_current_clinic_id());

create policy attachments_delete on attachments
  for delete using (clinic_id = public.get_current_clinic_id());

create policy budgets_select on budgets
  for select using (clinic_id = public.get_current_clinic_id());

create policy budgets_insert on budgets
  for insert with check (clinic_id = public.get_current_clinic_id());

create policy payments_select on payments
  for select using (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin','receptionist')
  );

create policy payments_insert on payments
  for insert with check (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin','receptionist')
  );

create policy audit_logs_select on audit_logs
  for select using (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() = 'admin'
  );

create policy audit_logs_insert on audit_logs
  for insert with check (
    clinic_id = public.get_current_clinic_id()
  );

create policy subscriptions_select on subscriptions
  for select using (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() = 'admin'
  );

create policy payments_history_select on payments_history
  for select using (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() = 'admin'
  );

create policy clinic_features_select on clinic_features
  for select using (clinic_id = public.get_current_clinic_id());

create policy clinic_features_write on clinic_features
  for insert with check (
    clinic_id = public.get_current_clinic_id() and public.get_current_role() = 'admin'
  );

create policy clinic_features_update on clinic_features
  for update using (
    clinic_id = public.get_current_clinic_id() and public.get_current_role() = 'admin'
  )
  with check (
    clinic_id = public.get_current_clinic_id() and public.get_current_role() = 'admin'
  );

create policy rooms_select on rooms
  for select using (clinic_id = public.get_current_clinic_id());

create policy rooms_insert on rooms
  for insert with check (clinic_id = public.get_current_clinic_id());

-- signup_intents and stripe_events intentionally have no policies (service role only)

-- Storage policies (clinic-attachments)
create policy storage_select_attachments on storage.objects
  for select using (
    bucket_id = 'clinic-attachments'
    and (storage.foldername(name))[1] = public.get_current_clinic_id()::text
  );

create policy storage_insert_attachments on storage.objects
  for insert with check (
    bucket_id = 'clinic-attachments'
    and (storage.foldername(name))[1] = public.get_current_clinic_id()::text
    and public.get_current_role() in ('admin','dentist','assistant')
  );
-- ===== END 002_rls.sql =====

-- ===== BEGIN 003_seed.sql =====
-- 003_seed.sql
insert into clinic_features (clinic_id, feature_key, enabled)
select id, 'reports', true from clinics
on conflict do nothing;

insert into clinic_features (clinic_id, feature_key, enabled)
select id, 'budgets', true from clinics
on conflict do nothing;
-- ===== END 003_seed.sql =====

-- ===== BEGIN 010_add_appointment_payment_fields.sql =====
-- 010_add_appointment_payment_fields.sql
alter table appointments add column if not exists payment_status text default 'unpaid';
alter table appointments add column if not exists payment_method text;
alter table appointments add column if not exists paid_at timestamptz;
-- ===== END 010_add_appointment_payment_fields.sql =====

-- ===== BEGIN 011_add_appointment_procedure_and_charge.sql =====
-- 011_add_appointment_procedure_and_charge.sql
alter table appointments add column if not exists procedure_id uuid references procedures(id);
alter table appointments add column if not exists charge_amount numeric(10,2) default 0;
-- ===== END 011_add_appointment_procedure_and_charge.sql =====

-- ===== BEGIN 012_payables.sql =====
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
-- ===== END 012_payables.sql =====

-- ===== BEGIN 013_add_payables_installments.sql =====
-- 013_add_payables_installments.sql
alter table payables add column if not exists installments integer;
-- ===== END 013_add_payables_installments.sql =====

-- ===== BEGIN 014_add_patient_photo.sql =====
-- 014_add_patient_photo.sql
alter table patients add column if not exists photo_path text;
-- ===== END 014_add_patient_photo.sql =====

-- ===== BEGIN 015_odontograms.sql =====
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
-- ===== END 015_odontograms.sql =====

-- ===== BEGIN 016_add_attachments_category.sql =====
-- 016_add_attachments_category.sql
alter table attachments add column if not exists category text default 'document';
-- ===== END 016_add_attachments_category.sql =====

-- ===== BEGIN 017_add_profile_fields.sql =====
-- 017_add_profile_fields.sql
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists cpf text;
alter table profiles add column if not exists cro text;
alter table profiles add column if not exists birth_date date;
alter table profiles add column if not exists address text;
alter table profiles add column if not exists cep text;
alter table profiles add column if not exists photo_path text;
-- ===== END 017_add_profile_fields.sql =====

-- ===== BEGIN 018_add_appointment_arrived_status.sql =====
-- 018_add_appointment_arrived_status.sql
alter table appointments drop constraint if exists appointments_status_check;
alter table appointments add constraint appointments_status_check
  check (status in ('scheduled','confirmed','arrived','in_progress','completed','missed','cancelled'));
-- ===== END 018_add_appointment_arrived_status.sql =====

-- ===== BEGIN 019_add_profile_permissions.sql =====
-- 019_add_profile_permissions.sql
alter table profiles add column if not exists permissions jsonb;
-- ===== END 019_add_profile_permissions.sql =====

-- ===== BEGIN 020_add_clinic_timezone.sql =====
-- 020_add_clinic_timezone.sql
alter table clinics add column if not exists timezone text not null default 'America/Sao_Paulo';
-- ===== END 020_add_clinic_timezone.sql =====

-- ===== BEGIN 021_budget_items_rls.sql =====
-- 021_budget_items_rls.sql
alter table budget_items enable row level security;

drop policy if exists budget_items_select on budget_items;
drop policy if exists budget_items_insert on budget_items;
drop policy if exists budget_items_update on budget_items;
drop policy if exists budget_items_delete on budget_items;

create policy budget_items_select on budget_items
  for select using (
    budget_id in (select id from budgets where clinic_id = public.get_current_clinic_id())
  );

create policy budget_items_insert on budget_items
  for insert with check (
    budget_id in (select id from budgets where clinic_id = public.get_current_clinic_id())
  );

create policy budget_items_update on budget_items
  for update using (
    budget_id in (select id from budgets where clinic_id = public.get_current_clinic_id())
  )
  with check (
    budget_id in (select id from budgets where clinic_id = public.get_current_clinic_id())
  );

create policy budget_items_delete on budget_items
  for delete using (
    budget_id in (select id from budgets where clinic_id = public.get_current_clinic_id())
  );
-- ===== END 021_budget_items_rls.sql =====

-- ===== BEGIN 022_signup_verification.sql =====
-- 022_signup_verification.sql
alter table signup_intents alter column plan drop not null;
alter table signup_intents alter column password_cipher drop not null;

alter table signup_intents add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table signup_intents add column if not exists cpf_hash text;
alter table signup_intents add column if not exists phone_e164 text;
alter table signup_intents add column if not exists phone_hash text;
alter table signup_intents add column if not exists email_verified boolean default false;
alter table signup_intents add column if not exists phone_verified_at timestamptz;
alter table signup_intents add column if not exists cpf_validated_at timestamptz;
alter table signup_intents add column if not exists otp_hash text;
alter table signup_intents add column if not exists otp_expires_at timestamptz;
alter table signup_intents add column if not exists otp_attempts integer default 0;
alter table signup_intents add column if not exists otp_last_sent_at timestamptz;
alter table signup_intents add column if not exists otp_locked_until timestamptz;
alter table signup_intents add column if not exists otp_send_count integer default 0;
alter table signup_intents add column if not exists otp_send_window_start timestamptz;
alter table signup_intents add column if not exists status text default 'PENDING';
alter table signup_intents add column if not exists checkout_session_id text;
alter table signup_intents add column if not exists updated_at timestamptz default now();

create unique index if not exists signup_intents_cpf_hash_idx on signup_intents (cpf_hash);
create unique index if not exists signup_intents_phone_hash_idx on signup_intents (phone_hash);
create index if not exists signup_intents_email_idx on signup_intents (email);

alter table profiles add column if not exists cpf_hash text;
alter table profiles add column if not exists phone_e164 text;
alter table profiles add column if not exists phone_verified_at timestamptz;

create table if not exists signup_audit_logs (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid references signup_intents(id) on delete cascade,
  action text not null,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists signup_audit_logs_intent_idx on signup_audit_logs (intent_id);
-- ===== END 022_signup_verification.sql =====

-- ===== BEGIN 023_signup_verification_rls.sql =====
-- 023_signup_verification_rls.sql
alter table signup_audit_logs enable row level security;
-- signup_audit_logs is service-role only; no policies.

-- signup_intents already has RLS enabled in 002_rls.sql (service-role only).
-- ===== END 023_signup_verification_rls.sql =====

-- ===== BEGIN 024_add_patient_intake_fields.sql =====
-- 024_add_patient_intake_fields.sql
alter table patients add column if not exists smoker boolean;
alter table patients add column if not exists drinker boolean;
alter table patients add column if not exists drug_use boolean;
alter table patients add column if not exists signature_path text;
-- ===== END 024_add_patient_intake_fields.sql =====

-- ===== BEGIN 025_add_patient_drug_use_details.sql =====
-- 025_add_patient_drug_use_details.sql
alter table patients add column if not exists drug_use_details text;
-- ===== END 025_add_patient_drug_use_details.sql =====

-- ===== BEGIN 026_relax_patient_intake_phone.sql =====
-- 026_relax_patient_intake_phone.sql
alter table patient_intake_links alter column phone drop not null;
-- ===== END 026_relax_patient_intake_phone.sql =====

-- ===== BEGIN 027_provisioning_hardening.sql =====
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
-- ===== END 027_provisioning_hardening.sql =====

-- ===== BEGIN 028_signup_intents_profile_fields.sql =====
-- 028_signup_intents_profile_fields.sql
alter table signup_intents add column if not exists document_type text;
alter table signup_intents add column if not exists document_number text;
alter table signup_intents add column if not exists address text;
alter table signup_intents add column if not exists cep text;
alter table signup_intents add column if not exists timezone text;

update signup_intents
set document_type = 'cpf'
where document_type is null
  and cpf_hash is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'signup_intents_document_type_check'
  ) then
    alter table signup_intents
      add constraint signup_intents_document_type_check
      check (document_type in ('cpf', 'cnpj') or document_type is null);
  end if;
end
$$;
-- ===== END 028_signup_intents_profile_fields.sql =====

-- ===== BEGIN 029_stripe_trial_checkout.sql =====
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
-- ===== END 029_stripe_trial_checkout.sql =====

-- ===== BEGIN 030_anamneses_builder.sql =====
-- 030_anamneses_builder.sql

create table if not exists anamnesis_forms (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  public_slug text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table anamnesis_forms
  add column if not exists clinic_id uuid references clinics(id) on delete cascade,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists status text default 'draft',
  add column if not exists public_slug text,
  add column if not exists created_by uuid references auth.users(id) on delete cascade,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create table if not exists anamnesis_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references anamnesis_forms(id) on delete cascade,
  label text not null,
  help_text text,
  type text not null
    check (type in ('text', 'textarea', 'select', 'radio', 'checkbox', 'date', 'yes_no', 'number')),
  required boolean not null default false,
  order_index int not null,
  options jsonb,
  validation jsonb,
  created_at timestamptz not null default now()
);

alter table anamnesis_fields
  add column if not exists form_id uuid references anamnesis_forms(id) on delete cascade,
  add column if not exists label text,
  add column if not exists help_text text,
  add column if not exists type text,
  add column if not exists required boolean default false,
  add column if not exists order_index int default 0,
  add column if not exists options jsonb,
  add column if not exists validation jsonb,
  add column if not exists created_at timestamptz default now();

create table if not exists anamnesis_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references anamnesis_forms(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  patient_name text,
  patient_email text,
  status text not null default 'submitted'
    check (status in ('submitted', 'signed')),
  submitted_at timestamptz not null default now(),
  signature_url text,
  signed_at timestamptz
);

alter table anamnesis_responses
  add column if not exists form_id uuid references anamnesis_forms(id) on delete cascade,
  add column if not exists clinic_id uuid references clinics(id) on delete cascade,
  add column if not exists patient_id uuid references patients(id) on delete set null,
  add column if not exists patient_name text,
  add column if not exists patient_email text,
  add column if not exists status text default 'submitted',
  add column if not exists submitted_at timestamptz default now(),
  add column if not exists signature_url text,
  add column if not exists signed_at timestamptz;

create table if not exists anamnesis_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references anamnesis_responses(id) on delete cascade,
  field_id uuid not null references anamnesis_fields(id) on delete cascade,
  answer jsonb not null
);

alter table anamnesis_answers
  add column if not exists response_id uuid references anamnesis_responses(id) on delete cascade,
  add column if not exists field_id uuid references anamnesis_fields(id) on delete cascade,
  add column if not exists answer jsonb;

create index if not exists anamnesis_forms_clinic_idx
  on anamnesis_forms (clinic_id);

create index if not exists anamnesis_fields_form_order_idx
  on anamnesis_fields (form_id, order_index);

create index if not exists anamnesis_responses_form_clinic_submitted_idx
  on anamnesis_responses (form_id, clinic_id, submitted_at desc);

create index if not exists anamnesis_responses_patient_idx
  on anamnesis_responses (patient_id, submitted_at desc);

create index if not exists anamnesis_answers_response_idx
  on anamnesis_answers (response_id);

create or replace function set_anamnesis_forms_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_anamnesis_forms_updated_at on anamnesis_forms;
create trigger trg_anamnesis_forms_updated_at
before update on anamnesis_forms
for each row execute function set_anamnesis_forms_updated_at();

alter table anamnesis_forms enable row level security;
alter table anamnesis_fields enable row level security;
alter table anamnesis_responses enable row level security;
alter table anamnesis_answers enable row level security;

drop policy if exists anamnesis_forms_select on anamnesis_forms;
drop policy if exists anamnesis_forms_insert on anamnesis_forms;
drop policy if exists anamnesis_forms_update on anamnesis_forms;
drop policy if exists anamnesis_forms_delete on anamnesis_forms;

drop policy if exists anamnesis_fields_select on anamnesis_fields;
drop policy if exists anamnesis_fields_insert on anamnesis_fields;
drop policy if exists anamnesis_fields_update on anamnesis_fields;
drop policy if exists anamnesis_fields_delete on anamnesis_fields;

drop policy if exists anamnesis_responses_select on anamnesis_responses;
drop policy if exists anamnesis_responses_insert on anamnesis_responses;
drop policy if exists anamnesis_responses_update on anamnesis_responses;
drop policy if exists anamnesis_responses_delete on anamnesis_responses;

drop policy if exists anamnesis_answers_select on anamnesis_answers;
drop policy if exists anamnesis_answers_insert on anamnesis_answers;
drop policy if exists anamnesis_answers_update on anamnesis_answers;
drop policy if exists anamnesis_answers_delete on anamnesis_answers;

create policy anamnesis_forms_select on anamnesis_forms
  for select using (clinic_id = public.get_current_clinic_id());

create policy anamnesis_forms_insert on anamnesis_forms
  for insert with check (clinic_id = public.get_current_clinic_id());

create policy anamnesis_forms_update on anamnesis_forms
  for update using (clinic_id = public.get_current_clinic_id())
  with check (clinic_id = public.get_current_clinic_id());

create policy anamnesis_forms_delete on anamnesis_forms
  for delete using (clinic_id = public.get_current_clinic_id());

create policy anamnesis_fields_select on anamnesis_fields
  for select using (
    exists (
      select 1
      from anamnesis_forms f
      where f.id = anamnesis_fields.form_id
        and f.clinic_id = public.get_current_clinic_id()
    )
  );

create policy anamnesis_fields_insert on anamnesis_fields
  for insert with check (
    exists (
      select 1
      from anamnesis_forms f
      where f.id = anamnesis_fields.form_id
        and f.clinic_id = public.get_current_clinic_id()
    )
  );

create policy anamnesis_fields_update on anamnesis_fields
  for update using (
    exists (
      select 1
      from anamnesis_forms f
      where f.id = anamnesis_fields.form_id
        and f.clinic_id = public.get_current_clinic_id()
    )
  )
  with check (
    exists (
      select 1
      from anamnesis_forms f
      where f.id = anamnesis_fields.form_id
        and f.clinic_id = public.get_current_clinic_id()
    )
  );

create policy anamnesis_fields_delete on anamnesis_fields
  for delete using (
    exists (
      select 1
      from anamnesis_forms f
      where f.id = anamnesis_fields.form_id
        and f.clinic_id = public.get_current_clinic_id()
    )
  );

create policy anamnesis_responses_select on anamnesis_responses
  for select using (clinic_id = public.get_current_clinic_id());

create policy anamnesis_responses_insert on anamnesis_responses
  for insert with check (clinic_id = public.get_current_clinic_id());

create policy anamnesis_responses_update on anamnesis_responses
  for update using (clinic_id = public.get_current_clinic_id())
  with check (clinic_id = public.get_current_clinic_id());

create policy anamnesis_responses_delete on anamnesis_responses
  for delete using (clinic_id = public.get_current_clinic_id());

create policy anamnesis_answers_select on anamnesis_answers
  for select using (
    exists (
      select 1
      from anamnesis_responses r
      where r.id = anamnesis_answers.response_id
        and r.clinic_id = public.get_current_clinic_id()
    )
  );

create policy anamnesis_answers_insert on anamnesis_answers
  for insert with check (
    exists (
      select 1
      from anamnesis_responses r
      where r.id = anamnesis_answers.response_id
        and r.clinic_id = public.get_current_clinic_id()
    )
  );

create policy anamnesis_answers_update on anamnesis_answers
  for update using (
    exists (
      select 1
      from anamnesis_responses r
      where r.id = anamnesis_answers.response_id
        and r.clinic_id = public.get_current_clinic_id()
    )
  )
  with check (
    exists (
      select 1
      from anamnesis_responses r
      where r.id = anamnesis_answers.response_id
        and r.clinic_id = public.get_current_clinic_id()
    )
  );

create policy anamnesis_answers_delete on anamnesis_answers
  for delete using (
    exists (
      select 1
      from anamnesis_responses r
      where r.id = anamnesis_answers.response_id
        and r.clinic_id = public.get_current_clinic_id()
    )
  );
-- ===== END 030_anamneses_builder.sql =====

-- ===== BEGIN 031_budget_workflow.sql =====
-- 031_budget_workflow.sql

create index if not exists budgets_clinic_created_idx
  on budgets (clinic_id, created_at desc);

create index if not exists budget_items_budget_idx
  on budget_items (budget_id);

drop policy if exists budgets_update on budgets;
drop policy if exists budgets_delete on budgets;

create policy budgets_update on budgets
  for update using (clinic_id = public.get_current_clinic_id())
  with check (clinic_id = public.get_current_clinic_id());

create policy budgets_delete on budgets
  for delete using (clinic_id = public.get_current_clinic_id());
-- ===== END 031_budget_workflow.sql =====

-- ===== BEGIN 032_clinical_documents.sql =====
-- 032_clinical_documents.sql

alter table prescriptions
  add column if not exists document_type text default 'prescription',
  add column if not exists title text,
  add column if not exists file_path text,
  add column if not exists file_name text;

create index if not exists prescriptions_patient_created_idx
  on prescriptions (patient_id, created_at desc);
-- ===== END 032_clinical_documents.sql =====

