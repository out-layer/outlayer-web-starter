'use client';

import { useState } from 'react';
import Card from './Card';
import { toYocto } from '@/lib/client/format';

const DEFAULT_VALIDATOR = 'astro-stakers.poolv1.near';

export default function StakeCard() {
  const [amount, setAmount] = useState('1');
  const [validator, setValidator] = useState(DEFAULT_VALIDATOR);
  const [busy, setBusy] = useState<'stake' | 'unstake' | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function call(path: '/api/stake' | '/api/unstake', body: object) {
    setBusy(path === '/api/stake' ? 'stake' : 'unstake');
    setMessage(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error);
      setMessage({ ok: true, text: `Request ${data.request_id} — ${data.status}` });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card title="Stake / unstake NEAR" hint="Standard validator pool. Unstake then wait the unlock window (~36h).">
      <div className="space-y-3">
        <label className="block text-xs uppercase tracking-wide text-neutral-500">
          Validator
          <input
            type="text"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal normal-case"
            value={validator}
            onChange={(e) => setValidator(e.target.value)}
          />
        </label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            className="w-32 rounded-lg border px-3 py-2 text-sm"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className="text-sm text-neutral-600">NEAR</span>
          <button
            type="button"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
            disabled={busy !== null}
            onClick={() => call('/api/stake', { validator, amountYocto: toYocto(amount) })}
          >
            {busy === 'stake' ? 'Staking…' : 'Stake'}
          </button>
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
            disabled={busy !== null}
            onClick={() => call('/api/unstake', { validator })}
          >
            {busy === 'unstake' ? 'Unstaking…' : 'Unstake all'}
          </button>
        </div>
      </div>
      {message && (
        <p className={`mt-3 text-sm ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {message.text}
        </p>
      )}
    </Card>
  );
}
