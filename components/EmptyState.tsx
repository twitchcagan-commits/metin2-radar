import type { LucideIcon } from 'lucide-react';

/**
 * "Veri yok" yazıp geçmiyoruz. Her boş durumun ikonu ve ne yapılacağını
 * söyleyen bir satırı var.
 */
export function EmptyState({
  icon: Icon,
  title,
  line,
  action,
}: {
  icon: LucideIcon;
  title: string;
  line: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-lg border border-line bg-surface-2">
        <Icon className="size-5 text-text-faint" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-medium text-text">{title}</p>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-text-muted">{line}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
