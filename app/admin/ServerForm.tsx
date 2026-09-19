'use client';

import { useState } from 'react';
import { FlaskConical } from 'lucide-react';

import { SERVER_STATUSES, SERVER_TYPES } from '@/lib/constants';
import { tr } from '@/lib/i18n/tr';

/**
 * Sunucu ekle/düzenle formu + SELECTOR TEST BUTONU.
 *
 * Test butonu, toplayıcının kullandığı kodun aynısını çağırır (aynı fetch,
 * aynı cheerio yolu) — panelde çalışan bir selector üretimde de çalışır.
 */

export type ServerFormValues = {
  id: string | null;
  slug: string;
  name: string;
  website_url: string;
  download_url: string;
  discord_guild_id: string;
  discord_invite: string;
  game_host: string;
  game_port: string;
  logo_url: string;
  level_range: string;
  server_type: string;
  opens_at: string;
  status: string;
  died_at: string;
  owner_key: string;
  is_verified: boolean;
  counter_selector: string;
  counter_url: string;
};

export const EMPTY_SERVER: ServerFormValues = {
  id: null,
  slug: '',
  name: '',
  website_url: '',
  download_url: '',
  discord_guild_id: '',
  discord_invite: '',
  game_host: '',
  game_port: '',
  logo_url: '',
  level_range: '',
  server_type: '',
  opens_at: '',
  status: 'upcoming',
  died_at: '',
  owner_key: '',
  is_verified: false,
  counter_selector: '',
  counter_url: '',
};

type Save = { kind: 'idle' | 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };
type Test =
  | { kind: 'idle' | 'testing' }
  | { kind: 'done'; online: number | null; error: string | null };

export function ServerForm({ initial }: { initial: ServerFormValues }) {
  const [values, setValues] = useState<ServerFormValues>(initial);
  const [save, setSave] = useState<Save>({ kind: 'idle' });
  const [test, setTest] = useState<Test>({ kind: 'idle' });

  function set<K extends keyof ServerFormValues>(key: K, value: ServerFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }));
    setSave({ kind: 'idle' });
  }

  async function runSelectorTest(): Promise<void> {
    setTest({ kind: 'testing' });
    try {
      const response = await fetch('/api/admin/selector-test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          counter_url: values.counter_url,
          counter_selector: values.counter_selector,
        }),
      });
      const data: { online?: number | null; error?: string | null; reason?: string } =
        await response.json();

      setTest({
        kind: 'done',
        online: data.online ?? null,
        error: data.error ?? data.reason ?? null,
      });
    } catch (error) {
      setTest({
        kind: 'done',
        online: null,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      });
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSave({ kind: 'saving' });

    try {
      const response = await fetch('/api/admin/servers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data: { ok?: boolean; reason?: string; issues?: { path: string; message: string }[] } =
        await response.json();

      if (!response.ok || !data.ok) {
        const detail =
          data.issues?.map((i) => `${i.path}: ${i.message}`).join(' · ') ?? data.reason;
        throw new Error(detail ?? 'Kaydedilemedi');
      }

      setSave({ kind: 'saved' });
      window.location.reload();
    } catch (error) {
      setSave({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Bilinmeyen hata',
      });
    }
  }

  const canTest =
    values.counter_url.trim() !== '' && values.counter_selector.trim() !== '' && test.kind !== 'testing';

  return (
    <form onSubmit={submit} className="rounded-lg border border-line bg-surface-1 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Slug (adres)" hint="küçük harf, rakam, tire">
          <input
            required
            value={values.slug}
            onChange={(e) => set('slug', e.target.value)}
            className={inputClass}
            placeholder="ornek-sunucu"
          />
        </Field>

        <Field label="Ad">
          <input
            required
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Durum">
          <select
            value={values.status}
            onChange={(e) => set('status', e.target.value)}
            className={inputClass}
          >
            {SERVER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {tr.status[status]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tür">
          <select
            value={values.server_type}
            onChange={(e) => set('server_type', e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {SERVER_TYPES.map((type) => (
              <option key={type} value={type}>
                {tr.serverType[type]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Açılış" hint="Türkiye saati">
          <input
            type="datetime-local"
            value={values.opens_at}
            onChange={(e) => set('opens_at', e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Kapanış" hint="mezarlığa taşımak için">
          <input
            type="datetime-local"
            value={values.died_at}
            onChange={(e) => set('died_at', e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Seviye aralığı">
          <input
            value={values.level_range}
            onChange={(e) => set('level_range', e.target.value)}
            className={inputClass}
            placeholder="1-120"
          />
        </Field>

        <Field label="Sahip anahtarı" hint="aynı sahibin sunucularını bağlar">
          <input
            value={values.owner_key}
            onChange={(e) => set('owner_key', e.target.value)}
            className={inputClass}
            placeholder="kartal"
          />
        </Field>

        <Field label="Site adresi">
          <input
            type="url"
            value={values.website_url}
            onChange={(e) => set('website_url', e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="İndirme adresi">
          <input
            type="url"
            value={values.download_url}
            onChange={(e) => set('download_url', e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Discord sunucu ID" hint="widget açık olmalı">
          <input
            value={values.discord_guild_id}
            onChange={(e) => set('discord_guild_id', e.target.value)}
            className={inputClass}
            placeholder="123456789012345678"
          />
        </Field>

        <Field label="Discord davet bağlantısı">
          <input
            type="url"
            value={values.discord_invite}
            onChange={(e) => set('discord_invite', e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Oyun sunucusu">
          <input
            value={values.game_host}
            onChange={(e) => set('game_host', e.target.value)}
            className={inputClass}
            placeholder="game.example.com"
          />
        </Field>

        <Field label="Oyun portu">
          <input
            inputMode="numeric"
            value={values.game_port}
            onChange={(e) => set('game_port', e.target.value)}
            className={inputClass}
            placeholder="13000"
          />
        </Field>

        <Field label="Logo adresi">
          <input
            type="url"
            value={values.logo_url}
            onChange={(e) => set('logo_url', e.target.value)}
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2 self-end py-2 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={values.is_verified}
            onChange={(e) => set('is_verified', e.target.checked)}
            className="size-4 accent-[var(--color-accent)]"
          />
          Doğrulanmış sunucu
        </label>
      </div>

      {/* --- Sayaç + selector testi --- */}
      <fieldset className="mt-5 rounded-md border border-line bg-surface-2 p-3.5">
        <legend className="px-1 text-xs font-medium text-text-muted">Site sayacı</legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sayaç sayfası">
            <input
              type="url"
              value={values.counter_url}
              onChange={(e) => set('counter_url', e.target.value)}
              className={inputClass}
              placeholder="https://example.com"
            />
          </Field>

          <Field label="CSS selector">
            <input
              value={values.counter_selector}
              onChange={(e) => set('counter_selector', e.target.value)}
              className={inputClass}
              placeholder="#online-count"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runSelectorTest}
            disabled={!canTest}
            className="relative inline-flex items-center gap-2 overflow-hidden rounded-md border border-line bg-surface-3 px-3 py-2 text-xs transition-[transform,border-color] duration-hover ease-spring hover:border-line-strong active:scale-[0.97] disabled:opacity-50"
          >
            <FlaskConical className="size-3.5" aria-hidden />
            Selector&apos;ı test et
            {test.kind === 'testing' && (
              <span
                aria-hidden
                className="rdr-progress absolute bottom-0 left-0 h-0.5 w-full bg-current opacity-60"
              />
            )}
          </button>

          {test.kind === 'done' && (
            <p
              aria-live="polite"
              className={[
                'text-xs',
                test.online !== null ? 'text-good' : 'text-bad',
              ].join(' ')}
            >
              {test.online !== null ? (
                <>
                  Bulunan sayı: <span className="tnum font-semibold">{test.online}</span>
                </>
              ) : (
                <>Okunamadı: {test.error}</>
              )}
            </p>
          )}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={save.kind === 'saving'}
          className="relative overflow-hidden rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-[#04121f] transition-[transform,filter] duration-hover ease-spring hover:brightness-110 active:scale-[0.97] disabled:cursor-progress"
        >
          {values.id ? 'Güncelle' : 'Ekle'}
          {save.kind === 'saving' && (
            <span
              aria-hidden
              className="rdr-progress absolute bottom-0 left-0 h-0.5 w-full bg-current opacity-60"
            />
          )}
        </button>

        {save.kind === 'error' && (
          <p className="text-xs text-bad" aria-live="polite">
            {save.message}
          </p>
        )}
      </div>
    </form>
  );
}

const inputClass =
  'mt-1.5 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-text transition-colors duration-hover ease-out placeholder:text-text-faint focus:border-line-strong';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-text-muted">{label}</span>
      {hint && <span className="ml-1.5 text-[11px] text-text-faint">({hint})</span>}
      {children}
    </label>
  );
}
