import type { FlagKind } from '@/lib/constants';
import {
  coefficientOfVariation,
  istanbulHour,
  mean,
  median,
} from '@/lib/analysis/stats';

/**
 * Manipülasyon tespiti. Tamamı saf fonksiyon — girdi örnek dizisi, çıktı flag.
 *
 * Temel fikir: sunucu sahibi sayacı 10-100x şişirebilir ama grafiğin ŞEKLİNİ
 * taklit etmek zordur. Gerçek oyuncu sayısı gün içinde dalgalanır, gece diper,
 * akşam zirve yapar ve düzgün olmayan sayılar üretir. Burada mutlak değere değil
 * şekle bakıyoruz, bu yüzden çarpan bizi yanıltmaz.
 */

export type Sample = {
  collectedAt: Date | string;
  siteOnline: number | null;
};

export type Detection = {
  kind: FlagKind;
  details: Record<string, number | string>;
};

// Eşikler tek yerde dursun ki testle ve belgeyle aynı kalsın.
export const THRESHOLDS = {
  /** std/ortalama bunun altındaysa sayaç canlı değil. */
  flatlineCv: 0.02,
  flatlineMinSamples: 24,

  /** gece ortalaması / zirve ortalaması bunun üstündeyse gün/gece deseni yok. */
  diurnalRatio: 0.85,
  diurnalMinSamplesPerBucket: 6,

  /** Ardışık iki örnek arası bu orandan fazla artış sıçramadır. */
  stepJumpRatio: 0.5,
  /** Sıçrama sonrası yeni seviyede kalma toleransı. */
  stepJumpHoldTolerance: 0.15,
  stepJumpMinHoldSamples: 6,

  roundNumbersWindow: 100,
  roundNumbersShare: 0.8,
  roundNumbersMinSamples: 20,
  roundNumbersMultiple: 50,
} as const;

/** Gece dibi ve akşam zirvesi saat aralıkları (Türkiye saati). */
const NIGHT_HOURS = [4, 5];
const PEAK_HOURS = [21, 22, 23];

function usableValues(samples: readonly Sample[]): number[] {
  const values: number[] = [];
  for (const sample of samples) {
    if (sample.siteOnline !== null && Number.isFinite(sample.siteOnline)) {
      values.push(sample.siteOnline);
    }
  }
  return values;
}

// --- flatline --------------------------------------------------------------

/**
 * Son 24 saatte sayaç neredeyse hiç kıpırdamadıysa sahtedir.
 * Gerçek sunucuda oyuncu girer çıkar; sabit sayı elle yazılmış demektir.
 */
export function detectFlatline(samples: readonly Sample[]): Detection | null {
  const values = usableValues(samples);
  if (values.length < THRESHOLDS.flatlineMinSamples) return null;

  const avg = mean(values);
  // Sunucu gerçekten boşsa (0 civarı) bu bir manipülasyon değil, sadece ölü.
  if (avg < 5) return null;

  const cv = coefficientOfVariation(values);
  if (cv >= THRESHOLDS.flatlineCv) return null;

  return {
    kind: 'flatline',
    details: {
      cv: Number(cv.toFixed(5)),
      esik: THRESHOLDS.flatlineCv,
      ortalama: Number(avg.toFixed(1)),
      ornek: values.length,
    },
  };
}

// --- no_diurnal ------------------------------------------------------------

/**
 * Gerçek sunucularda gece 04:00-06:00 dip, 21:00-00:00 zirve olur.
 * Oran 1'e yaklaşıyorsa grafik gün boyu düz demektir — şüpheli.
 */
export function detectNoDiurnal(samples: readonly Sample[]): Detection | null {
  const night: number[] = [];
  const peak: number[] = [];

  for (const sample of samples) {
    if (sample.siteOnline === null || !Number.isFinite(sample.siteOnline)) continue;
    const hour = istanbulHour(sample.collectedAt);
    if (NIGHT_HOURS.includes(hour)) night.push(sample.siteOnline);
    else if (PEAK_HOURS.includes(hour)) peak.push(sample.siteOnline);
  }

  if (
    night.length < THRESHOLDS.diurnalMinSamplesPerBucket ||
    peak.length < THRESHOLDS.diurnalMinSamplesPerBucket
  ) {
    return null;
  }

  const nightAvg = mean(night);
  const peakAvg = mean(peak);
  if (peakAvg <= 0) return null;

  const ratio = nightAvg / peakAvg;
  if (ratio <= THRESHOLDS.diurnalRatio) return null;

  return {
    kind: 'no_diurnal',
    details: {
      oran: Number(ratio.toFixed(3)),
      esik: THRESHOLDS.diurnalRatio,
      gece_ortalama: Number(nightAvg.toFixed(1)),
      zirve_ortalama: Number(peakAvg.toFixed(1)),
    },
  };
}

// --- step_jump -------------------------------------------------------------

/**
 * Sayaç bir anda %50+ sıçrayıp yeni seviyede kaldıysa çarpan elle değiştirilmiş.
 * Gerçek oyuncu artışı kademeli olur; 10 dakikada ikiye katlanmaz ve orada durmaz.
 */
export function detectStepJump(samples: readonly Sample[]): Detection | null {
  const values = usableValues(samples);
  if (values.length < THRESHOLDS.stepJumpMinHoldSamples + 2) return null;

  for (let i = 1; i < values.length - THRESHOLDS.stepJumpMinHoldSamples; i += 1) {
    const before = values[i - 1];
    const after = values[i];
    if (before === undefined || after === undefined) continue;
    if (before < 5) continue;

    const growth = (after - before) / before;
    if (growth <= THRESHOLDS.stepJumpRatio) continue;

    // Sıçramadan sonraki pencerede yeni seviyede mi kalmış?
    const hold = values.slice(i, i + THRESHOLDS.stepJumpMinHoldSamples + 1);
    const holdMedian = median(hold);
    if (holdMedian <= 0) continue;

    const drift = Math.abs(holdMedian - after) / after;
    if (drift > THRESHOLDS.stepJumpHoldTolerance) continue;

    // Sıçrama öncesi seviyeye geri dönmediyse kalıcı bir basamaktır.
    if (holdMedian < before * (1 + THRESHOLDS.stepJumpRatio * 0.5)) continue;

    return {
      kind: 'step_jump',
      details: {
        oncesi: before,
        sonrasi: after,
        artis_yuzde: Number((growth * 100).toFixed(1)),
        yeni_seviye_medyan: Number(holdMedian.toFixed(1)),
      },
    };
  }

  return null;
}

// --- round_numbers ---------------------------------------------------------

/**
 * Örneklerin neredeyse tamamı 50'nin katıysa sayı hesaplanmıyor, uyduruluyor.
 */
export function detectRoundNumbers(samples: readonly Sample[]): Detection | null {
  const values = usableValues(samples).slice(-THRESHOLDS.roundNumbersWindow);
  if (values.length < THRESHOLDS.roundNumbersMinSamples) return null;

  // Sıfır tek başına yuvarlak sayılmaz, yoksa boş sunucular yanlış flag alır.
  const nonZero = values.filter((value) => value > 0);
  if (nonZero.length < THRESHOLDS.roundNumbersMinSamples) return null;

  const rounded = nonZero.filter(
    (value) => value % THRESHOLDS.roundNumbersMultiple === 0,
  ).length;
  const share = rounded / nonZero.length;

  if (share <= THRESHOLDS.roundNumbersShare) return null;

  return {
    kind: 'round_numbers',
    details: {
      oran: Number(share.toFixed(3)),
      esik: THRESHOLDS.roundNumbersShare,
      katsayi: THRESHOLDS.roundNumbersMultiple,
      ornek: nonZero.length,
    },
  };
}

// --- hepsi -----------------------------------------------------------------

export type DetectInput = {
  /** Son 24 saatin örnekleri (flatline için). */
  last24h: readonly Sample[];
  /** Son 7 günün örnekleri (gün/gece deseni, sıçrama, yuvarlak sayı için). */
  last7d: readonly Sample[];
};

/**
 * counter_offline burada üretilmez — onu toplayıcı anlık olarak kendisi yazar.
 */
export function detectAll(input: DetectInput): Detection[] {
  const found: Detection[] = [];

  const flatline = detectFlatline(input.last24h);
  if (flatline) found.push(flatline);

  const diurnal = detectNoDiurnal(input.last7d);
  if (diurnal) found.push(diurnal);

  const step = detectStepJump(input.last7d);
  if (step) found.push(step);

  const round = detectRoundNumbers(input.last7d);
  if (round) found.push(round);

  return found;
}
