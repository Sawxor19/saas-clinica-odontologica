-- 016_add_attachments_category.sql
alter table attachments add column if not exists category text default 'document';
