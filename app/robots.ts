import type { MetadataRoute } from 'next';

/**
 * Yönetim ve API uçları dizine girmez. Başkalarının robots.txt'sine uymamızı
 * bekliyorsak kendi kurallarımızı da düzgün yazmamız gerekir.
 */
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  );

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
