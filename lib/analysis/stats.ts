import { TIMEZONE } from '@/lib/constants';

/** Saf yardımcılar. Veritabanı bilmezler, test edilebilirler. */

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

/** Popülasyon standart sapması. */
export function stdDev(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  let sum = 0;
  for (const value of values) sum += (value - avg) ** 2;
  return Math.sqrt(sum / values.length);
}

/**
 * Varyasyon katsayısı: std / ortalama.
 * Ölçeksizdir — sayaç 50 kat şişirilse de aynı kalır. Flatline tespitinin temeli.
 */
export function coefficientOfVariation(values: readonly number[]): number {
  const avg = mean(values);
  if (avg === 0) return 0;
  return stdDev(values) / Math.abs(avg);
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

const hourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  hour12: false,
});

/** Örneğin Türkiye saatine göre saati (0-23). Gün/gece deseni için gerekli. */
export function istanbulHour(value: Date | string): number {
  const text = hourFormatter.format(new Date(value));
  const hour = Number.parseInt(text, 10);
  return Number.isFinite(hour) ? hour % 24 : 0;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
