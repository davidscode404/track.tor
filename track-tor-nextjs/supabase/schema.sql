create extension if not exists "pgcrypto";

create table if not exists farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  boundary_geojson jsonb not null,
  area_hectares numeric not null check (area_hectares > 0),
  centroid_lat numeric not null,
  centroid_lng numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists farm_monthly_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  month date not null,
  fertilizer_kg numeric not null check (fertilizer_kg >= 0),
  fertilizer_cost_usd numeric not null check (fertilizer_cost_usd >= 0),
  expected_yield_tons numeric not null check (expected_yield_tons >= 0),
  actual_total_cost_usd numeric not null check (actual_total_cost_usd >= 0),
  notes text,
  unique (farm_id, month)
);

create table if not exists weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  rain_mm numeric not null,
  avg_wind_mps numeric not null,
  dry_index numeric not null check (dry_index >= 0 and dry_index <= 1),
  source text not null,
  raw_payload jsonb not null,
  unique (farm_id, period_start, period_end, source)
);

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  target_month date not null,
  base_cost_usd numeric not null,
  optimistic_cost_usd numeric not null,
  pessimistic_cost_usd numeric not null,
  delta_vs_last_month_pct numeric not null,
  dry_season boolean not null,
  explanation jsonb not null,
  model_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_farm_monthly_records_farm_id_month on farm_monthly_records(farm_id, month desc);
create index if not exists idx_predictions_farm_id_target_month on predictions(farm_id, target_month desc);
