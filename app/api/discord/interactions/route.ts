import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  graveyardEmbed,
  serverEmbed,
  upcomingEmbed,
  type Embed,
} from '@/lib/discord/embeds';
import { verifySignature } from '@/lib/discord/verify';
import {
  getDeadServers,
  getLiveServers,
  getServerBySlug,
  getUpcomingServers,
  type ServerSummary,
} from '@/lib/data/servers';
import { tr } from '@/lib/i18n/tr';

export const runtime = 'nodejs';

/**
 * Discord HTTP Interactions ucu.
 *
 * Websocket/gateway bot YOK, kalıcı süreç YOK — Vercel Hobby'de kalıcı süreç
 * çalıştıramayız ve buna ihtiyacımız da yok. Discord komutu buraya HTTP
 * isteği olarak gelir, biz cevabı aynı istekte döneriz.
 *
 * İmzası doğrulanmayan her istek 401 alır. Bu kapı açık kalırsa herkes
 * bizim adımıza komut çalıştırabilir.
 */

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 } as const;
const CallbackType = { PONG: 1, CHANNEL_MESSAGE_WITH_SOURCE: 4 } as const;
/** Sadece komutu yazan görür — kanalları kirletmiyoruz. */
const EPHEMERAL = 1 << 6;

const interactionSchema = z.object({
  type: z.number().int(),
  data: z
    .object({
      name: z.string(),
      options: z
        .array(z.object({ name: z.string(), value: z.unknown() }))
        .optional(),
    })
    .optional(),
});

function reply(embeds: Embed[]): NextResponse {
  return NextResponse.json({
    type: CallbackType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds, flags: EPHEMERAL },
  });
}

/** `/sv <isim>` için basit isim eşleştirme: slug, tam ad, sonra parça. */
function findByName(servers: readonly ServerSummary[], query: string): ServerSummary | null {
  const needle = query.trim().toLocaleLowerCase('tr');
  if (needle === '') return null;

  return (
    servers.find((s) => s.slug === needle) ??
    servers.find((s) => s.name.toLocaleLowerCase('tr') === needle) ??
    servers.find((s) => s.name.toLocaleLowerCase('tr').includes(needle)) ??
    null
  );
}

async function handleCommand(
  name: string,
  options: { name: string; value: unknown }[] | undefined,
  siteUrl: string,
): Promise<NextResponse> {
  switch (name) {
    case 'acilislar': {
      const servers = await getUpcomingServers(10);
      return reply([upcomingEmbed(servers, siteUrl)]);
    }

    case 'mezarlik': {
      const servers = await getDeadServers(10);
      return reply([graveyardEmbed(servers, siteUrl)]);
    }

    case 'sv': {
      const raw = options?.find((option) => option.name === 'isim')?.value;
      const query = typeof raw === 'string' ? raw : '';

      // Önce doğrudan slug dene, tutmazsa isim üzerinden ara.
      const direct = await getServerBySlug(query.trim().toLowerCase());
      if (direct) return reply([serverEmbed(direct, siteUrl)]);

      const [live, upcoming, dead] = await Promise.all([
        getLiveServers(200),
        getUpcomingServers(100),
        getDeadServers(100),
      ]);
      const candidates = [...live, ...upcoming, ...dead];
      const match = findByName(candidates, query);
      const detail = match ? await getServerBySlug(match.slug) : null;

      if (!detail) {
        return reply([
          {
            title: 'Bulunamadı',
            description: `"${query}" diye bir sunucu izlemiyoruz. ${tr.empty.noServers.line}`,
            color: 0x6b727d,
          },
        ]);
      }

      return reply([serverEmbed(detail, siteUrl)]);
    }

    default:
      return reply([
        { title: 'Bilinmeyen komut', description: name, color: 0x6b727d },
      ]);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  // İmza ham gövde üzerinden doğrulanır; JSON'a çevirmeden önce okumalıyız.
  const rawBody = await request.text();

  const valid = verifySignature(
    rawBody,
    request.headers.get('x-signature-ed25519'),
    request.headers.get('x-signature-timestamp'),
    process.env.DISCORD_PUBLIC_KEY,
  );

  if (!valid) {
    return NextResponse.json({ error: 'invalid request signature' }, { status: 401 });
  }

  const parsed = interactionSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad interaction' }, { status: 400 });
  }

  if (parsed.data.type === InteractionType.PING) {
    return NextResponse.json({ type: CallbackType.PONG });
  }

  if (parsed.data.type !== InteractionType.APPLICATION_COMMAND || !parsed.data.data) {
    return NextResponse.json({ error: 'unsupported interaction' }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  try {
    return await handleCommand(parsed.data.data.name, parsed.data.data.options, siteUrl);
  } catch (error) {
    console.error('Discord komutu patladı:', error instanceof Error ? error.message : error);
    return reply([{ title: tr.error.generic, color: 0xcf5f5f }]);
  }
}
