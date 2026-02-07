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
