import 'dotenv/config';

import { COLLECT_CONCURRENCY } from '@/lib/constants';
import { serviceClient, type Db } from '@/lib/supabase/server';
import type { MetricsRawRow, ServerRow } from '@/lib/supabase/types';

import { mapWithConcurrency } from '@/collector/pool';
import { readDiscordWidget } from '@/collector/sources/discord';
import { readSiteCounter } from '@/collector/sources/counter';
import { checkPort } from '@/collector/sources/port';

/**
 * 10 dakikalık toplayıcı. GitHub Actions ile çalışır (Vercel cron'da DEĞİL —
 * Hobby planında cron günde 1 kez tetiklenir).
 *
 * Tasarım kuralı: bir kaynak patlarsa diğerleri yazılmaya devam eder.
 * Hiçbir sunucunun hatası job'ı düşürmez.
 */

type Sample = Omit<MetricsRawRow, 'id'>;

type CollectTarget = Pick<
  ServerRow,
  'id' | 'slug' | 'discord_guild_id' | 'counter_url' | 'counter_selector' | 'game_host' | 'game_port'
>;

/** Tek sunucu için üç kaynağı sırayla dener ve tek satır üretir. */
export async function collectServer(
  server: CollectTarget,
  now: Date = new Date(),
): Promise<{ sample: Sample; selectorFailed: boolean }> {
  const errors: Record<string, string> = {};

  let discordOnline: number | null = null;
  let discordMembers: number | null = null;
  if (server.discord_guild_id) {
    const discord = await readDiscordWidget(server.discord_guild_id);
    discordOnline = discord.online;
    discordMembers = discord.members;
    if (discord.error) errors.discord = discord.error;
  }

  let siteOnline: number | null = null;
  let selectorFailed = false;
  if (server.counter_url && server.counter_selector) {
    const counter = await readSiteCounter(server.counter_url, server.counter_selector);
    siteOnline = counter.online;
    selectorFailed = counter.selectorFailed;
    if (counter.error) errors.counter = counter.error;
  }

  let portUp: boolean | null = null;
  if (server.game_host && server.game_port) {
    const port = await checkPort(server.game_host, server.game_port);
    portUp = port.up;
    if (port.error) errors.port = port.error;
  }

  return {
    selectorFailed,
    sample: {
      server_id: server.id,
      collected_at: now.toISOString(),
      site_online: siteOnline,
      discord_online: discordOnline,
      discord_members: discordMembers,
      game_port_up: portUp,
      source_errors: Object.keys(errors).length > 0 ? errors : null,
    },
  };
}

/** Sayaç okunamıyorsa counter_offline flag'ini açar, okunuyorsa kapatır. */
async function syncCounterFlag(
  db: Db,
  serverId: string,
  failed: boolean,
  detail: string | null,
): Promise<void> {
  if (failed) {
    await db.from('flags').upsert(
      {
        server_id: serverId,
        kind: 'counter_offline',
        details: { reason: detail ?? 'bilinmiyor' },
        is_active: true,
      },
      { onConflict: 'server_id,kind', ignoreDuplicates: true },
    );
    return;
  }

  await db
    .from('flags')
    .update({ is_active: false })
    .eq('server_id', serverId)
    .eq('kind', 'counter_offline')
    .eq('is_active', true);
}

export async function runCollection(): Promise<{
  scanned: number;
  written: number;
  failed: number;
}> {
  const db = serviceClient();

  const { data: servers, error } = await db
    .from('servers')
    .select(
      'id, slug, discord_guild_id, counter_url, counter_selector, game_host, game_port',
    )
    .neq('status', 'dead');

  if (error) throw new Error(`Sunucu listesi okunamadı: ${error.message}`);

  const targets: CollectTarget[] = servers ?? [];
  if (targets.length === 0) {
    console.log('İzlenecek sunucu yok.');
    return { scanned: 0, written: 0, failed: 0 };
  }

  const now = new Date();
  const results = await mapWithConcurrency(targets, COLLECT_CONCURRENCY, (server) =>
    collectServer(server, now),
  );

  const samples: Sample[] = [];
  let failed = 0;

  for (const [index, result] of results.entries()) {
    const server = targets[index];
    if (!server) continue;

    if (!result.ok) {
      failed += 1;
      console.error(`[${server.slug}] toplama patladı: ${result.error.message}`);
      continue;
    }

    samples.push(result.value.sample);

    const detail = result.value.sample.source_errors?.counter ?? null;
    try {
      await syncCounterFlag(db, server.id, result.value.selectorFailed, detail);
    } catch (flagError) {
      console.error(
        `[${server.slug}] flag güncellenemedi: ${
          flagError instanceof Error ? flagError.message : String(flagError)
        }`,
      );
    }
  }

  if (samples.length > 0) {
    const insert = await db.from('metrics_raw').insert(samples);
    if (insert.error) throw new Error(`metrics_raw yazılamadı: ${insert.error.message}`);
  }

  return { scanned: targets.length, written: samples.length, failed };
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const { scanned, written, failed } = await runCollection();
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `Toplama tamam: ${scanned} sunucu tarandı, ${written} satır yazıldı, ` +
      `${failed} sunucu hata verdi. Süre ${seconds}s.`,
  );
}

// Doğrudan çalıştırıldığında (npm run collect:once) main tetiklenir.
if (process.argv[1]?.includes('collector')) {
  main().catch((error: unknown) => {
    console.error('Toplama başarısız:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
