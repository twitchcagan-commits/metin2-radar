'use client';

import { useEffect, useState } from 'react';

import { tr } from '@/lib/i18n/tr';

/**
 * Geri sayım. Rakam değişirken eskisi yukarı kayıp çıkar, yenisi aşağıdan gelir
 * — ve bu SADECE değişen basamağa uygulanır, tüm sayaca değil.
 *
 * Sunucu ve tarayıcı ilk render'da aynı şeyi basmalı (hydration), bu yüzden
 * başlangıç değeri prop olarak gelir; saniye sayacı mount'tan sonra başlar.
 */

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function partsUntil(target: number, now: number): Parts | null {
  const diff = target - now;
  if (diff <= 0) return null;

  const total = Math.floor(diff / 1000);
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Tek basamak. `key` değişince animasyon yeniden tetiklenir. */
function Digit({ char }: { char: string }) {
  return (
    <span className="relative inline-block h-[1.1em] w-[0.62em] overflow-hidden align-baseline">
      <span key={char} className="absolute inset-0 animate-[rdr-digit_300ms_var(--ease-out)]">
        {char}
      </span>
    </span>
  );
}

function Unit({ value, label, pad = 2 }: { value: number; label: string; pad?: number }) {
  const text = String(value).padStart(pad, '0');

  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className="tnum inline-flex font-semibold">
        {text.split('').map((char, index) => (
          <Digit key={`${label}-${index}-${char}`} char={char} />
        ))}
      </span>
      <span className="text-[0.7em] text-text-faint">{label}</span>
    </span>
  );
}

export function Countdown({
  opensAt,
  className,
}: {
  opensAt: string;
  className?: string;
}) {
  const target = new Date(opensAt).getTime();
  const [parts, setParts] = useState<Parts | null>(() => partsUntil(target, Date.now()));

  useEffect(() => {
    const tick = (): void => setParts(partsUntil(target, Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (parts === null) {
    return <span className={className}>{tr.status.active}</span>;
  }

  return (
    <span
      className={['inline-flex items-baseline gap-2', className].filter(Boolean).join(' ')}
      aria-label={`${parts.days} gün ${parts.hours} saat ${parts.minutes} dakika kaldı`}
    >
      {parts.days > 0 && (
        <Unit value={parts.days} label={tr.time.countdownDays} pad={1} />
      )}
      <Unit value={parts.hours} label={tr.time.countdownHours} />
      <Unit value={parts.minutes} label={tr.time.countdownMinutes} />
      {parts.days === 0 && <Unit value={parts.seconds} label={tr.time.countdownSeconds} />}
    </span>
  );
}
