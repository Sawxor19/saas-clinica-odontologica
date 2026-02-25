-- 032_clinical_documents.sql

alter table prescriptions
  add column if not exists document_type text default 'prescription',
  add column if not exists title text,
  add column if not exists file_path text,
  add column if not exists file_name text;

create index if not exists prescriptions_patient_created_idx
  on prescriptions (patient_id, created_at desc);
