import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

/** Yetkisiz erişimde gösterilen ortak blok. */
export function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-lg border border-line bg-surface-2">
        <ShieldAlert className="size-5 text-text-faint" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-medium">Bu sayfaya erişimin yok</p>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-text-muted">
        Yönetim paneli yalnızca izin listesindeki hesaba açıktır.
      </p>
      <Link
        href="/admin/giris"
        className="mt-4 rounded-md border border-line bg-surface-2 px-3 py-2 text-xs transition-colors duration-hover ease-out hover:border-line-strong"
      >
        Giriş yap
      </Link>
    </div>
  );
}
