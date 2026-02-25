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
