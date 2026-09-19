import '@/lib/load-env';

import { detectAll, type Sample } from '@/lib/analysis/detect';
import { computeScore, type ScoreInput } from '@/lib/analysis/score';
import { FLAG_KINDS, RAW_RETENTION_DAYS, type FlagKind } from '@/lib/constants';
import { istanbulDay, lifespanDays, percentChange } from '@/lib/format';
import { serviceClient, type Db } from '@/lib/supabase/server';

/**
 * Günlük job. GitHub Actions ile günde bir kez çalışır:
 *   1. rollup   — dünü metrics_daily'ye özetle
 *   2. retention— 30 günden eski ham satırları sil (silmeden önce rollup yapılır)
 *   3. flag     — manipülasyon sinyallerini tespit et, geçenleri kapat
 *   4. skor     — 0-100 radar skorunu hesapla
 *   5. mezarlık — uzun süre erişilemeyen sunucuyu 'dead' işaretle
 *
 * counter_offline flag'i burada üretilmez; onu toplayıcı anlık olarak yazar.
 */

const DAY_MS = 86_400_000;

/** Tespit modülünün ürettiği flag türleri (counter_offline hariç). */
const DETECTED_KINDS: readonly FlagKind[] = FLAG_KINDS.filter(
  (kind) => kind !== 'counter_offline',
);

/**
 * Varsayım (ürün kararı): oyun portu ve sayacı bu kadar gün üst üste
 * tamamen erişilemezse sunucu kapanmış sayılır ve mezarlığa taşınır.
 * Yönetim panelinden elle geri alınabilir.
 */
const DEATH_AFTER_DAYS = 7;

function dayString(offsetDays: number): string {
  return istanbulDay(new Date(Date.now() - offsetDays * DAY_MS));
}

// --- 1 & 2: rollup + retention --------------------------------------------

async function rollupAndPrune(db: Db): Promise<void> {
  // Dünü ve bugünü özetle: bugünün verisi henüz tamamlanmadı ama grafikler
  // güncel görünsün; yarın aynı gün yeniden özetlenip üzerine yazılır.
  for (const day of [dayString(1), dayString(0)]) {
    const { error } = await db.rpc('rollup_metrics_daily', { target_day: day });
    if (error) throw new Error(`rollup (${day}) başarısız: ${error.message}`);
    console.log(`Rollup tamam: ${day}`);
  }

  const { data: deleted, error } = await db.rpc('prune_metrics_raw', {
    keep_days: RAW_RETENTION_DAYS,
  });
  if (error) throw new Error(`retention temizliği başarısız: ${error.message}`);
  console.log(`Retention: ${deleted ?? 0} eski ham satır silindi.`);
}

// --- 3: flag tespiti -------------------------------------------------------

async function syncFlags(db: Db, serverId: string, samples: Sample[]): Promise<number> {
  const last24hCutoff = Date.now() - DAY_MS;
  const last24h = samples.filter(
    (sample) => new Date(sample.collectedAt).getTime() >= last24hCutoff,
  );

  const detections = detectAll({ last24h, last7d: samples });
  const detectedKinds = new Set(detections.map((d) => d.kind));

  for (const detection of detections) {
    // ignoreDuplicates: zaten aktif olan flag'in tespit zamanını sıfırlamayız.
    const { error } = await db.from('flags').upsert(
      {
        server_id: serverId,
        kind: detection.kind,
        details: detection.details,
        is_active: true,
      },
      { onConflict: 'server_id,kind', ignoreDuplicates: true },
    );
    if (error) throw new Error(`flag yazılamadı (${detection.kind}): ${error.message}`);
  }

  // Sinyal geçtiyse flag'i kapat.
  const stale = DETECTED_KINDS.filter((kind) => !detectedKinds.has(kind));
  if (stale.length > 0) {
    const { error } = await db
      .from('flags')
      .update({ is_active: false })
      .eq('server_id', serverId)
      .eq('is_active', true)
      .in('kind', stale);
    if (error) throw new Error(`flag kapatılamadı: ${error.message}`);
  }

  return detections.length;
}

// --- 4: skor ---------------------------------------------------------------

type DailyRow = {
  day: string;
  avg_site_online: number | null;
  avg_discord_online: number | null;
  discord_members_eod: number | null;
  uptime_pct: number | null;
};

/**
 * Trend için beyan edilen sayaç varsa onu kullanırız — mutlak değeri değil
 * yüzde değişimi aldığımız için şişirme bizi yanıltmaz. Sayaç yoksa Discord
 * aktif sayısına düşeriz.
 */
function trendSeries(rows: readonly DailyRow[]): { from: number | null; to: number | null } {
  const site = rows.filter((r) => r.avg_site_online !== null);
  const source = site.length >= 2 ? site : rows.filter((r) => r.avg_discord_online !== null);
  if (source.length < 2) return { from: null, to: null };

  const pick = (row: DailyRow): number | null =>
    site.length >= 2 ? row.avg_site_online : row.avg_discord_online;

  return { from: pick(source[0]!), to: pick(source[source.length - 1]!) };
}

function averageOf(values: readonly (number | null)[]): number | null {
  const usable = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (usable.length === 0) return null;
  return usable.reduce((a, b) => a + b, 0) / usable.length;
}

// --- ana akış --------------------------------------------------------------

type ServerInfo = {
  id: string;
  slug: string;
  opens_at: string | null;
  status: 'upcoming' | 'active' | 'dead';
};

export async function runDaily(): Promise<{
  servers: number;
  flags: number;
  scored: number;
  buried: number;
}> {
  const db = serviceClient();

  await rollupAndPrune(db);

  const { data: servers, error: serversError } = await db
    .from('servers')
    .select('id, slug, opens_at, status')
    .neq('status', 'dead');
  if (serversError) throw new Error(`Sunucu listesi okunamadı: ${serversError.message}`);

  const targets: ServerInfo[] = servers ?? [];
  if (targets.length === 0) {
    console.log('İşlenecek sunucu yok.');
    return { servers: 0, flags: 0, scored: 0, buried: 0 };
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const today = dayString(0);

  // Son 7 günün benzersiz tıklayanları — kendi ölçümümüz, en güvenilir sinyal.
  const { data: clickRows, error: clicksError } = await db
    .from('clicks')
    .select('server_id, ip_hash')
    .gte('created_at', sevenDaysAgo);
  if (clicksError) throw new Error(`Tıklamalar okunamadı: ${clicksError.message}`);

  const uniqueClicks = new Map<string, Set<string>>();
  for (const row of clickRows ?? []) {
    if (!row.ip_hash) continue;
    const set = uniqueClicks.get(row.server_id) ?? new Set<string>();
    set.add(row.ip_hash);
    uniqueClicks.set(row.server_id, set);
  }

  let flagCount = 0;
  let scored = 0;
  let buried = 0;

  for (const server of targets) {
    try {
      const { data: raw, error: rawError } = await db
        .from('metrics_raw')
        .select('collected_at, site_online')
        .eq('server_id', server.id)
        .gte('collected_at', sevenDaysAgo)
        .order('collected_at', { ascending: true });
      if (rawError) throw new Error(`ham veri: ${rawError.message}`);

      const samples: Sample[] = (raw ?? []).map((row) => ({
        collectedAt: row.collected_at,
        siteOnline: row.site_online,
      }));

      flagCount += await syncFlags(db, server.id, samples);

      const { count: activeFlags, error: flagCountError } = await db
        .from('flags')
        .select('id', { count: 'exact', head: true })
        .eq('server_id', server.id)
        .eq('is_active', true);
      if (flagCountError) throw new Error(`flag sayısı: ${flagCountError.message}`);

      const { data: daily, error: dailyError } = await db
        .from('metrics_daily')
        .select('day, avg_site_online, avg_discord_online, discord_members_eod, uptime_pct')
        .eq('server_id', server.id)
        .gte('day', dayString(7))
        .order('day', { ascending: true });
      if (dailyError) throw new Error(`günlük veri: ${dailyError.message}`);

      const rows: DailyRow[] = daily ?? [];
      const trend = trendSeries(rows);

      const membersFirst = rows.find((r) => r.discord_members_eod !== null)?.discord_members_eod;
      const membersLast = [...rows]
        .reverse()
        .find((r) => r.discord_members_eod !== null)?.discord_members_eod;
      const memberGrowth =
        membersFirst != null && membersLast != null && membersFirst > 0
          ? percentChange(membersFirst, membersLast)
          : null;

      const avgDiscordOnline = averageOf(rows.map((r) => r.avg_discord_online));
      const activeRatio =
        avgDiscordOnline !== null && membersLast != null && membersLast > 0
          ? avgDiscordOnline / membersLast
          : null;

      const uptime = averageOf(rows.map((r) => r.uptime_pct));

      const input: ScoreInput = {
        trendFrom: trend.from,
        trendTo: trend.to,
        uniqueClicks7d: uniqueClicks.get(server.id)?.size ?? 0,
        discordActiveRatio: activeRatio,
        discordMemberGrowthPct: memberGrowth,
        uptimePct: uptime,
        ageDays: lifespanDays(server.opens_at, null),
        activeFlags: activeFlags ?? 0,
      };

      const { score, breakdown } = computeScore(input);

      const { error: scoreError } = await db
        .from('scores')
        .upsert({ server_id: server.id, day: today, score, breakdown }, { onConflict: 'server_id,day' });
      if (scoreError) throw new Error(`skor yazılamadı: ${scoreError.message}`);
      scored += 1;

      // --- 5: mezarlık ---
      const deathWindow = rows.slice(-DEATH_AFTER_DAYS);
      const longEnough = deathWindow.length >= DEATH_AFTER_DAYS;
      const allDown = deathWindow.every(
        (r) => (r.uptime_pct ?? 0) === 0 && (r.avg_discord_online ?? 0) === 0,
      );

      if (server.status === 'active' && longEnough && allDown) {
        const { error: buryError } = await db
          .from('servers')
          .update({ status: 'dead', died_at: new Date().toISOString() })
          .eq('id', server.id);
        if (buryError) throw new Error(`mezarlığa taşınamadı: ${buryError.message}`);
        buried += 1;
        console.log(`[${server.slug}] ${DEATH_AFTER_DAYS} gün erişilemedi, mezarlığa taşındı.`);
      }
    } catch (error) {
      // Tek sunucunun hatası tüm job'ı düşürmez.
      console.error(
        `[${server.slug}] günlük işlem hatası: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return { servers: targets.length, flags: flagCount, scored, buried };
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const { servers, flags, scored, buried } = await runDaily();
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `Günlük iş tamam: ${servers} sunucu, ${flags} aktif sinyal, ${scored} skor yazıldı, ` +
      `${buried} sunucu mezarlığa taşındı. Süre ${seconds}s.`,
  );
}

if (process.argv[1]?.includes('daily')) {
  main().catch((error: unknown) => {
    console.error('Günlük iş başarısız:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
