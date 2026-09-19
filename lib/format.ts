import { TIMEZONE } from '@/lib/constants';

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFmt = new Intl.DateTimeFormat('tr-TR', {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const numberFmt = new Intl.NumberFormat('tr-TR');

export function formatDate(value: string | Date): string {
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFmt.format(new Date(value));
}

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

/** "+12,4%" / "-3,1%" / "0%". Yön işareti her zaman yazılır. */
export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return '0%';
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/**
 * Yüzde değişim. Ana metrik mutlak sayı değil bu — şişirilmiş sayaçta bile
 * trend doğru kalır çünkü çarpan sadeleşir.
 */
export function percentChange(from: number, to: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  if (from === 0) return to === 0 ? 0 : 100;
  return ((to - from) / Math.abs(from)) * 100;
}

/** İki tarih arasındaki tam gün sayısı (negatif olmaz). */
export function daysBetween(from: string | Date, to: string | Date = new Date()): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Sunucunun kaç gün yaşadığı. Hâlâ açıksa bugüne kadar. */
export function lifespanDays(
  opensAt: string | null,
  diedAt: string | null,
  now: Date = new Date(),
): number | null {
  if (!opensAt) return null;
  const start = new Date(opensAt);
  if (start.getTime() > now.getTime()) return 0;
  return daysBetween(start, diedAt ?? now);
}

/** YYYY-MM-DD, Europe/Istanbul gününe göre. */
export function istanbulDay(value: string | Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
  return parts;
}
