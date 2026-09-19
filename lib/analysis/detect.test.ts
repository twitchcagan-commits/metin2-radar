import { describe, expect, it } from 'vitest';

import {
  detectAll,
  detectFlatline,
  detectNoDiurnal,
  detectRoundNumbers,
  detectStepJump,
  type Sample,
} from '@/lib/analysis/detect';

/**
 * Sentetik veri üreticileri.
 *
 * Kritik kabul kriteri: DÜZ ÇİZGİ yakalanmalı, GERÇEKÇİ SİNÜS EĞRİSİ
 * yakalanMAmalı. Yanlış pozitif, sıralamayı satmaktan daha kötüdür —
 * suçsuz bir sunucuyu "sahte" diye damgalamış oluruz.
 */

const TEN_MINUTES = 10 * 60 * 1000;

/** 10 dakikalık aralıklarla, verilen saatten geriye örnek üretir. */
function series(
  count: number,
  value: (index: number, date: Date) => number | null,
  endAt = new Date('2026-03-15T21:00:00+03:00'),
): Sample[] {
  const samples: Sample[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(endAt.getTime() - i * TEN_MINUTES);
    samples.push({ collectedAt: date, siteOnline: value(count - 1 - i, date) });
  }
  return samples;
}

/**
 * Gerçekçi sunucu: gün/gece sinüs eğrisi + rastgele gürültü.
 * Gece 04:00 civarı dip (~%25), akşam 22:00 civarı zirve (%100).
 */
function realisticServer(count: number, peak = 800): Sample[] {
  let seed = 42;
  const random = (): number => {
    // Deterministik sözde rastgele — test tekrarlanabilir olsun.
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  return series(count, (_, date) => {
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Istanbul',
        hour: '2-digit',
        hour12: false,
      }).format(date),
    );
    // 22:00 zirve, 04:00 dip
    const phase = ((hour - 22 + 24) % 24) / 24;
    const wave = (Math.cos(phase * 2 * Math.PI) + 1) / 2; // 0..1
    const base = peak * (0.25 + 0.75 * wave);
    const noise = (random() - 0.5) * base * 0.12;
    return Math.max(0, Math.round(base + noise));
  });
}

describe('detectFlatline', () => {
  it('düz çizgiyi yakalar', () => {
    const flat = series(144, () => 1500);
    expect(detectFlatline(flat)?.kind).toBe('flatline');
  });

  it('neredeyse düz çizgiyi de yakalar (%1 oynama)', () => {
    const almostFlat = series(144, (i) => 1500 + (i % 3));
    expect(detectFlatline(almostFlat)?.kind).toBe('flatline');
  });

  it('gerçekçi sinüs eğrisini YAKALAMAZ', () => {
    expect(detectFlatline(realisticServer(144))).toBeNull();
  });

  it('gerçekten boş sunucuyu manipülasyon saymaz', () => {
    // 0-2 arası gezinen ölü sunucu: manipülasyon değil, sadece ölü.
    expect(detectFlatline(series(144, () => 0))).toBeNull();
  });

  it('az örnekle karar vermez', () => {
    expect(detectFlatline(series(10, () => 1500))).toBeNull();
  });
});

describe('detectNoDiurnal', () => {
  it('gün/gece deseni olmayan sunucuyu yakalar', () => {
    // 7 gün, sabit 2000: gece ve zirve ortalaması eşit -> oran 1.0
    const flat = series(1008, () => 2000);
    const detection = detectNoDiurnal(flat);
    expect(detection?.kind).toBe('no_diurnal');
    expect(Number(detection?.details.oran)).toBeGreaterThan(0.85);
  });

  it('gerçekçi gün/gece eğrisini YAKALAMAZ', () => {
    expect(detectNoDiurnal(realisticServer(1008))).toBeNull();
  });

  it('yeterli örnek yoksa karar vermez', () => {
    expect(detectNoDiurnal(series(12, () => 2000))).toBeNull();
  });
});

describe('detectStepJump', () => {
  it('kalıcı basamak sıçramasını yakalar', () => {
    // 300'de gezinirken bir anda 900'e çıkıp orada kalıyor: çarpan değişmiş.
    const stepped = series(60, (i) => (i < 20 ? 300 : 900));
    const detection = detectStepJump(stepped);
    expect(detection?.kind).toBe('step_jump');
    expect(Number(detection?.details.artis_yuzde)).toBeGreaterThan(50);
  });

  it('geçici zirveyi sıçrama saymaz', () => {
    // Tek örnekte 900'e çıkıp hemen 300'e dönüyor: normal dalgalanma.
    const spike = series(60, (i) => (i === 25 ? 900 : 300));
    expect(detectStepJump(spike)).toBeNull();
  });

  it('gerçekçi eğrinin kademeli artışını sıçrama saymaz', () => {
    expect(detectStepJump(realisticServer(1008))).toBeNull();
  });

  it('kademeli gerçek büyümeyi sıçrama saymaz', () => {
    // Her örnekte %2 büyüme: gerçek bir açılış dalgası.
    const growing = series(60, (i) => Math.round(300 * 1.02 ** i));
    expect(detectStepJump(growing)).toBeNull();
  });
});

describe('detectRoundNumbers', () => {
  it('hepsi 50nin katı olan diziyi yakalar', () => {
    const rounded = series(120, (i) => 500 + (i % 5) * 50);
    const detection = detectRoundNumbers(rounded);
    expect(detection?.kind).toBe('round_numbers');
  });

  it('gerçekçi gürültülü sayıları YAKALAMAZ', () => {
    expect(detectRoundNumbers(realisticServer(1008))).toBeNull();
  });

  it('boş sunucunun sıfırlarını yuvarlak sayı saymaz', () => {
    expect(detectRoundNumbers(series(120, () => 0))).toBeNull();
  });
});

describe('detectAll', () => {
  it('temiz sunucuda hiç flag üretmez', () => {
    const realistic7d = realisticServer(1008);
    const realistic24h = realistic7d.slice(-144);
    expect(detectAll({ last24h: realistic24h, last7d: realistic7d })).toEqual([]);
  });

  it('düz sayaçta birden fazla sinyal üretir', () => {
    const flat7d = series(1008, () => 1500);
    const flat24h = flat7d.slice(-144);
    const kinds = detectAll({ last24h: flat24h, last7d: flat7d }).map((d) => d.kind);
    expect(kinds).toContain('flatline');
    expect(kinds).toContain('no_diurnal');
  });

  it('şişirme çarpanı sonucu değiştirmez', () => {
    // Aynı şekil, 50 kat şişirilmiş: tespit sonucu aynı kalmalı.
    const normal = realisticServer(1008, 800);
    const inflated = realisticServer(1008, 40_000);

    const a = detectAll({ last24h: normal.slice(-144), last7d: normal });
    const b = detectAll({ last24h: inflated.slice(-144), last7d: inflated });

    expect(a.map((d) => d.kind)).toEqual(b.map((d) => d.kind));
  });

  it('veri yoksa flag üretmez', () => {
    expect(detectAll({ last24h: [], last7d: [] })).toEqual([]);
  });

  it('sayaç okunamayan sunucuda (hepsi null) flag üretmez', () => {
    const nulls = series(1008, () => null);
    expect(detectAll({ last24h: nulls.slice(-144), last7d: nulls })).toEqual([]);
  });
});
