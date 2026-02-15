alter table daily_evaluations
  drop constraint if exists daily_evaluations_status_check;

alter table daily_evaluations
  add constraint daily_evaluations_status_check
  check (status in ('go', 'mellow', 'tough'));
