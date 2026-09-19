import type {
  AdPlacement,
  ClickKind,
  FlagKind,
  ServerStatus,
  ServerType,
} from '@/lib/constants';

/**
 * Elle yazılmış şema tipleri. supabase/migrations/*.sql ile birebir durmalı;
 * migration değişirse burayı da güncelle.
 */

export type OwnerRow = {
  id: string;
  owner_key: string;
  display_name: string | null;
  notes: string | null;
  created_at: string;
};

export type ServerRow = {
  id: string;
  slug: string;
  name: string;
  website_url: string | null;
  download_url: string | null;
  discord_guild_id: string | null;
  discord_invite: string | null;
  game_host: string | null;
  game_port: number | null;
  logo_url: string | null;
  level_range: string | null;
  server_type: ServerType | null;
  opens_at: string | null;
  status: ServerStatus;
  died_at: string | null;
  owner_key: string | null;
  is_verified: boolean;
  counter_selector: string | null;
  counter_url: string | null;
  created_at: string;
};

export type MetricsRawRow = {
  id: number;
  server_id: string;
  collected_at: string;
  site_online: number | null;
  discord_online: number | null;
  discord_members: number | null;
  game_port_up: boolean | null;
  source_errors: Record<string, string> | null;
};

export type MetricsDailyRow = {
  server_id: string;
  day: string;
  avg_site_online: number | null;
  peak_site_online: number | null;
  avg_discord_online: number | null;
  discord_members_eod: number | null;
  uptime_pct: number | null;
  sample_count: number;
};

export type ClickRow = {
  id: number;
  server_id: string;
  kind: ClickKind;
  ip_hash: string | null;
  ua_hash: string | null;
  created_at: string;
};

export type ClicksDailyRow = {
  server_id: string;
  kind: ClickKind;
  day: string;
  total: number;
  unique_visitors: number;
};

export type FlagRow = {
  id: number;
  server_id: string;
  kind: FlagKind;
  detected_at: string;
  details: Record<string, unknown> | null;
  is_active: boolean;
};

export type ScoreRow = {
  server_id: string;
  day: string;
  score: number;
  breakdown: Record<string, number> | null;
};

export type AdRow = {
  id: string;
  server_id: string | null;
  placement: AdPlacement;
  starts_at: string;
  ends_at: string | null;
  image_url: string | null;
  target_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type VoteRow = {
  id: number;
  server_id: string;
  discord_user_id: string;
  created_at: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      owners: Table<OwnerRow, Omit<OwnerRow, 'id' | 'created_at'>>;
      servers: Table<ServerRow, Omit<ServerRow, 'id' | 'created_at'>>;
      metrics_raw: Table<MetricsRawRow, Omit<MetricsRawRow, 'id'>>;
      metrics_daily: Table<MetricsDailyRow, MetricsDailyRow>;
      clicks: Table<ClickRow, Omit<ClickRow, 'id' | 'created_at'>>;
      flags: Table<FlagRow, Omit<FlagRow, 'id' | 'detected_at'>>;
      scores: Table<ScoreRow, ScoreRow>;
      ads: Table<AdRow, Omit<AdRow, 'id' | 'created_at'>>;
      votes: Table<VoteRow, Omit<VoteRow, 'id' | 'created_at'>>;
    };
    Views: {
      clicks_daily: { Row: ClicksDailyRow; Relationships: [] };
    };
    Functions: {
      rollup_metrics_daily: { Args: { target_day: string }; Returns: number };
      prune_metrics_raw: { Args: { keep_days: number }; Returns: number };
    };
    Enums: {
      server_type: ServerType;
      server_status: ServerStatus;
      flag_kind: FlagKind;
      click_kind: ClickKind;
      ad_placement: AdPlacement;
    };
    CompositeTypes: Record<string, never>;
  };
};
