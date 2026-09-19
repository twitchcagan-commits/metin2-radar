import { computeScore } from '@/lib/analysis/score';
import type { FlagKind, ServerStatus, ServerType } from '@/lib/constants';
import type { ServerDetail, ServerSummary } from '@/lib/data/servers';
import { istanbulDay, lifespanDays, percentChange } from '@/lib/format';

/**
 * DEMO MODU — sadece Supabase bağlanmamışken devreye girer.
 *
 * Amaç: proje klonlandığında hiçbir hesap açmadan `npm run dev` ile sitenin
 * gerçek hâli görülebilsin. Veriler tamamen sentetik; sunucu isimleri uydurma.
 * Supabase bağlandığı an bu modül hiç çağrılmaz.
 */

const DAY_MS = 86_400_000;

type Seed = {
  slug: string;
  name: string;
  type: ServerType;
  levelRange: string;
  status: ServerStatus;
  /**
   * Sunucunun kaç gündür açık olduğu (negatif = henüz açılmadı).
   * Kapanmış sunucuda bu, yaşadığı gün sayısıdır; açılış tarihi
   * diedDaysAgo + ageDays kadar geriye alınır.
   */
  ageDays: number;
  /** Kaç gün önce kapandı. Sadece status === 'dead' için. */
  diedDaysAgo?: number;
  peakOnline: number;
  /** Günlük büyüme oranı; 1'in altı düşüş. */
  growth: number;
  /** Sayaç şişirme çarpanı — trendi ve tespiti etkilemez, sadece beyanı büyütür. */
  inflation: number;
  /** Sayaç düz mü? true ise flatline + no_diurnal yakalanır. */
  flat: boolean;
  verified: boolean;
  ownerKey: string | null;
  members: number;
  uptime: number;
  clicks: number;
};

const SEEDS: Seed[] = [
  {
    slug: 'demo-anka2',
    name: 'Anka2',
    type: 'orta_emek',
    levelRange: '1-120',
    status: 'active',
    ageDays: 184,
    peakOnline: 1180,
    growth: 1.004,
    inflation: 1,
    flat: false,
    verified: true,
    ownerKey: 'anka',
    members: 9400,
    uptime: 99.4,
    clicks: 310,
  },
  {
    slug: 'demo-global-arena',
    name: 'Global Arena',
    type: 'global',
    levelRange: '1-120',
    status: 'active',
    ageDays: 412,
    peakOnline: 2600,
    growth: 1.001,
    inflation: 1,
    flat: false,
    verified: true,
    ownerKey: 'anka',
    members: 22000,
    uptime: 99.9,
    clicks: 480,
  },
  {
    slug: 'demo-kartal-pvp',
    name: 'Kartal PVP',
    type: 'wslik',
    levelRange: '1-105',
    status: 'active',
    ageDays: 23,
    peakOnline: 90,
    growth: 0.97,
    inflation: 40,
    flat: true,
    verified: false,
    ownerKey: 'kartal',
    members: 1300,
    uptime: 82.1,
    clicks: 38,
  },
  {
    slug: 'demo-hedef2',
    name: 'Hedef2',
    type: 'emek',
    levelRange: '1-99',
    status: 'active',
    ageDays: 61,
    peakOnline: 420,
    growth: 0.988,
    inflation: 3,
    flat: false,
    verified: false,
    ownerKey: null,
    members: 3100,
    uptime: 96.2,
    clicks: 120,
  },
  {
    slug: 'demo-zirve2',
    name: 'Zirve2',
    type: 'zor_emek',
    levelRange: '1-99',
    status: 'upcoming',
    ageDays: -3,
    peakOnline: 0,
    growth: 1,
    inflation: 1,
    flat: false,
    verified: false,
    ownerKey: null,
    members: 780,
    uptime: 0,
    clicks: 0,
  },
  {
    slug: 'demo-alev2',
    name: 'Alev2',
    type: 'farm',
    levelRange: '1-250',
    status: 'upcoming',
    ageDays: -9,
    peakOnline: 0,
    growth: 1,
    inflation: 1,
    flat: false,
    verified: false,
    ownerKey: 'kartal',
    members: 240,
    uptime: 0,
    clicks: 0,
  },
  {
    slug: 'demo-firtina',
    name: 'Fırtına',
    type: 'farm',
    levelRange: '1-250',
    status: 'dead',
    ageDays: 34,
    diedDaysAgo: 77,
    peakOnline: 640,
    growth: 0.94,
    inflation: 8,
    flat: false,
    verified: false,
    ownerKey: 'kartal',
    members: 2100,
    uptime: 0,
    clicks: 4,
  },
  {
    slug: 'demo-efsane2',
    name: 'Efsane2',
    type: 'emek',
    levelRange: '1-105',
    status: 'dead',
    ageDays: 41,
    diedDaysAgo: 210,
    peakOnline: 210,
    growth: 0.9,
    inflation: 20,
    flat: true,
    verified: false,
    ownerKey: 'kartal',
    members: 900,
    uptime: 0,
    clicks: 2,
  },
];

/** Deterministik sözde rastgele — her yüklemede aynı grafik çıksın. */
function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

type Point = { day: string; declared: number | null; discord: number | null };

function buildSeries(seed: Seed): Point[] {
  if (seed.status === 'upcoming') return [];

  const random = rng(seed.slug.length * 7919);
  const span = Math.min(90, Math.max(2, seed.ageDays));
  const points: Point[] = [];

  // Kapanmış sunucuda seri ölüm gününde biter.
  const endOffset = seed.diedDaysAgo ?? 0;

  for (let i = span - 1; i >= 0; i -= 1) {
    const dayOffset = i + endOffset;
    const day = istanbulDay(new Date(Date.now() - dayOffset * DAY_MS));

    const progress = span - 1 - i;
    const level = seed.peakOnline * seed.growth ** progress;
    const wobble = seed.flat ? 0 : (random() - 0.5) * level * 0.22;
    const base = Math.max(0, level + wobble);

    const discord = Math.round(base * 0.34);
    const declaredRaw = base * seed.inflation;
    // Düz sayaçlar ayrıca yuvarlak sayı üretir — round_numbers sinyali.
    const declared = seed.flat
      ? Math.round(declaredRaw / 50) * 50
      : Math.round(declaredRaw);

    points.push({ day, declared, discord });
  }

  return points;
}

function flagsFor(seed: Seed): FlagKind[] {
  if (!seed.flat) return [];
  return ['flatline', 'no_diurnal', 'round_numbers'];
}

function toSummary(seed: Seed): ServerSummary {
  const series = buildSeries(seed);
  const declared = series
    .map((p) => p.declared)
    .filter((v): v is number => v !== null);
  const discord = series.map((p) => p.discord).filter((v): v is number => v !== null);

  // Discord bizim bağımsız ölçümümüz; trend için onu tercih ediyoruz.
  const window = discord.slice(-8);
  const declaredWindow = declared.slice(-8);
  const trend =
    window.length >= 2 ? percentChange(window[0]!, window[window.length - 1]!) : null;

  const flags = flagsFor(seed);
  // Kapanmışsa açılış, kapanıştan yaşadığı gün kadar öncesidir.
  const openedDaysAgo = seed.ageDays + (seed.diedDaysAgo ?? 0);
  const opensAt =
    seed.ageDays === 0 ? null : new Date(Date.now() - openedDaysAgo * DAY_MS).toISOString();
  const diedAt =
    seed.diedDaysAgo === undefined
      ? null
      : new Date(Date.now() - seed.diedDaysAgo * DAY_MS).toISOString();

  const lastDiscord = discord[discord.length - 1] ?? null;
  const { score, breakdown } = computeScore({
    trendFrom: declaredWindow[0] ?? null,
    trendTo: declaredWindow[declaredWindow.length - 1] ?? null,
    uniqueClicks7d: seed.clicks,
    discordActiveRatio: lastDiscord === null ? null : lastDiscord / seed.members,
    discordMemberGrowthPct: seed.growth > 1 ? 4 : -2,
    uptimePct: seed.status === 'dead' ? 0 : seed.uptime,
    ageDays: lifespanDays(opensAt, diedAt),
    activeFlags: flags.length,
  });

  return {
    slug: seed.slug,
    name: seed.name,
    logoUrl: null,
    serverType: seed.type,
    levelRange: seed.levelRange,
    status: seed.status,
    opensAt,
    diedAt,
    isVerified: seed.verified,
    ownerKey: seed.ownerKey,

    score: seed.status === 'upcoming' ? null : score,
    scoreBreakdown: seed.status === 'upcoming' ? null : { ...breakdown },

    trend7dPct: trend,
    trendSource: window.length >= 2 ? 'measured' : null,
    declaredOnline: declared[declared.length - 1] ?? null,
    discordOnline: lastDiscord,
    discordMembers: seed.members,
    uptimePct: seed.status === 'dead' ? 0 : seed.uptime,

    sparkline: declared.slice(-14),
    activeFlags: flags,

    lifespanDays: lifespanDays(opensAt, diedAt),
    peakOnline: declared.length > 0 ? Math.max(...declared) : null,
  };
}

const SUMMARIES = SEEDS.map(toSummary);

export function demoLive(limit: number): ServerSummary[] {
  return SUMMARIES.filter((s) => s.status === 'active')
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .slice(0, limit);
}

export function demoUpcoming(limit: number): ServerSummary[] {
  return SUMMARIES.filter((s) => s.status === 'upcoming')
    .sort((a, b) => (a.opensAt ?? '').localeCompare(b.opensAt ?? ''))
    .slice(0, limit);
}

export function demoDead(limit: number): ServerSummary[] {
  return SUMMARIES.filter((s) => s.status === 'dead')
    .sort((a, b) => (b.diedAt ?? '').localeCompare(a.diedAt ?? ''))
    .slice(0, limit);
}

export function demoSlugs(): string[] {
  return SEEDS.map((s) => s.slug);
}

export function demoDetail(slug: string): ServerDetail | null {
  const index = SEEDS.findIndex((s) => s.slug === slug);
  if (index === -1) return null;

  const seed = SEEDS[index]!;
  const summary = SUMMARIES[index]!;

  const ownerHistory = seed.ownerKey
    ? SEEDS.filter((s) => s.ownerKey === seed.ownerKey && s.slug !== seed.slug).map((s) => {
        const other = SUMMARIES[SEEDS.indexOf(s)]!;
        return {
          slug: s.slug,
          name: s.name,
          status: s.status,
          lifespanDays: other.lifespanDays,
        };
      })
    : [];

  return {
    ...summary,
    id: `demo-${slug}`,
    websiteUrl: 'https://example.com',
    downloadUrl: 'https://example.com/indir',
    discordInvite: 'https://discord.gg/example',
    counterUrl: 'https://example.com',
    discordGuildId: null,
    series: buildSeries(seed),
    flags: summary.activeFlags.map((kind) => ({
      kind,
      detected_at: new Date(Date.now() - DAY_MS).toISOString(),
      details: { demo: 1 },
    })),
    ownerHistory,
  };
}

export type DemoOwner = {
  ownerKey: string;
  displayName: string;
  servers: ServerSummary[];
};

export function demoOwner(ownerKey: string): DemoOwner | null {
  const servers = SUMMARIES.filter((s) => s.ownerKey === ownerKey);
  if (servers.length === 0) return null;

  const names: Record<string, string> = { anka: 'Anka Yapım', kartal: 'Kartal' };
  return { ownerKey, displayName: names[ownerKey] ?? ownerKey, servers };
}
