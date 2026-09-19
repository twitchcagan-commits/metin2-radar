import type { Metadata } from 'next';

import { CalendarView } from '@/components/CalendarView';
import { getAds } from '@/lib/data/ads';
import { getUpcomingServers } from '@/lib/data/servers';
import { tr } from '@/lib/i18n/tr';

export const revalidate = 300;

export const metadata: Metadata = {
  title: tr.nav.calendar,
  description: 'Yaklaşan Metin2 PVP sunucu açılışları, geri sayımlı ve türe göre filtreli.',
};

export default async function CalendarPage() {
  const [servers, ads] = await Promise.all([
    getUpcomingServers(100),
    getAds('calendar_highlight', 2),
  ]);

  return <CalendarView servers={servers} ads={ads} active={null} />;
}
