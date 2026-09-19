'use client';

import { useState } from 'react';

import { AD_PLACEMENTS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { tr } from '@/lib/i18n/tr';

export type AdminAd = {
  id: string;
  placement: string;
  startsAt: string;
  endsAt: string | null;
  imageUrl: string | null;
  targetUrl: string | null;
  isActive: boolean;
};

const PLACEMENT_LABEL: Record<string, string> = {
  sidebar: 'Kenar',
  top: 'Üst şerit',
  homepage_block: 'Ana sayfa bloğu',
  calendar_highlight: 'Takvim öne çıkan',
};

/**
 * Reklam envanteri.
 *
 * Panelde de yazılı: reklam sıralamayı etkilemez. Skor hesabı ads tablosunu
 * hiç okumaz, reklamlar listelere karıştırılmaz.
 */
export function AdManager({ ads }: { ads: readonly AdminAd[] }) {
  const [placement, setPlacement] = useState<string>('homepage_block');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setState('saving');
    setMessage(null);

    try {
      const response = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          server_id: null,
          placement,
          starts_at: new Date().toISOString(),
          ends_at: endsAt === '' ? null : new Date(endsAt).toISOString(),
          image_url: imageUrl,
          target_url: targetUrl,
          is_active: true,
        }),
      });
      const data: { ok?: boolean; reason?: string } = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.reason ?? 'Eklenemedi');
      window.location.reload();
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Bilinmeyen hata');
    }
  }

  return (
    <>
      <p className="mb-3 rounded-md border border-line bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-text-muted">
        <span className="font-medium text-text">{tr.ad.note}</span> Skor hesabı bu tabloyu
        hiç okumaz; reklamlar yalnızca kendi ayrı bloğunda ve &quot;{tr.ad.label}&quot;
        etiketiyle görünür.
      </p>

      <form
        onSubmit={submit}
        className="grid gap-3 rounded-lg border border-line bg-surface-1 p-4 sm:grid-cols-2"
      >
        <label className="block">
          <span className="text-xs text-text-muted">Yerleşim</span>
          <select
            value={placement}
            onChange={(e) => setPlacement(e.target.value)}
            className={inputClass}
          >
            {AD_PLACEMENTS.map((value) => (
              <option key={value} value={value}>
                {PLACEMENT_LABEL[value] ?? value}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-text-muted">Bitiş</span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-xs text-text-muted">Görsel adresi</span>
          <input
            type="url"
            required
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-xs text-text-muted">Hedef adres</span>
          <input
            type="url"
            required
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            className={inputClass}
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={state === 'saving'}
            className="relative overflow-hidden rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-[#04121f] transition-[transform,filter] duration-hover ease-spring hover:brightness-110 active:scale-[0.97] disabled:cursor-progress"
          >
            Reklam ekle
            {state === 'saving' && (
              <span
                aria-hidden
                className="rdr-progress absolute bottom-0 left-0 h-0.5 w-full bg-current opacity-60"
              />
            )}
          </button>
          {message && (
            <p className="mt-2 text-xs text-bad" aria-live="polite">
              {message}
            </p>
          )}
        </div>
      </form>

      {ads.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {ads.map((ad) => (
            <li
              key={ad.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-xs"
            >
              <span>
                <span className="font-medium">
                  {PLACEMENT_LABEL[ad.placement] ?? ad.placement}
                </span>
                <span className="text-text-faint">
                  {' · '}
                  {formatDate(ad.startsAt)}
                  {ad.endsAt ? ` → ${formatDate(ad.endsAt)}` : ' → süresiz'}
                </span>
              </span>
              <span className={ad.isActive ? 'text-good' : 'text-text-faint'}>
                {ad.isActive ? 'yayında' : 'kapalı'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const inputClass =
  'mt-1.5 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-text transition-colors duration-hover ease-out placeholder:text-text-faint focus:border-line-strong';
