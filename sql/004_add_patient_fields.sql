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
