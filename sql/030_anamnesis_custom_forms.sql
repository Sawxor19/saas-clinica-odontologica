-- 030_anamnesis_custom_forms.sql

create table if not exists anamnesis_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  title text not null,
  description text,
  questions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists anamnesis_templates_clinic_idx
  on anamnesis_templates (clinic_id, created_at desc);

create table if not exists anamnesis_links (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  template_id uuid not null references anamnesis_templates(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists anamnesis_links_clinic_idx
  on anamnesis_links (clinic_id, created_at desc);

create index if not exists anamnesis_links_template_idx
  on anamnesis_links (template_id);

create table if not exists anamnesis_submissions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  template_id uuid not null references anamnesis_templates(id) on delete cascade,
  link_id uuid references anamnesis_links(id) on delete set null,
  patient_id uuid references patients(id) on delete set null,
  full_name text not null,
  cpf text not null,
  signed_date date not null,
  answers jsonb not null default '{}'::jsonb,
  signature_path text,
  identity_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists anamnesis_submissions_clinic_idx
  on anamnesis_submissions (clinic_id, created_at desc);

create index if not exists anamnesis_submissions_patient_idx
  on anamnesis_submissions (patient_id, created_at desc);

alter table anamnesis_templates enable row level security;
alter table anamnesis_links enable row level security;
alter table anamnesis_submissions enable row level security;

drop policy if exists anamnesis_templates_select on anamnesis_templates;
drop policy if exists anamnesis_templates_insert on anamnesis_templates;
drop policy if exists anamnesis_templates_update on anamnesis_templates;
drop policy if exists anamnesis_templates_delete on anamnesis_templates;
drop policy if exists anamnesis_links_select on anamnesis_links;
drop policy if exists anamnesis_links_insert on anamnesis_links;
drop policy if exists anamnesis_links_update on anamnesis_links;
drop policy if exists anamnesis_submissions_select on anamnesis_submissions;
drop policy if exists anamnesis_submissions_insert on anamnesis_submissions;

create policy anamnesis_templates_select on anamnesis_templates
  for select using (clinic_id = public.get_current_clinic_id());

create policy anamnesis_templates_insert on anamnesis_templates
  for insert with check (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin', 'receptionist')
  );

create policy anamnesis_templates_update on anamnesis_templates
  for update using (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin', 'receptionist')
  )
  with check (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin', 'receptionist')
  );

create policy anamnesis_templates_delete on anamnesis_templates
  for delete using (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin', 'receptionist')
  );

create policy anamnesis_links_select on anamnesis_links
  for select using (clinic_id = public.get_current_clinic_id());

create policy anamnesis_links_insert on anamnesis_links
  for insert with check (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin', 'receptionist')
  );

create policy anamnesis_links_update on anamnesis_links
  for update using (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin', 'receptionist')
  )
  with check (
    clinic_id = public.get_current_clinic_id()
    and public.get_current_role() in ('admin', 'receptionist')
  );

create policy anamnesis_submissions_select on anamnesis_submissions
  for select using (clinic_id = public.get_current_clinic_id());

create policy anamnesis_submissions_insert on anamnesis_submissions
  for insert with check (clinic_id = public.get_current_clinic_id());
