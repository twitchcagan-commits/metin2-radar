import Link from 'next/link';

import { AdManager, type AdminAd } from '@/app/admin/AdManager';
import { FlagManager, type AdminFlag } from '@/app/admin/FlagManager';
import { EMPTY_SERVER, ServerForm, type ServerFormValues } from '@/app/admin/ServerForm';
import { Forbidden } from '@/components/Forbidden';
import { SectionHeading } from '@/components/Section';
import { currentAdmin } from '@/lib/auth';
import { tr } from '@/lib/i18n/tr';
import { isConfigured, serviceClient } from '@/lib/supabase/server';
import type { ServerRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

/** timestamptz -> datetime-local input değeri (Türkiye saati). */
function toLocalInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return parts.replace(' ', 'T');
}

function toFormValues(row: ServerRow): ServerFormValues {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    website_url: row.website_url ?? '',
    download_url: row.download_url ?? '',
    discord_guild_id: row.discord_guild_id ?? '',
    discord_invite: row.discord_invite ?? '',
    game_host: row.game_host ?? '',
    game_port: row.game_port === null ? '' : String(row.game_port),
    logo_url: row.logo_url ?? '',
    level_range: row.level_range ?? '',
    server_type: row.server_type ?? '',
    opens_at: toLocalInput(row.opens_at),
    status: row.status,
    died_at: toLocalInput(row.died_at),
    owner_key: row.owner_key ?? '',
    is_verified: row.is_verified,
    counter_selector: row.counter_selector ?? '',
    counter_url: row.counter_url ?? '',
  };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ duzenle?: string }>;
}) {
  const admin = await currentAdmin();
  if (!admin) return <Forbidden />;

  const { duzenle } = await searchParams;
  const db = serviceClient();

  const [serversResult, flagsResult, adsResult] = await Promise.all([
    db.from('servers').select('*').order('created_at', { ascending: false }),
    db
      .from('flags')
      .select('id, kind, detected_at, details, server_id')
      .eq('is_active', true)
      .order('detected_at', { ascending: false }),
    db.from('ads').select('*').order('starts_at', { ascending: false }),
  ]);

  const servers: ServerRow[] = serversResult.data ?? [];
  const byId = new Map(servers.map((s) => [s.id, s]));

  const flags: AdminFlag[] = (flagsResult.data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    detectedAt: row.detected_at,
    details: row.details,
    serverName: byId.get(row.server_id)?.name ?? '(bilinmeyen)',
    serverSlug: byId.get(row.server_id)?.slug ?? '',
  }));

  const ads: AdminAd[] = (adsResult.data ?? []).map((row) => ({
    id: row.id,
    placement: row.placement,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    imageUrl: row.image_url,
    targetUrl: row.target_url,
    isActive: row.is_active,
  }));

  const editing = duzenle ? servers.find((s) => s.slug === duzenle) : undefined;

  return (
    <>
      {!isConfigured() && (
        <p className="mb-6 rounded-lg border border-warn/30 bg-warn/[0.06] p-3 text-xs text-text-muted">
          Supabase bağlanmamış; panel salt okunur davranır.
        </p>
      )}

      <section>
        <SectionHeading
          title={editing ? `Düzenle: ${editing.name}` : 'Sunucu ekle'}
          action={
            editing ? (
              <Link
                href="/admin"
                className="rounded-md border border-line bg-surface-2 px-3 py-1.5 text-xs transition-colors duration-hover ease-out hover:border-line-strong"
              >
                Yeni kayda geç
              </Link>
            ) : undefined
          }
        />
        <ServerForm
          key={editing?.id ?? 'new'}
          initial={editing ? toFormValues(editing) : EMPTY_SERVER}
        />
      </section>

      <section className="mt-12">
        <SectionHeading title={`Sunucular (${servers.length})`} />
        {servers.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface-1 px-4 py-3 text-xs text-text-muted">
            Henüz sunucu eklenmemiş.
          </p>
        ) : (
          <ul className="grid gap-2">
            {servers.map((server) => (
              <li
                key={server.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-1 px-4 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{server.name}</span>
                  <span className="mt-0.5 block text-[11px] text-text-faint">
                    {server.slug} · {tr.status[server.status]}
                    {server.counter_selector ? ` · sayaç: ${server.counter_selector}` : ''}
                  </span>
                </span>

                <span className="flex shrink-0 gap-2">
                  <Link
                    href={`/admin?duzenle=${server.slug}`}
                    className="rounded-md border border-line bg-surface-2 px-3 py-1.5 text-xs transition-[transform,border-color] duration-hover ease-spring hover:border-line-strong active:scale-[0.97]"
                  >
                    Düzenle
                  </Link>
                  <Link
                    href={`/sunucu/${server.slug}`}
                    className="rounded-md px-3 py-1.5 text-xs text-text-muted transition-colors duration-hover ease-out hover:text-text"
                  >
                    Gör
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <SectionHeading title={`Aktif flag'ler (${flags.length})`} />
        <FlagManager flags={flags} />
      </section>

      <section className="mt-12">
        <SectionHeading title="Reklam envanteri" />
        <AdManager ads={ads} />
      </section>
    </>
  );
}
