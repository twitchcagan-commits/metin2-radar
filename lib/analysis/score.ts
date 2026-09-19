import { clamp } from '@/lib/analysis/stats';
import { percentChange } from '@/lib/format';

/**
 * 0-100 radar skoru. Günlük hesaplanır.
 *
 * TEMEL KURAL: sunucunun kendi beyan ettiği online sayısı skora GİRMEZ.
 * Sadece trend hesabında kullanılır — çünkü yüzde değişim, sayaç 50 kat
 * şişirilmiş olsa bile doğrudur (çarpan pay ve paydada sadeleşir).
 *
 * Ağırlıklar spec'te sabit: trend 30, tıklama 25, Discord 20, uptime 15,
 * yaşam süresi 10. Aktif her flag -15, taban 0.
 */

export const WEIGHTS = {
  trend: 30,
  clicks: 25,
  discord: 20,
  uptime: 15,
  lifespan: 10,
} as const;

export const FLAG_PENALTY = 15;

/**
 * Varsayım (ürün kararı): tıklama puanı için doygunluk noktası haftada
 * 500 benzersiz ziyaretçi. Türkiye PVP sahnesinin ölçeğinde bu üst sınır
 * makul; gerçek veri gelince tek yerden değiştirilir.
 */
export const CLICKS_SATURATION = 500;

/** Varsayım: yaşam süresi puanı 1 yılda dolar. */
export const LIFESPAN_SATURATION_DAYS = 365;

export type ScoreInput = {
  /** 7 gün önceki günlük ortalama (beyan edilen sayaç ya da Discord aktif). */
  trendFrom: number | null;
  /** Bugünkü günlük ortalama. */
  trendTo: number | null;
  /** Son 7 günde benzersiz ip_hash sayısı — kendi ölçümümüz. */
  uniqueClicks7d: number;
  /** Discord aktif / üye oranı. Üye sayısı bilinmiyorsa null. */
  discordActiveRatio: number | null;
  /** Discord üye sayısının 7 günlük yüzde değişimi. Bilinmiyorsa null. */
  discordMemberGrowthPct: number | null;
  /** Oyun portu + site erişilebilirliği, 0-100. */
  uptimePct: number | null;
  /** Açılıştan bu yana geçen gün. */
  ageDays: number | null;
  /** Aktif flag sayısı. */
  activeFlags: number;
};

export type ScoreBreakdown = {
  trend: number;
  clicks: number;
  discord: number;
  uptime: number;
  lifespan: number;
  penalty: number;
};

export type ScoreResult = {
  score: number;
  breakdown: ScoreBreakdown;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Trend puanı. -50% ve altı 0 puan, 0% değişim ağırlığın yarısı,
 * +50% ve üstü tam puan. Düşen sunucu cezalandırılır, sabit duran orta alır.
 */
export function trendPoints(from: number | null, to: number | null): number {
  if (from === null || to === null) return WEIGHTS.trend * 0.5;
  const change = percentChange(from, to);
  const normalized = clamp((change + 50) / 100, 0, 1);
  return round2(normalized * WEIGHTS.trend);
}

/** Tıklama puanı. Logaritmik: ilk ziyaretçiler çok, sonrakiler az puan getirir. */
export function clickPoints(uniqueClicks: number): number {
  const safe = Math.max(0, uniqueClicks);
  if (safe === 0) return 0;
  const normalized =
    Math.log10(1 + safe) / Math.log10(1 + CLICKS_SATURATION);
  return round2(clamp(normalized, 0, 1) * WEIGHTS.clicks);
}

/**
 * Discord puanı: aktiflik oranı (%15'i sağlıklı sayılır) + üye artışı.
 * Üye sayısı bilinmiyorsa (widget 100 üyede kesiyor) sadece aktiflik payı
 * verilir, eksik veri yüzünden sunucu cezalandırılmaz.
 */
export function discordPoints(
  activeRatio: number | null,
  memberGrowthPct: number | null,
): number {
  const ratioWeight = WEIGHTS.discord * 0.6;
  const growthWeight = WEIGHTS.discord * 0.4;

  if (activeRatio === null && memberGrowthPct === null) {
    return WEIGHTS.discord * 0.5;
  }

  let points = 0;

  if (activeRatio === null) {
    points += ratioWeight * 0.5;
  } else {
    // %15 aktiflik tam puan kabul edilir.
    points += clamp(activeRatio / 0.15, 0, 1) * ratioWeight;
  }

  if (memberGrowthPct === null) {
    points += growthWeight * 0.5;
  } else {
    // -10% ve altı 0, 0% yarım, +10% ve üstü tam.
    points += clamp((memberGrowthPct + 10) / 20, 0, 1) * growthWeight;
  }

  return round2(points);
}

export function uptimePoints(uptimePct: number | null): number {
  if (uptimePct === null) return 0;
  return round2(clamp(uptimePct / 100, 0, 1) * WEIGHTS.uptime);
}

/** Yaşam süresi puanı, logaritmik. Yeni sunucu 0, 1 yıllık tam puan. */
export function lifespanPoints(ageDays: number | null): number {
  if (ageDays === null || ageDays <= 0) return 0;
  const normalized =
    Math.log10(1 + ageDays) / Math.log10(1 + LIFESPAN_SATURATION_DAYS);
  return round2(clamp(normalized, 0, 1) * WEIGHTS.lifespan);
}

export function computeScore(input: ScoreInput): ScoreResult {
  const breakdown: ScoreBreakdown = {
    trend: trendPoints(input.trendFrom, input.trendTo),
    clicks: clickPoints(input.uniqueClicks7d),
    discord: discordPoints(input.discordActiveRatio, input.discordMemberGrowthPct),
    uptime: uptimePoints(input.uptimePct),
    lifespan: lifespanPoints(input.ageDays),
    penalty: -round2(Math.max(0, input.activeFlags) * FLAG_PENALTY),
  };

  const raw =
    breakdown.trend +
    breakdown.clicks +
    breakdown.discord +
    breakdown.uptime +
    breakdown.lifespan +
    breakdown.penalty;

  return { score: round2(clamp(raw, 0, 100)), breakdown };
}

/** Skor rengi: bastırılmış yeşil/sarı/kırmızı. Floresan yok. */
export function scoreTone(score: number): 'good' | 'warn' | 'bad' {
  if (score >= 65) return 'good';
  if (score >= 35) return 'warn';
  return 'bad';
}
