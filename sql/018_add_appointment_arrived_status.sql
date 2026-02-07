-- 018_add_appointment_arrived_status.sql
alter table appointments drop constraint if exists appointments_status_check;
alter table appointments add constraint appointments_status_check
  check (status in ('scheduled','confirmed','arrived','in_progress','completed','missed','cancelled'));
