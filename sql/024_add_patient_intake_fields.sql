-- 024_add_patient_intake_fields.sql
alter table patients add column if not exists smoker boolean;
alter table patients add column if not exists drinker boolean;
alter table patients add column if not exists drug_use boolean;
alter table patients add column if not exists signature_path text;
