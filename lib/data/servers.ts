import type { FlagKind, ServerStatus, ServerType } from '@/lib/constants';
import {
  demoDead,
  demoDetail,
  demoLive,
  demoSlugs,
  demoUpcoming,
} from '@/lib/data/demo';
import { istanbulDay, lifespanDays, percentChange } from '@/lib/format';
import { isConfigured, readClient } from '@/lib/supabase/server';
import type { FlagRow, MetricsDailyRow, ServerRow } from '@/lib/supabase/types';

/**
 * Okuma katmanı. Sayfalar doğrudan Supabase'e konuşmaz, buraya konuşur.
 *
 * Supabase henüz bağlanmamışsa (yeni kurulum, .env.local yok) sentetik demo
 * verisi döner — site çökmez, klonlandığı gibi çalışır. Supabase bağlandığı an
 * demo modülü hiç çağrılmaz.
 */

const DAY_MS = 86_400_000;

export type ServerSummary = {
  slug: string;
  name: string;
  logoUrl: string | null;
  serverType: ServerType | null;
  levelRange: string | null;
  status: ServerStatus;
  opensAt: string | null;
  diedAt: string | null;
  isVerified: boolean;
  ownerKey: string | null;

  /** Radar skoru (bağımsız ölçüm). Henüz hesaplanmadıysa null. */
  score: number | null;
  scoreBreakdown: Record<string, number> | null;

  /** 7 günlük yüzde trend — ANA metrik. Mutlak sayı değil. */
  trend7dPct: number | null;
  /**
   * Trend hangi seriden hesaplandı? Beyan edilen sayaçtan türetilen trend
   * ölçeğe duyarsızdır (şişirme çarpanı sadeleşir) ama yine de kaynağı
   * sunucunun kendisidir — rozet bunu doğru söylemek zorunda.
   */
  trendSource: 'declared' | 'measured' | null;

  /** ⚠ sunucunun beyanı, doğrulanmadı. */
  declaredOnline: number | null;
  /** ✅ bağımsız ölçüm. */
  discordOnline: number | null;
  discordMembers: number | null;
  uptimePct: number | null;

  /** Mini grafik için son 14 günün günlük ortalaması. */
  sparkline: number[];

  activeFlags: FlagKind[];

  lifespanDays: number | null;
  peakOnline: number | null;
};

type DailySlice = Pick<
  MetricsDailyRow,
  | 'server_id'
  | 'day'
  | 'avg_site_online'
  | 'avg_discord_online'
  | 'discord_members_eod'
  | 'uptime_pct'
  | 'peak_site_online'
>;

const SERVER_FIELDS =
  'id, slug, name, logo_url, server_type, level_range, status, opens_at, died_at, is_verified, owner_key, website_url, download_url, discord_invite, counter_url, discord_guild_id';

type ServerFields = Pick<
  ServerRow,
  | 'id'
  | 'slug'
  | 'name'
  | 'logo_url'
  | 'server_type'
  | 'level_range'
  | 'status'
  | 'opens_at'
  | 'died_at'
  | 'is_verified'
  | 'owner_key'
  | 'website_url'
  | 'download_url'
  | 'discord_invite'
  | 'counter_url'
  | 'discord_guild_id'
>;

function toSummary(
  server: ServerFields,
  daily: readonly DailySlice[],
  score: { score: number; breakdown: Record<string, number> | null } | undefined,
  flags: readonly FlagKind[],
): ServerSummary {
  const ordered = [...daily].sort((a, b) => a.day.localeCompare(b.day));
  const last14 = ordered.slice(-14);

  const siteSeries = last14
    .map((row) => row.avg_site_online)
    .filter((value): value is number => value !== null);

  const last7 = ordered.slice(-8);

  // Discord bizim bağımsız ölçümümüz: varsa onu tercih ederiz.
  const discordValues = last7
    .map((row) => row.avg_discord_online)
    .filter((value): value is number => value !== null);
  const declaredValues = last7
    .map((row) => row.avg_site_online)
    .filter((value): value is number => value !== null);

  const trendValues = discordValues.length >= 2 ? discordValues : declaredValues;
  const trendSource: 'declared' | 'measured' | null =
    discordValues.length >= 2
      ? 'measured'
      : declaredValues.length >= 2
        ? 'declared'
        : null;

  const trend =
    trendValues.length >= 2
      ? percentChange(trendValues[0]!, trendValues[trendValues.length - 1]!)
      : null;

  const latest = ordered[ordered.length - 1];

  const uptimeValues = last7
    .map((row) => row.uptime_pct)
    .filter((value): value is number => value !== null);

  return {
    slug: server.slug,
    name: server.name,
    logoUrl: server.logo_url,
    serverType: server.server_type,
    levelRange: server.level_range,
    status: server.status,
    opensAt: server.opens_at,
    diedAt: server.died_at,
    isVerified: server.is_verified,
    ownerKey: server.owner_key,

    score: score?.score ?? null,
    scoreBreakdown: score?.breakdown ?? null,

    trend7dPct: trend,
    trendSource,

    declaredOnline: latest?.avg_site_online ?? null,
    discordOnline: latest?.avg_discord_online ?? null,
    discordMembers: latest?.discord_members_eod ?? null,
    uptimePct:
      uptimeValues.length > 0
        ? uptimeValues.reduce((a, b) => a + b, 0) / uptimeValues.length
        : null,

    sparkline: siteSeries.length >= 2 ? siteSeries : [],

    activeFlags: [...flags],

    lifespanDays: lifespanDays(server.opens_at, server.died_at),
    peakOnline: ordered.reduce<number | null>(
      (max, row) =>
        row.peak_site_online !== null && (max === null || row.peak_site_online > max)
          ? row.peak_site_online
          : max,
      null,
    ),
  };
}

/** Tek sorguda tüm sunucuların özetini kurar (N+1 yok). */
async function buildSummaries(statuses: readonly ServerStatus[]): Promise<ServerSummary[]> {
  if (!isConfigured()) return [];

  const db = readClient();

  const { data: servers, error } = await db
    .from('servers')
    .select(SERVER_FIELDS)
    .in('status', [...statuses]);
  if (error || !servers || servers.length === 0) return [];

  const ids = servers.map((s) => s.id);
  const since = istanbulDay(new Date(Date.now() - 95 * DAY_MS));
  const today = istanbulDay();

  const [dailyResult, scoreResult, flagResult] = await Promise.all([
    db
      .from('metrics_daily')
      .select(
        'server_id, day, avg_site_online, avg_discord_online, discord_members_eod, uptime_pct, peak_site_online',
      )
      .in('server_id', ids)
      .gte('day', since),
    db.from('scores').select('server_id, score, breakdown, day').in('server_id', ids).lte('day', today),
    db.from('flags').select('server_id, kind').in('server_id', ids).eq('is_active', true),
  ]);

  const dailyByServer = new Map<string, DailySlice[]>();
  for (const row of dailyResult.data ?? []) {
    const list = dailyByServer.get(row.server_id) ?? [];
    list.push(row);
    dailyByServer.set(row.server_id, list);
  }

  // Sunucu başına en güncel skoru tut.
  const scoreByServer = new Map<string, { score: number; breakdown: Record<string, number> | null; day: string }>();
  for (const row of scoreResult.data ?? []) {
    const current = scoreByServer.get(row.server_id);
    if (!current || row.day > current.day) {
      scoreByServer.set(row.server_id, {
        score: Number(row.score),
        breakdown: row.breakdown,
        day: row.day,
      });
    }
  }

  const flagsByServer = new Map<string, FlagKind[]>();
  for (const row of (flagResult.data ?? []) as Pick<FlagRow, 'server_id' | 'kind'>[]) {
    const list = flagsByServer.get(row.server_id) ?? [];
    list.push(row.kind);
    flagsByServer.set(row.server_id, list);
  }

  return servers.map((server) =>
    toSummary(
      server,
      dailyByServer.get(server.id) ?? [],
      scoreByServer.get(server.id),
      flagsByServer.get(server.id) ?? [],
    ),
  );
}

/** Skora göre "gerçekten canlı olanlar". Reklam bu sıralamayı ETKİLEMEZ. */
export async function getLiveServers(limit = 20): Promise<ServerSummary[]> {
  if (!isConfigured()) return demoLive(limit);
  const all = await buildSummaries(['active']);
  return all
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name, 'tr'))
    .slice(0, limit);
}

/** Yaklaşan açılışlar, en yakın önce. */
export async function getUpcomingServers(limit = 50): Promise<ServerSummary[]> {
  if (!isConfigured()) return demoUpcoming(limit);
  const all = await buildSummaries(['upcoming']);
  return all
    .filter((s) => s.opensAt !== null)
    .sort((a, b) => (a.opensAt ?? '').localeCompare(b.opensAt ?? ''))
    .slice(0, limit);
}

/** Mezarlık: kapanmış sunucular, en son kapanan önce. */
export async function getDeadServers(limit = 100): Promise<ServerSummary[]> {
  if (!isConfigured()) return demoDead(limit);
  const all = await buildSummaries(['dead']);
  return all
    .sort((a, b) => (b.diedAt ?? '').localeCompare(a.diedAt ?? ''))
    .slice(0, limit);
}

export type ServerDetail = ServerSummary & {
  id: string;
  websiteUrl: string | null;
  downloadUrl: string | null;
  discordInvite: string | null;
  counterUrl: string | null;
  discordGuildId: string | null;
  /** Grafik serisi: gün + beyan edilen ortalama + Discord aktif ortalaması. */
  series: { day: string; declared: number | null; discord: number | null }[];
  flags: Pick<FlagRow, 'kind' | 'detected_at' | 'details'>[];
  ownerHistory: {
    slug: string;
    name: string;
    status: ServerStatus;
    lifespanDays: number | null;
  }[];
};

export async function getServerBySlug(slug: string): Promise<ServerDetail | null> {
  if (!isConfigured()) return demoDetail(slug);

  const db = readClient();

  const { data: server, error } = await db
    .from('servers')
    .select(SERVER_FIELDS)
    .eq('slug', slug)
    .maybeSingle();
  if (error || !server) return null;

  const since = istanbulDay(new Date(Date.now() - 95 * DAY_MS));

  const [dailyResult, scoreResult, flagResult] = await Promise.all([
    db
      .from('metrics_daily')
      .select(
        'server_id, day, avg_site_online, avg_discord_online, discord_members_eod, uptime_pct, peak_site_online',
      )
      .eq('server_id', server.id)
      .gte('day', since)
      .order('day', { ascending: true }),
    db
      .from('scores')
      .select('score, breakdown, day')
      .eq('server_id', server.id)
      .order('day', { ascending: false })
      .limit(1),
    db
      .from('flags')
      .select('kind, detected_at, details')
      .eq('server_id', server.id)
      .eq('is_active', true)
      .order('detected_at', { ascending: false }),
  ]);

  const daily: DailySlice[] = dailyResult.data ?? [];
  const scoreRow = scoreResult.data?.[0];
  const flags = flagResult.data ?? [];

  const summary = toSummary(
    server,
    daily,
    scoreRow ? { score: Number(scoreRow.score), breakdown: scoreRow.breakdown } : undefined,
    flags.map((f) => f.kind),
  );

  // Sahibin geçmiş sunucuları: sicil bölümünü besler.
  let ownerHistory: ServerDetail['ownerHistory'] = [];
  if (server.owner_key) {
    const { data: siblings } = await db
      .from('servers')
      .select('slug, name, status, opens_at, died_at')
      .eq('owner_key', server.owner_key)
      .neq('slug', server.slug);

    ownerHistory = (siblings ?? []).map((row) => ({
      slug: row.slug,
      name: row.name,
      status: row.status,
      lifespanDays: lifespanDays(row.opens_at, row.died_at),
    }));
  }

  return {
    ...summary,
    id: server.id,
    websiteUrl: server.website_url,
    downloadUrl: server.download_url,
    discordInvite: server.discord_invite,
    counterUrl: server.counter_url,
    discordGuildId: server.discord_guild_id,
    series: daily.map((row) => ({
      day: row.day,
      declared: row.avg_site_online,
      discord: row.avg_discord_online,
    })),
    flags,
    ownerHistory,
  };
}

export async function getAllServerSlugs(): Promise<string[]> {
  if (!isConfigured()) return demoSlugs();
  const db = readClient();
  const { data } = await db.from('servers').select('slug');
  return (data ?? []).map((row) => row.slug);
}
