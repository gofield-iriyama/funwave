create table if not exists spots (
  id text primary key,
  name_ja text not null,
  latitude double precision not null,
  longitude double precision not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists forecast_slots (
  id bigserial primary key,
  spot_id text not null references spots(id) on delete cascade,
  forecast_date date not null,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  wave_height_m double precision not null,
  wave_period_s double precision not null,
  wind_speed_ms double precision not null,
  wind_direction_deg double precision not null,
  score_beginner double precision not null,
  score_intermediate double precision not null,
  score_advanced double precision not null,
  batch_id uuid not null,
  source text not null,
  created_at timestamptz not null default now(),
  unique (spot_id, slot_start)
);

create index if not exists idx_forecast_slots_spot_date
  on forecast_slots (spot_id, forecast_date desc);

create table if not exists daily_evaluations (
  id bigserial primary key,
  spot_id text not null references spots(id) on delete cascade,
  forecast_date date not null,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  status text not null check (status in ('go', 'tough')),
  reason text not null,
  score double precision not null,
  best_slot_start timestamptz,
  best_slot_end timestamptz,
  source text not null,
  updated_at timestamptz not null,
  unique (spot_id, forecast_date, level)
);

create index if not exists idx_daily_evaluations_level
  on daily_evaluations (level, forecast_date desc, updated_at desc);

create table if not exists spot_runtime_status (
  spot_id text primary key references spots(id) on delete cascade,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  last_batch_id uuid,
  updated_at timestamptz not null default now()
);

insert into spots (id, name_ja, latitude, longitude, sort_order)
values
  ('komatsu',  '小松', 34.085, 134.613, 1),
  ('ikumi',    '生見', 33.558, 134.303, 2),
  ('ukibuchi', '浮鞭', 33.021, 133.078, 3)
on conflict (id) do update
set
  name_ja = excluded.name_ja,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  sort_order = excluded.sort_order,
  updated_at = now();
