-- 007_add_intake_patient_id.sql
alter table patient_intake_links add column if not exists patient_id uuid references patients(id);
