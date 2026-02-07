-- 005_add_patient_cep.sql
alter table patients add column if not exists cep text;
