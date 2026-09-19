-- ===========================================================================
-- Açılış duyuruları için gönderim kaydı.
-- Tek amacı: aynı duyuru iki kez gitmesin. Saatlik job her çalıştığında
-- açılışa 30 dk kalan sunucuları bulur; bu tablo olmadan her saat aynı
-- duyuruyu tekrar gönderirdi.
-- ===========================================================================

create type announcement_kind as enum ('opening_soon');

create table announcements (
  id         bigserial primary key,
  server_id  uuid not null references servers (id) on delete cascade,
  kind       announcement_kind not null,
  sent_at    timestamptz not null default now(),
  -- Aynı sunucu için aynı türden duyuru bir kez gönderilir.
  unique (server_id, kind)
);

alter table announcements enable row level security;
-- Public okumaya gerek yok: bu tablo tamamen iç işleyiş.
-- Yazma ve okuma yalnızca service_role (RLS'i baypas eder).
