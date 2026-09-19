import '@/lib/load-env';

import { announcementEmbed } from '@/lib/discord/embeds';
import { lifespanDays } from '@/lib/format';
import { serviceClient } from '@/lib/supabase/server';
import type { ServerSummary } from '@/lib/data/servers';

/**
 * Açılış duyurusu. GitHub Actions ile saatlik çalışır.
 *
 * Açılışa 30 dakikadan az kalan ve henüz duyurulmamış sunucular için
 * kayıtlı webhook'lara embed gönderir. Gönderim `announcements` tablosuna
 * yazılır — aynı duyuru ikinci kez gitmez.
 *
 * Kalıcı süreç yok, websocket yok: sadece HTTP POST.
 */

const WINDOW_MINUTES = 30;

function webhooks(): string[] {
  return (process.env.DISCORD_ANNOUNCE_WEBHOOK_URL ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.startsWith('https://'));
}

export async function runAnnounce(): Promise<{ found: number; sent: number }> {
  const targets = webhooks();
  if (targets.length === 0) {
    console.log('Kayıtlı webhook yok, duyuru gönderilmedi.');
    return { found: 0, sent: 0 };
  }

  const db = serviceClient();
  const now = Date.now();
  const until = new Date(now + WINDOW_MINUTES * 60_000).toISOString();

  const { data: servers, error } = await db
    .from('servers')
    .select('id, slug, name, server_type, level_range, opens_at, status, logo_url')
    .eq('status', 'upcoming')
    .not('opens_at', 'is', null)
    .lte('opens_at', until)
    .gte('opens_at', new Date(now).toISOString());

  if (error) throw new Error(`Sunucular okunamadı: ${error.message}`);

  const candidates = servers ?? [];
  if (candidates.length === 0) return { found: 0, sent: 0 };

  // Daha önce duyurulanları ele.
  const { data: already } = await db
    .from('announcements')
    .select('server_id')
    .eq('kind', 'opening_soon')
    .in(
      'server_id',
      candidates.map((server) => server.id),
    );

  const announced = new Set((already ?? []).map((row) => row.server_id));
  const pending = candidates.filter((server) => !announced.has(server.id));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://metin2radar.vercel.app';
  let sent = 0;

  for (const server of pending) {
    // Duyuru kaydını ÖNCE yaz: gönderim yarıda kalsa bile ikinci kez
    // denenmesin. Eksik duyuru, iki kez duyurudan iyidir.
    const { error: claimError } = await db
      .from('announcements')
      .insert({ server_id: server.id, kind: 'opening_soon' });

    if (claimError) {
      // unique ihlali: başka bir çalıştırma aynı anda aldı.
      continue;
    }

    const summary: Pick<
      ServerSummary,
      'slug' | 'name' | 'serverType' | 'levelRange' | 'opensAt' | 'status' | 'lifespanDays'
    > = {
      slug: server.slug,
      name: server.name,
      serverType: server.server_type,
      levelRange: server.level_range,
      opensAt: server.opens_at,
      status: server.status,
      lifespanDays: lifespanDays(server.opens_at, null),
    };

    const embed = announcementEmbed(summary as ServerSummary, siteUrl);

    for (const url of targets) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ embeds: [embed] }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) {
          console.error(`[${server.slug}] webhook ${response.status}`);
          continue;
        }
        sent += 1;
      } catch (caught) {
        console.error(
          `[${server.slug}] webhook hatası: ${
            caught instanceof Error ? caught.message : String(caught)
          }`,
        );
      }
    }
  }

  return { found: pending.length, sent };
}

async function main(): Promise<void> {
  const { found, sent } = await runAnnounce();
  console.log(`Duyuru tamam: ${found} sunucu duyuruldu, ${sent} webhook gönderimi.`);
}

if (process.argv[1]?.includes('announce')) {
  main().catch((error: unknown) => {
    console.error('Duyuru başarısız:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
