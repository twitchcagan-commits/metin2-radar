import { ScoreRing } from '@/components/ScoreRing';
import { WEIGHTS } from '@/lib/analysis/score';
import { tr } from '@/lib/i18n/tr';

/**
 * Skor kırılımı. Skoru kapalı kutu bırakmıyoruz: hangi bileşenden kaç puan
 * geldiği yazılı, böylece sunucu sahibi de neyi düzelteceğini görür.
 */
const PARTS = [
  { key: 'trend', label: tr.score.parts.trend, max: WEIGHTS.trend },
  { key: 'clicks', label: tr.score.parts.clicks, max: WEIGHTS.clicks },
  { key: 'discord', label: tr.score.parts.discord, max: WEIGHTS.discord },
  { key: 'uptime', label: tr.score.parts.uptime, max: WEIGHTS.uptime },
  { key: 'lifespan', label: tr.score.parts.lifespan, max: WEIGHTS.lifespan },
] as const;

export function ScoreBreakdown({
  score,
  breakdown,
}: {
  score: number | null;
  breakdown: Record<string, number> | null;
}) {
  const penalty = breakdown?.penalty ?? 0;

  return (
    <section className="rounded-lg border border-line bg-surface-1 p-5">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <ScoreRing score={score} />

        <div className="w-full min-w-0 flex-1">
          <h2 className="text-sm font-medium">{tr.score.breakdown}</h2>

          <dl className="mt-3 space-y-2.5">
            {PARTS.map((part) => {
              const value = breakdown?.[part.key] ?? null;
              const pct = value === null ? 0 : Math.max(0, Math.min(1, value / part.max));

              return (
                // Yapı: div > dt + dd + dd. Bir dt'ye birden fazla dd
                // bağlamak geçerli HTML; ilerleme çubuğu da ikinci dd olarak
                // duruyor, böylece dl içinde sarmalayıcı div kalmıyor.
                <div key={part.key} className="grid grid-cols-[1fr_auto] items-baseline gap-x-2 text-xs">
                  <dt className="text-text-muted">{part.label}</dt>
                  <dd className="tnum text-text-faint">
                    {value === null ? '—' : value.toFixed(1)}
                    <span className="text-text-faint"> / {part.max}</span>
                  </dd>
                  {/* Dolgu transform ile büyür: layout tetiklemez. */}
                  <dd className="col-span-2 mt-1 h-1 overflow-hidden rounded-sm bg-surface-3">
                    <span
                      className="block h-full origin-left rounded-sm bg-accent/70 transition-transform duration-enter ease-out"
                      style={{ transform: `scaleX(${pct})` }}
                    />
                  </dd>
                </div>
              );
            })}

            {penalty < 0 && (
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-2 border-t border-line pt-2.5 text-xs">
                <dt className="text-bad">{tr.score.parts.penalty}</dt>
                <dd className="tnum text-bad">{penalty.toFixed(1)}</dd>
              </div>
            )}
          </dl>

          <p className="mt-4 text-[11px] leading-relaxed text-text-faint">{tr.score.note}</p>
        </div>
      </div>
    </section>
  );
}
