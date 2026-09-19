'use client';

import { useState } from 'react';

import { browserClient } from '@/lib/supabase/browser';

type State = { kind: 'idle' | 'sending' | 'sent' } | { kind: 'error'; message: string };

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setState({ kind: 'sending' });

    try {
      const { error } = await browserClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/admin/dogrula` },
      });
      if (error) throw new Error(error.message);
      setState({ kind: 'sent' });
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Bilinmeyen hata',
      });
    }
  }

  if (state.kind === 'sent') {
    return (
      <p className="mt-6 rounded-lg border border-good/30 bg-good/[0.06] p-3 text-xs leading-relaxed text-text-muted">
        Giriş bağlantısı <span className="text-text">{email}</span> adresine gönderildi.
        Bağlantıya bu tarayıcıdan tıkla.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <label className="block">
        <span className="text-xs text-text-muted">E-posta</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-text transition-colors duration-hover ease-out placeholder:text-text-faint focus:border-line-strong"
          placeholder="sen@example.com"
        />
      </label>

      <button
        type="submit"
        disabled={state.kind === 'sending'}
        className="relative w-full overflow-hidden rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-[#04121f] transition-[transform,filter] duration-hover ease-spring hover:brightness-110 active:scale-[0.97] disabled:cursor-progress"
      >
        Giriş bağlantısı gönder
        {state.kind === 'sending' && (
          <span
            aria-hidden
            className="rdr-progress absolute bottom-0 left-0 h-0.5 w-full bg-current opacity-60"
          />
        )}
      </button>

      {state.kind === 'error' && (
        <p className="rounded-md border border-bad/30 bg-bad/[0.06] p-2.5 text-xs text-bad">
          {state.message}
        </p>
      )}
    </form>
  );
}
