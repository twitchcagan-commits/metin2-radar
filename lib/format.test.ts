import { describe, expect, it } from 'vitest';

import {
  daysBetween,
  formatPercent,
  istanbulDay,
  lifespanDays,
  percentChange,
} from '@/lib/format';

describe('percentChange', () => {
  it('şişirme çarpanından bağımsızdır', () => {
    // Aynı trend, 50x şişirilmiş sayaç: yüzde değişim değişmez.
    expect(percentChange(100, 120)).toBeCloseTo(20);
    expect(percentChange(5000, 6000)).toBeCloseTo(20);
  });

  it('düşüşü negatif verir', () => {
    expect(percentChange(200, 150)).toBeCloseTo(-25);
  });

  it('sıfırdan başlangıcı patlatmaz', () => {
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(0, 42)).toBe(100);
  });
});

describe('formatPercent', () => {
  it('yön işaretini her zaman yazar', () => {
    expect(formatPercent(12.44)).toBe('+12,4%');
    expect(formatPercent(-3.14)).toBe('-3,1%');
    expect(formatPercent(0)).toBe('0%');
  });

  it('geçersiz sayıda tire döner', () => {
    expect(formatPercent(Number.NaN)).toBe('—');
  });
});

describe('lifespanDays', () => {
  const now = new Date('2026-03-01T12:00:00Z');

  it('kapanmış sunucunun yaşadığı günü verir', () => {
    expect(lifespanDays('2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z', now)).toBe(30);
  });

  it('açık sunucuda bugüne kadar sayar', () => {
    expect(lifespanDays('2026-02-01T12:00:00Z', null, now)).toBe(28);
  });

  it('henüz açılmamışsa sıfırdır', () => {
    expect(lifespanDays('2026-06-01T00:00:00Z', null, now)).toBe(0);
  });

  it('açılış tarihi yoksa null döner', () => {
    expect(lifespanDays(null, null, now)).toBeNull();
  });
});

describe('daysBetween', () => {
  it('negatif dönmez', () => {
    expect(daysBetween('2026-03-01T00:00:00Z', '2026-02-01T00:00:00Z')).toBe(0);
  });
});

describe('istanbulDay', () => {
  it('UTC gece yarısından sonrayı Türkiye gününe çevirir', () => {
    // 23:30 UTC = ertesi gün 02:30 Türkiye saati
    expect(istanbulDay('2026-03-01T23:30:00Z')).toBe('2026-03-02');
    expect(istanbulDay('2026-03-01T09:00:00Z')).toBe('2026-03-01');
  });
});
