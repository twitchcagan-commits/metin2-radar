/**
 * Yükleme iskeletleri. Spinner YOK.
 * Her iskelet gerçek içerikle AYNI boyutta olmalı — içerik gelince sayfa
 * zıplamayacak (CLS < 0.05 kabul kriteri buna bağlı).
 */

export function SkeletonBlock({ className }: { className?: string }) {
  return <span className={['rdr-skeleton block', className].filter(Boolean).join(' ')} />;
}

/** ServerCard ile aynı yükseklik: logo 40px + iki satır metin + alt şerit. */
export function ServerCardSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-surface-1 p-4">
      <div className="flex items-start gap-3">
        <SkeletonBlock className="size-10 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-2 h-3 w-20" />
        </div>
        <SkeletonBlock className="h-7 w-14 rounded-md" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-7 w-[88px]" />
      </div>
    </div>
  );
}

export function ServerListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <ServerCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** TrendChart ile aynı yükseklik (260px + başlık şeridi). */
export function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-surface-1 p-4">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-7 w-36 rounded-md" />
      </div>
      <SkeletonBlock className="mt-4 h-[260px] w-full rounded-md" />
    </div>
  );
}

export function ScoreCardSkeleton() {
  return (
    <div className="flex items-center gap-6 rounded-lg border border-line bg-surface-1 p-5">
      <SkeletonBlock className="size-[132px] rounded-full" />
      <div className="flex-1 space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonBlock key={index} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}
