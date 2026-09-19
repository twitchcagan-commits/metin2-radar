import type { ServerDetail, ServerSummary } from '@/lib/data/servers';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { tr } from '@/lib/i18n/tr';

/**
 * Discord embed'leri.
 *
 * Sitedeki veri sunum kuralı burada da geçerli: her sayının yanında kaynağı
 * yazar. Discord'da rozet çizemeyiz, o yüzden metin olarak yazıyoruz.
 */

export type Embed = {
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
};

// globals.css'deki token'ların onluk karşılıkları.
const COLOR_ACCENT = 0x4d9fff;
const COLOR_BAD = 0xcf5f5f;
const COLOR_MUTED = 0x6b727d;

const DECLARED = `⚠ ${tr.source.declared}`;
const MEASURED = `✅ ${tr.source.measured}`;

function serverUrl(siteUrl: string, slug: string): string {
  return `${siteUrl.replace(/\/$/, '')}/sunucu/${slug}`;
}

export function upcomingEmbed(servers: readonly ServerSummary[], siteUrl: string): Embed {
  if (servers.length === 0) {
    return {
      title: tr.empty.noCalendar.title,
      description: tr.empty.noCalendar.line,
      color: COLOR_MUTED,
    };
  }

  return {
    title: 'Yaklaşan açılışlar',
    url: `${siteUrl.replace(/\/$/, '')}/takvim`,
    color: COLOR_ACCENT,
    fields: servers.slice(0, 10).map((server) => ({
      name: server.name,
      value: [
        server.opensAt ? formatDateTime(server.opensAt) : 'tarih belirsiz',
        server.serverType ? tr.serverType[server.serverType] : null,
        server.levelRange,
      ]
        .filter(Boolean)
        .join(' · '),
    })),
    footer: { text: tr.time.timezoneNote },
  };
}

export function serverEmbed(server: ServerDetail, siteUrl: string): Embed {
  const fields: Embed['fields'] = [
    {
      name: tr.score.title,
      value: server.score === null ? '—' : `**${Math.round(server.score)}** ${tr.score.outOf}`,
      inline: true,
    },
    {
      name: tr.metric.trend7d,
      value:
        server.trend7dPct === null
          ? '—'
          : `**${formatPercent(server.trend7dPct)}**\n${
              server.trendSource === 'declared' ? DECLARED : MEASURED
            }`,
      inline: true,
    },
    {
      name: tr.metric.discordOnline,
      value:
        server.discordOnline === null
          ? '—'
          : `${formatNumber(Math.round(server.discordOnline))}\n${MEASURED}`,
      inline: true,
    },
  ];

  if (server.declaredOnline !== null) {
    fields.push({
      name: tr.metric.siteOnline,
      value: `${formatNumber(Math.round(server.declaredOnline))}\n${DECLARED}`,
      inline: true,
    });
  }

  if (server.uptimePct !== null) {
    fields.push({
      name: tr.metric.uptime,
      value: `%${server.uptimePct.toFixed(1)}\n${MEASURED}`,
      inline: true,
    });
  }

  if (server.lifespanDays !== null) {
    fields.push({
      name: tr.metric.lifespan,
      value: `${server.lifespanDays} ${tr.metric.dayUnit}`,
      inline: true,
    });
  }

  if (server.activeFlags.length > 0) {
    fields.push({
      name: `⚠ ${tr.flag.title}`,
      value: server.activeFlags.map((kind) => `• ${tr.flag.kinds[kind]}`).join('\n'),
    });
  }

  return {
    title: server.name,
    url: serverUrl(siteUrl, server.slug),
    description: [
      tr.status[server.status],
      server.serverType ? tr.serverType[server.serverType] : null,
      server.levelRange,
    ]
      .filter(Boolean)
      .join(' · '),
    color: server.activeFlags.length > 0 ? COLOR_BAD : COLOR_ACCENT,
    fields,
    footer: { text: tr.score.note },
  };
}

export function graveyardEmbed(servers: readonly ServerSummary[], siteUrl: string): Embed {
  if (servers.length === 0) {
    return {
      title: tr.empty.noGraveyard.title,
      description: tr.empty.noGraveyard.line,
      color: COLOR_MUTED,
    };
  }

  return {
    title: tr.nav.graveyard,
    url: `${siteUrl.replace(/\/$/, '')}/mezarlik`,
    color: COLOR_MUTED,
    fields: servers.slice(0, 10).map((server) => ({
      name: server.name,
      value: `${
        server.lifespanDays === null ? '—' : `${server.lifespanDays} ${tr.metric.dayUnit}`
      } yaşadı${server.diedAt ? ` · ${formatDateTime(server.diedAt)}` : ''}`,
    })),
  };
}

export function announcementEmbed(server: ServerSummary, siteUrl: string): Embed {
  return {
    title: `${server.name} birazdan açılıyor`,
    url: serverUrl(siteUrl, server.slug),
    description: [
      server.opensAt ? `Açılış: **${formatDateTime(server.opensAt)}**` : null,
      server.serverType ? tr.serverType[server.serverType] : null,
      server.levelRange,
    ]
      .filter(Boolean)
      .join(' · '),
    color: COLOR_ACCENT,
    footer: { text: `${tr.site.tagline} · ${tr.time.timezoneNote}` },
  };
}
