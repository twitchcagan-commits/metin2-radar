import { describe, expect, it } from 'vitest';

import { isAllowedByRobots, parseRobots } from '@/collector/http';
import { mapWithConcurrency } from '@/collector/pool';
import { extractCount, readCounterFromHtml } from '@/collector/sources/counter';
import { interpretWidget } from '@/collector/sources/discord';

describe('extractCount', () => {
  it('binlik ayırıcılı sayıyı okur', () => {
    expect(extractCount('Online: 1.234 kişi')).toBe(1234);
    expect(extractCount('3,456 players')).toBe(3456);
    expect(extractCount('  87  ')).toBe(87);
  });

  it('sayı yoksa null döner', () => {
    expect(extractCount('şu an kimse yok')).toBeNull();
    expect(extractCount('')).toBeNull();
  });

  it('saçma büyüklükleri kabul etmez', () => {
    expect(extractCount('99999999999')).toBeNull();
  });
});

describe('readCounterFromHtml', () => {
  const html = `
    <html><body>
      <div id="online-count">Aktif: 1.842 oyuncu</div>
      <span class="bos"></span>
    </body></html>`;

  it('selector tutarsa sayıyı çıkarır', () => {
    const result = readCounterFromHtml(html, '#online-count');
    expect(result.online).toBe(1842);
    expect(result.selectorFailed).toBe(false);
  });

  it('selector tutmazsa flag adayı üretir ama patlamaz', () => {
    const result = readCounterFromHtml(html, '#yok-boyle-bir-sey');
    expect(result.online).toBeNull();
    expect(result.selectorFailed).toBe(true);
    expect(result.error).toContain('eşleşmedi');
  });

  it('selector eşleşip içinde sayı yoksa flag adayı üretir', () => {
    const result = readCounterFromHtml(html, '.bos');
    expect(result.online).toBeNull();
    expect(result.selectorFailed).toBe(true);
  });
});

describe('interpretWidget', () => {
  it('presence_count okur', () => {
    const sample = interpretWidget({ id: '1', presence_count: 240, members: [{}, {}] });
    expect(sample.online).toBe(240);
    expect(sample.members).toBe(2);
    expect(sample.error).toBeNull();
  });

  it('üye listesi 100e dayandıysa üye sayısını uydurmaz', () => {
    const sample = interpretWidget({
      id: '1',
      presence_count: 500,
      members: Array.from({ length: 100 }, () => ({})),
    });
    expect(sample.online).toBe(500);
    expect(sample.members).toBeNull();
  });

  it('beklenmeyen yanıtta hata döner, patlamaz', () => {
    const sample = interpretWidget({ oops: true });
    expect(sample.online).toBeNull();
    expect(sample.error).not.toBeNull();
  });
});

describe('robots.txt', () => {
  const body = `
    User-agent: BadBot
    Disallow: /

    User-agent: *
    Disallow: /admin
    Disallow: /private   # yorum
  `;

  it('sadece bizi ilgilendiren kuralları alır', () => {
    expect(parseRobots(body)).toEqual(['/admin', '/private']);
  });

  it('yasak yolu reddeder, diğerine izin verir', () => {
    const rules = parseRobots(body);
    expect(isAllowedByRobots(rules, '/admin/panel')).toBe(false);
    expect(isAllowedByRobots(rules, '/')).toBe(true);
    expect(isAllowedByRobots(rules, '/anasayfa')).toBe(true);
  });
});

describe('mapWithConcurrency', () => {
  it('eşzamanlılık sınırını aşmaz', async () => {
    let active = 0;
    let peak = 0;

    await mapWithConcurrency(Array.from({ length: 30 }, (_, i) => i), 10, async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return n;
    });

    expect(peak).toBeLessThanOrEqual(10);
  });

  it('tek işin hatası diğerlerini düşürmez', async () => {
    const results = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error('patladı');
      return n * 10;
    });

    expect(results[0]).toEqual({ ok: true, value: 10 });
    expect(results[1]?.ok).toBe(false);
    expect(results[2]).toEqual({ ok: true, value: 30 });
  });

  it('sonuçları giriş sırasında tutar', async () => {
    const results = await mapWithConcurrency([30, 10, 20], 3, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms;
    });

    expect(results.map((r) => (r.ok ? r.value : null))).toEqual([30, 10, 20]);
  });
});
