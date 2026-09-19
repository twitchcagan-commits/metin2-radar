import { describe, expect, it } from 'vitest';

import {
  clickPoints,
  computeScore,
  FLAG_PENALTY,
  lifespanPoints,
  scoreTone,
  trendPoints,
  uptimePoints,
  WEIGHTS,
  type ScoreInput,
} from '@/lib/analysis/score';

const healthy: ScoreInput = {
  trendFrom: 400,
  trendTo: 520,
  uniqueClicks7d: 260,
  discordActiveRatio: 0.14,
  discordMemberGrowthPct: 6,
  uptimePct: 99,
  ageDays: 180,
  activeFlags: 0,
};

describe('ağırlıklar', () => {
  it('spec ile aynı kalır ve toplamı 100', () => {
    expect(WEIGHTS).toEqual({ trend: 30, clicks: 25, discord: 20, uptime: 15, lifespan: 10 });
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

describe('trendPoints', () => {
  it('şişirme çarpanından bağımsızdır', () => {
    // Aynı %30 büyüme, biri 50 kat şişirilmiş sayaçla.
    expect(trendPoints(400, 520)).toBe(trendPoints(20_000, 26_000));
  });

  it('düşen sunucuyu cezalandırır, büyüyene tam puan verir', () => {
    expect(trendPoints(1000, 400)).toBe(0);
    expect(trendPoints(1000, 1500)).toBe(WEIGHTS.trend);
    expect(trendPoints(1000, 1000)).toBe(WEIGHTS.trend * 0.5);
  });

  it('veri yoksa ortalama puan verir, sunucuyu cezalandırmaz', () => {
    expect(trendPoints(null, null)).toBe(WEIGHTS.trend * 0.5);
  });
});

describe('clickPoints', () => {
  it('sıfır tıklamada sıfır puandır', () => {
    expect(clickPoints(0)).toBe(0);
  });

  it('logaritmiktir: artan tıklama azalan getiri', () => {
    const first = clickPoints(50) - clickPoints(0);
    const second = clickPoints(500) - clickPoints(450);
    expect(first).toBeGreaterThan(second);
  });

  it('doygunluk noktasında tam puana ulaşır ve üstünü taşırmaz', () => {
    expect(clickPoints(500)).toBe(WEIGHTS.clicks);
    expect(clickPoints(100_000)).toBe(WEIGHTS.clicks);
  });
});

describe('uptimePoints', () => {
  it('erişilebilirlikle doğrusal artar', () => {
    expect(uptimePoints(100)).toBe(WEIGHTS.uptime);
    expect(uptimePoints(0)).toBe(0);
    expect(uptimePoints(50)).toBeCloseTo(WEIGHTS.uptime / 2, 1);
  });

  it('ölçüm yoksa puan vermez', () => {
    expect(uptimePoints(null)).toBe(0);
  });
});

describe('lifespanPoints', () => {
  it('yeni sunucuya puan vermez, yaşlıya tam puan verir', () => {
    expect(lifespanPoints(0)).toBe(0);
    expect(lifespanPoints(365)).toBe(WEIGHTS.lifespan);
  });

  it('logaritmiktir', () => {
    expect(lifespanPoints(30)).toBeGreaterThan(lifespanPoints(365) / 2);
  });
});

describe('computeScore', () => {
  it('kırılım toplamı skora eşittir', () => {
    const { score, breakdown } = computeScore(healthy);
    const sum =
      breakdown.trend +
      breakdown.clicks +
      breakdown.discord +
      breakdown.uptime +
      breakdown.lifespan +
      breakdown.penalty;
    expect(score).toBeCloseTo(sum, 2);
  });

  it('0-100 aralığının dışına çıkmaz', () => {
    const perfect = computeScore({
      trendFrom: 100,
      trendTo: 1000,
      uniqueClicks7d: 100_000,
      discordActiveRatio: 0.9,
      discordMemberGrowthPct: 200,
      uptimePct: 100,
      ageDays: 3000,
      activeFlags: 0,
    });
    expect(perfect.score).toBeLessThanOrEqual(100);

    const awful = computeScore({ ...healthy, activeFlags: 10 });
    expect(awful.score).toBe(0);
  });

  it('aktif her flag 15 puan düşürür', () => {
    const clean = computeScore(healthy);
    const flagged = computeScore({ ...healthy, activeFlags: 1 });
    expect(clean.score - flagged.score).toBeCloseTo(FLAG_PENALTY, 2);
    expect(flagged.breakdown.penalty).toBe(-FLAG_PENALTY);
  });

  it('şişirilmiş sayaç skoru DEĞİŞTİRMEZ', () => {
    // Sunucu sayacını 50 katına çıkarsa: trend aynı, dolayısıyla skor aynı.
    const honest = computeScore(healthy);
    const inflated = computeScore({
      ...healthy,
      trendFrom: healthy.trendFrom! * 50,
      trendTo: healthy.trendTo! * 50,
    });
    expect(inflated.score).toBe(honest.score);
  });

  it('eksik veri sunucuyu sıfıra çakmaz', () => {
    const unknown = computeScore({
      trendFrom: null,
      trendTo: null,
      uniqueClicks7d: 0,
      discordActiveRatio: null,
      discordMemberGrowthPct: null,
      uptimePct: null,
      ageDays: null,
      activeFlags: 0,
    });
    expect(unknown.score).toBeGreaterThan(0);
    expect(unknown.score).toBeLessThan(50);
  });

  it('flag cezası taban 0 altına inmez', () => {
    const { score } = computeScore({ ...healthy, activeFlags: 100 });
    expect(score).toBe(0);
  });
});

describe('scoreTone', () => {
  it('skoru bastırılmış renk tonuna eşler', () => {
    expect(scoreTone(80)).toBe('good');
    expect(scoreTone(50)).toBe('warn');
    expect(scoreTone(10)).toBe('bad');
  });
});
