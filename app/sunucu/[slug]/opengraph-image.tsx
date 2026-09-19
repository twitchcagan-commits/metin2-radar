import { ImageResponse } from 'next/og';

import { scoreTone } from '@/lib/analysis/score';
import { getServerBySlug } from '@/lib/data/servers';
import { formatPercent } from '@/lib/format';
import { tr } from '@/lib/i18n/tr';

/**
 * Sosyal medya önizleme görseli. next/og ile üretilir — ücretsiz, Vercel'de
 * ek servis gerekmez, harici font indirilmez.
 *
 * Paylaşılan kartta da kural aynı: skor ve trend ölçülen veridir; sunucunun
 * beyan ettiği online sayısı buraya hiç konmaz.
 *
 * NOT: Bu ağaç tarayıcıda değil satori'de render edilir. Satori'nin tek katı
 * kuralı: birden fazla çocuğu olan her öğede `display` açıkça yazılmalı.
 * Bu yüzden aşağıda her kapsayıcıda `display: 'flex'` var.
 */

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Radar skoru ve trend';

const TONE_COLOR = {
  good: '#4EA87A',
  warn: '#C8A44A',
  bad: '#CF5F5F',
} as const;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const server = await getServerBySlug(slug);

  const name = server?.name ?? tr.site.name;
  const score = server?.score ?? null;
  const trend = server?.trend7dPct ?? null;
  const flagCount = server?.activeFlags.length ?? 0;
  const tone = TONE_COLOR[scoreTone(score ?? 0)];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0A0B0D',
          color: '#E8EAED',
          padding: 64,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              width: 14,
              height: 14,
              borderRadius: 999,
              background: '#4D9FFF',
              marginRight: 14,
            }}
          />
          <div style={{ display: 'flex', fontSize: 26, color: '#A8AFBA', marginRight: 10 }}>
            {tr.site.name}
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: '#878F9C' }}>
            {`· ${tr.site.tagline}`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>
              {name}
            </div>

            <div style={{ display: 'flex', marginTop: 20, fontSize: 30, color: '#A8AFBA' }}>
              <div style={{ display: 'flex', marginRight: 14 }}>{tr.metric.trend7d}</div>
              <div
                style={{
                  display: 'flex',
                  color: trend !== null && trend < 0 ? '#CF5F5F' : '#4EA87A',
                }}
              >
                {trend === null ? '—' : formatPercent(trend)}
              </div>
            </div>

            {flagCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  // Rozet içeriği kadar geniş olsun, sütunu doldurmasın.
                  alignSelf: 'flex-start',
                  marginTop: 22,
                  fontSize: 26,
                  color: '#CF5F5F',
                  border: '2px solid rgba(207,95,95,0.4)',
                  borderRadius: 10,
                  padding: '10px 18px',
                }}
              >
                {`⚠ ${flagCount} manipülasyon sinyali`}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: `6px solid ${tone}`,
              borderRadius: 999,
              width: 220,
              height: 220,
              marginLeft: 56,
            }}
          >
            <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, color: tone }}>
              {score === null ? '—' : String(Math.round(score))}
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: '#878F9C', marginTop: 8 }}>
              {tr.score.title}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
