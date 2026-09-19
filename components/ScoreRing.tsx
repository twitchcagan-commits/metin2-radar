'use client';

import { scoreTone } from '@/lib/analysis/score';
import { useCountUp } from '@/lib/hooks/useCountUp';
import { tr } from '@/lib/i18n/tr';

/**
 * Skor halkası: 0-100 dairesel progress, dolarken animasyonlu.
 * Renk skora göre değişir ama tonlar bastırılmış — floresan değil.
 */
const TONE_VAR: Record<'good' | 'warn' | 'bad', string> = {
  good: 'var(--color-good)',
  warn: 'var(--color-warn)',
  bad: 'var(--color-bad)',
};

export function ScoreRing({
  score,
  size = 132,
}: {
  score: number | null;
  size?: number;
}) {
  const safe = score ?? 0;
  const animated = useCountUp(safe);

  const stroke = Math.max(6, Math.round(size * 0.075));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, animated / 100)));
  const color = TONE_VAR[scoreTone(safe)];

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        score === null
          ? `${tr.score.title}: hesaplanmadı`
          : `${tr.score.title}: ${Math.round(score)} ${tr.score.outOf}`
      }
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {score === null ? (
          <span className="text-sm text-text-faint">—</span>
        ) : (
          <>
            <span
              className="tnum font-semibold leading-none"
              style={{ fontSize: size * 0.26, color }}
            >
              {Math.round(animated)}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-wide text-text-faint">
              {tr.score.outOf}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
