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
