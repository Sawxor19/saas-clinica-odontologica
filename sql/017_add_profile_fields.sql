-- 017_add_profile_fields.sql
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists cpf text;
alter table profiles add column if not exists cro text;
alter table profiles add column if not exists birth_date date;
alter table profiles add column if not exists address text;
alter table profiles add column if not exists cep text;
alter table profiles add column if not exists photo_path text;