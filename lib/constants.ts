export const TIMEZONE = 'Europe/Istanbul';

export const SERVER_TYPES = [
  'emek',
  'orta_emek',
  'zor_emek',
  'wslik',
  'farm',
  'global',
  'official',
] as const;
export type ServerType = (typeof SERVER_TYPES)[number];

export const SERVER_STATUSES = ['upcoming', 'active', 'dead'] as const;
export type ServerStatus = (typeof SERVER_STATUSES)[number];

export const FLAG_KINDS = [
  'flatline',
  'no_diurnal',
  'step_jump',
  'round_numbers',
  'counter_offline',
] as const;
export type FlagKind = (typeof FLAG_KINDS)[number];

export const CLICK_KINDS = ['download', 'website', 'discord'] as const;
export type ClickKind = (typeof CLICK_KINDS)[number];

export const AD_PLACEMENTS = [
  'sidebar',
  'top',
  'homepage_block',
  'calendar_highlight',
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

/** metrics_raw bu günden eskisi silinir (Supabase Free 500MB sınırı). */
export const RAW_RETENTION_DAYS = 30;

/** Toplayıcı ayarları. */
export const COLLECT_CONCURRENCY = 10;
export const REQUEST_TIMEOUT_MS = 8000;
export const PORT_TIMEOUT_MS = 3000;
export const USER_AGENT =
  'Metin2RadarBot/0.1 (+https://metin2radar.vercel.app/hakkinda; ölçüm amaçlı, 10dk aralık)';
