import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CalendarView } from '@/components/CalendarView';
import { SERVER_TYPES, type ServerType } from '@/lib/constants';
import { getAds } from '@/lib/data/ads';
import { getUpcomingServers } from '@/lib/data/servers';
import { tr } from '@/lib/i18n/tr';

export const revalidate = 300;

/** Tür sayısı sabit ve küçük: hepsini önceden üretiyoruz. */
export function generateStaticParams(): { tur: ServerType }[] {
  return SERVER_TYPES.map((tur) => ({ tur }));
}

function isServerType(value: string): value is ServerType {
  return (SERVER_TYPES as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tur: string }>;
}): Promise<Metadata> {
  const { tur } = await params;
  if (!isServerType(tur)) return { title: tr.error.notFound };

  return {
    title: `${tr.serverType[tur]} açılışları`,
    description: `Yaklaşan ${tr.serverType[tur]} Metin2 PVP sunucu açılışları, geri sayımlı.`,
  };
}

export default async function CalendarTypePage({
  params,
}: {
  params: Promise<{ tur: string }>;
}) {
  const { tur } = await params;
  if (!isServerType(tur)) notFound();

  const [all, ads] = await Promise.all([
    getUpcomingServers(100),
    getAds('calendar_highlight', 2),
  ]);

  return (
    <CalendarView
      servers={all.filter((server) => server.serverType === tur)}
      ads={ads}
      active={tur}
    />
  );
}
