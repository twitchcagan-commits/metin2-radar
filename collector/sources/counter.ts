import * as cheerio from 'cheerio';

import { canFetch, fetchText } from '@/collector/http';

/**
 * Sunucunun kendi online sayacını okur. Bu sayı DOĞRULANMAMIŞ beyandır;
 * arayüzde her zaman "⚠ sunucunun beyanı" rozetiyle gösterilir ve skora girmez.
 */

export type CounterSample = {
  online: number | null;
  error: string | null;
  /** Selector tutmadıysa counter_offline flag adayı üretilir. */
  selectorFailed: boolean;
};

/**
 * Metinden ilk anlamlı tam sayıyı çıkarır.
 * "Online: 1.234 kişi" -> 1234 · "3,456 players" -> 3456 · "yok" -> null
 */
export function extractCount(text: string): number | null {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  // Binlik ayırıcı olarak nokta veya virgül kullanan grupları tek sayıya indir.
  const match = cleaned.match(/\d{1,3}(?:[.,]\d{3})+|\d+/);
  if (!match) return null;

  const digits = match[0].replace(/[.,]/g, '');
  const value = Number.parseInt(digits, 10);

  if (!Number.isFinite(value)) return null;
  // Saçma değerleri veri olarak kabul etmeyiz (sayfa numarası, yıl vb. değil).
  if (value < 0 || value > 10_000_000) return null;

  return value;
}

export function readCounterFromHtml(html: string, selector: string): CounterSample {
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return { online: null, error: 'HTML ayrıştırılamadı', selectorFailed: false };
  }

  let node: cheerio.Cheerio<never>;
  try {
    node = $(selector) as unknown as cheerio.Cheerio<never>;
  } catch {
    return { online: null, error: 'CSS selector geçersiz', selectorFailed: true };
  }

  if (node.length === 0) {
    return { online: null, error: 'selector hiçbir öğeyle eşleşmedi', selectorFailed: true };
  }

  const text = node.first().text();
  const online = extractCount(text);

  if (online === null) {
    return {
      online: null,
      error: `selector eşleşti ama içinde sayı yok: "${text.trim().slice(0, 60)}"`,
      selectorFailed: true,
    };
  }

  return { online, error: null, selectorFailed: false };
}

export async function readSiteCounter(
  counterUrl: string,
  selector: string,
): Promise<CounterSample> {
  const permission = await canFetch(counterUrl);
  if (!permission.allowed) {
    return {
      online: null,
      error: permission.reason ?? 'erişime izin verilmiyor',
      selectorFailed: false,
    };
  }

  const result = await fetchText(counterUrl);
  if (!result.ok) {
    return { online: null, error: result.error, selectorFailed: false };
  }

  return readCounterFromHtml(result.body, selector);
}
