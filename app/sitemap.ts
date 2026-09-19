import type { MetadataRoute } from 'next';

import { SERVER_TYPES } from '@/lib/constants';
import { getAllOwnerKeys, getAllServerSlugs } from '@/lib/data/servers';

export const revalidate = 3600;

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const [slugs, ownerKeys] = await Promise.all([getAllServerSlugs(), getAllOwnerKeys()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/takvim`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/mezarlik`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    ...SERVER_TYPES.map((type) => ({
      url: `${base}/takvim/${type}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.5,
    })),
  ];

  return [
    ...staticPages,
    ...slugs.map((slug) => ({
      url: `${base}/sunucu/${slug}`,
      lastModified: now,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    })),
    ...ownerKeys.map((key) => ({
      url: `${base}/sahipler/${key}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];
}
