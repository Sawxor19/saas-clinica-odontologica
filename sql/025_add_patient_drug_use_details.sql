-- 025_add_patient_drug_use_details.sql
alter table patients add column if not exists drug_use_details text;
