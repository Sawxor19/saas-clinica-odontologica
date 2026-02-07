-- 014_add_patient_photo.sql
alter table patients add column if not exists photo_path text;
