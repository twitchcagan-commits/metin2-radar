-- ===========================================================================
-- Metin2 Radar — başlangıç şeması
-- Kural: public tablolarda yazma yok. Okuma herkese açık, yazma service_role.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- --- enum tipleri ----------------------------------------------------------
create type server_type as enum (
  'emek', 'orta_emek', 'zor_emek', 'wslik', 'farm', 'global', 'official'
);

create type server_status as enum ('upcoming', 'active', 'dead');

create type flag_kind as enum (
  'flatline', 'no_diurnal', 'step_jump', 'round_numbers', 'counter_offline'
);

create type click_kind as enum ('download', 'website', 'discord');

create type ad_placement as enum (
  'sidebar', 'top', 'homepage_block', 'calendar_highlight'
);

-- --- owners ----------------------------------------------------------------
-- Aynı sahibin geçmiş sunucularını bağlamak için. Sicil sayfası buradan beslenir.
create table owners (
  id            uuid primary key default gen_random_uuid(),
  owner_key     text not null unique,
  display_name  text,
  notes         text,
  created_at    timestamptz not null default now()
);

-- --- servers ---------------------------------------------------------------
create table servers (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  website_url       text,
  download_url      text,
  discord_guild_id  text,
  discord_invite    text,
  game_host         text,
  game_port         int check (game_port between 1 and 65535),
  logo_url          text,
  level_range       text,
  server_type       server_type,
  opens_at          timestamptz,
  status            server_status not null default 'upcoming',
  died_at           timestamptz,
  owner_key         text references owners (owner_key) on update cascade on delete set null,
  is_verified       boolean not null default false,
  counter_selector  text,
  counter_url       text,
  created_at        timestamptz not null default now()
);

create index servers_status_idx on servers (status);
create index servers_opens_at_idx on servers (opens_at) where status = 'upcoming';
create index servers_owner_key_idx on servers (owner_key);

-- --- metrics_raw -----------------------------------------------------------
-- 10 dakikalık ham veri. 30 günden eskisi günlük job ile silinir.
-- Tavan: 100 sunucu x 144 örnek/gün x 30 gün ~ 430k satır.
create table metrics_raw (
  id              bigserial primary key,
  server_id       uuid not null references servers (id) on delete cascade,
  collected_at    timestamptz not null default now(),
  site_online     int,
  discord_online  int,
  discord_members int,
  game_port_up    boolean,
  source_errors   jsonb
);

create index metrics_raw_server_time_idx
  on metrics_raw (server_id, collected_at desc);
create index metrics_raw_time_idx on metrics_raw (collected_at);

-- --- metrics_daily ---------------------------------------------------------
-- Kalıcı. 30 günden eski grafikler buradan okunur.
create table metrics_daily (
  server_id           uuid not null references servers (id) on delete cascade,
  day                 date not null,
  avg_site_online     numeric(10, 2),
  peak_site_online    int,
  avg_discord_online  numeric(10, 2),
  discord_members_eod int,
  uptime_pct          numeric(5, 2),
  sample_count        int not null default 0,
  primary key (server_id, day)
);

create index metrics_daily_day_idx on metrics_daily (day desc);

-- --- clicks ----------------------------------------------------------------
-- Kendi tıklama verimiz: en güvenilir sinyal. Ham IP saklanmaz.
create table clicks (
  id          bigserial primary key,
  server_id   uuid not null references servers (id) on delete cascade,
  kind        click_kind not null,
  ip_hash     text,
  ua_hash     text,
  created_at  timestamptz not null default now()
);

create index clicks_server_time_idx on clicks (server_id, created_at desc);
create index clicks_time_idx on clicks (created_at);

-- --- flags -----------------------------------------------------------------
create table flags (
  id           bigserial primary key,
  server_id    uuid not null references servers (id) on delete cascade,
  kind         flag_kind not null,
  detected_at  timestamptz not null default now(),
  details      jsonb,
  is_active    boolean not null default true
);

create index flags_active_idx on flags (server_id) where is_active;
-- Aynı sunucuda aynı türden birden fazla aktif flag olmasın.
create unique index flags_one_active_per_kind
  on flags (server_id, kind) where is_active;

-- --- scores ----------------------------------------------------------------
create table scores (
  server_id  uuid not null references servers (id) on delete cascade,
  day        date not null,
  score      numeric(5, 2) not null check (score >= 0 and score <= 100),
  breakdown  jsonb,
  primary key (server_id, day)
);

create index scores_day_idx on scores (day desc);

-- --- ads -------------------------------------------------------------------
-- Reklam SIRALAMAYI ETKİLEMEZ. Sadece görsel alan, arayüzde "Reklam" etiketli.
create table ads (
  id          uuid primary key default gen_random_uuid(),
  server_id   uuid references servers (id) on delete cascade,
  placement   ad_placement not null,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  image_url   text,
  target_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index ads_live_idx on ads (placement, starts_at, ends_at) where is_active;

-- --- votes -----------------------------------------------------------------
-- Discord girişi zorunlu. 30 günden yeni hesapların oyu sayılmaz (uygulama katmanı).
create table votes (
  id               bigserial primary key,
  server_id        uuid not null references servers (id) on delete cascade,
  discord_user_id  text not null,
  created_at       timestamptz not null default now(),
  unique (server_id, discord_user_id)
);

create index votes_server_idx on votes (server_id);

-- ===========================================================================
-- RLS: public sadece SELECT. Yazma yalnızca service_role (RLS'i baypas eder).
-- ===========================================================================
alter table owners        enable row level security;
alter table servers       enable row level security;
alter table metrics_raw   enable row level security;
alter table metrics_daily enable row level security;
alter table clicks        enable row level security;
alter table flags         enable row level security;
alter table scores        enable row level security;
alter table ads           enable row level security;
alter table votes         enable row level security;

create policy "public read" on owners        for select using (true);
create policy "public read" on servers       for select using (true);
create policy "public read" on metrics_raw   for select using (true);
create policy "public read" on metrics_daily for select using (true);
create policy "public read" on flags         for select using (true);
create policy "public read" on scores        for select using (true);
create policy "public read" on votes         for select using (true);

-- Yayında olan reklamlar görünür.
create policy "public read live ads" on ads for select
  using (is_active and starts_at <= now() and (ends_at is null or ends_at > now()));

-- clicks tablosunda SELECT politikası YOK: ham tıklama satırları (ip_hash,
-- ua_hash) kimseye açılmaz. Sayımlar aşağıdaki toplu görünümden okunur.
create view clicks_daily
  with (security_invoker = off)
  as
select
  server_id,
  kind,
  created_at::date as day,
  count(*)::int as total,
  count(distinct ip_hash)::int as unique_visitors
from clicks
group by server_id, kind, created_at::date;

grant select on clicks_daily to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Açık izinler.
--
-- Supabase projesinde "Automatically expose new tables" kapalı olabilir (panel
-- bunu öneriyor ve daha güvenli). O durumda anon rolünün tablolarda hiçbir
-- yetkisi olmaz ve yukarıdaki RLS politikaları hiçbir işe yaramaz — okuma
-- boş döner. Bu yüzden izinleri ayara bırakmıyoruz, burada açıkça veriyoruz.
--
-- Verilen tek yetki SELECT. INSERT/UPDATE/DELETE hiçbir role verilmez;
-- yazma yalnızca service_role ile yapılır (RLS ve grant'ları baypas eder).
-- ---------------------------------------------------------------------------
grant select on owners        to anon, authenticated;
grant select on servers       to anon, authenticated;
grant select on metrics_raw   to anon, authenticated;
grant select on metrics_daily to anon, authenticated;
grant select on flags         to anon, authenticated;
grant select on scores        to anon, authenticated;
grant select on votes         to anon, authenticated;
grant select on ads           to anon, authenticated;

-- clicks: ham satırlar (ip_hash, ua_hash) kimseye açılmaz.
revoke all on clicks from anon, authenticated;

-- ===========================================================================
-- Rollup + retention. Günlük job bunları çağırır (GitHub Actions).
-- ===========================================================================

-- Verilen günü metrics_raw'dan metrics_daily'ye özetler.
create or replace function rollup_metrics_daily(target_day date)
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  affected int;
begin
  insert into metrics_daily as d (
    server_id, day, avg_site_online, peak_site_online,
    avg_discord_online, discord_members_eod, uptime_pct, sample_count
  )
  select
    m.server_id,
    target_day,
    avg(m.site_online)::numeric(10, 2),
    max(m.site_online),
    avg(m.discord_online)::numeric(10, 2),
    (array_agg(m.discord_members order by m.collected_at desc)
      filter (where m.discord_members is not null))[1],
    (100.0 * count(*) filter (where m.game_port_up)
      / nullif(count(*) filter (where m.game_port_up is not null), 0))::numeric(5, 2),
    count(*)::int
  from metrics_raw m
  where m.collected_at >= target_day::timestamptz
    and m.collected_at < (target_day + 1)::timestamptz
  group by m.server_id
  on conflict (server_id, day) do update set
    avg_site_online     = excluded.avg_site_online,
    peak_site_online    = excluded.peak_site_online,
    avg_discord_online  = excluded.avg_discord_online,
    discord_members_eod = excluded.discord_members_eod,
    uptime_pct          = excluded.uptime_pct,
    sample_count        = excluded.sample_count;

  get diagnostics affected = row_count;
  return affected;
end;
$fn$;

-- Silmeden ÖNCE rollup yapar, sonra eski ham satırları temizler.
create or replace function prune_metrics_raw(keep_days int default 30)
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  cutoff date := (now() at time zone 'Europe/Istanbul')::date - keep_days;
  d date;
  deleted int;
begin
  -- Kesim tarihinden eski, henüz özetlenmemiş günleri özetle.
  for d in
    select distinct (collected_at at time zone 'Europe/Istanbul')::date
    from metrics_raw
    where collected_at < cutoff::timestamptz
  loop
    perform rollup_metrics_daily(d);
  end loop;

  delete from metrics_raw where collected_at < cutoff::timestamptz;
  get diagnostics deleted = row_count;
  return deleted;
end;
$fn$;

revoke all on function rollup_metrics_daily(date) from public, anon, authenticated;
revoke all on function prune_metrics_raw(int) from public, anon, authenticated;
