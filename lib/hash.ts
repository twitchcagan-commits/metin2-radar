import { createHash } from 'node:crypto';

import { istanbulDay } from '@/lib/format';

/**
 * Tıklama kaydı için mahremiyet katmanı.
 *
 * HAM IP ASLA SAKLANMAZ. sha256(ip + günlük tuz) yazılır; tuz her gün
 * değiştiği için aynı kişi günler arası eşleştirilemez. Bu bize "günlük
 * benzersiz ziyaretçi" verir, kullanıcı takibi vermez — ve skorda ihtiyacımız
 * olan tek şey bu.
 */

function dailySalt(): string {
  const base = process.env.CLICK_HASH_SALT ?? 'metin2-radar-yerel-gelistirme';
  return `${base}:${istanbulDay()}`;
}

export function hashWithDailySalt(value: string): string {
  return createHash('sha256').update(`${value}|${dailySalt()}`).digest('hex').slice(0, 32);
}

/**
 * İstemci IP'sini proxy başlıklarından çıkarır (Vercel `x-forwarded-for` verir).
 * Bulunamazsa null döner ve ip_hash boş yazılır — sayım kaybederiz, veri
 * uydurmayız.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip');
}
