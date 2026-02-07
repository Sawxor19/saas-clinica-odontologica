-- 019_add_profile_permissions.sql
alter table profiles add column if not exists permissions jsonb;
