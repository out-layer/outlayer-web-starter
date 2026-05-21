'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Card from './Card';
import { getJson } from '@/lib/client/api';
import { onRefreshBalances, refreshBalances } from '@/lib/client/events';
import { fromRaw, toRaw } from '@/lib/client/tokens';

const DEFAULT_VALIDATOR = 'astro-stakers.poolv1.near';

type StakeInfo = { available: string; staked: string };

export default function StakeCard() {
  const [amount, setAmount] = useState('1');
  const [validator, setValidator] = useState(DEFAULT_VALIDATOR);
  const [info, setInfo] = useState<StakeInfo | null>(null);
  const [busy, setBusy] = useState<'stake' | 'unstake' | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (v: string) => {
    try {
      setInfo(await getJson<StakeInfo>(`/api/staking?validator=${encodeURIComponent(v)}`));
    } catch {
      setInfo(null);
    }
  }, []);

  // Debounced reload on validator change (and initial mount).
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(validator), 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [validator, load]);

  // Refetch after any action changes balances.
  useEffect(() => onRefreshBalances(() => void load(validator)), [validator, load]);

  async function call(path: '/api/stake' | '/api/unstake', body: object, kind: 'stake' | 'unstake') {
    setBusy(kind);
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
      refreshBalances();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const availYocto = info ? BigInt(info.available) : 0n;
  const stakedYocto = info ? BigInt(info.staked) : 0n;
  let amountYocto = 0n;
  try {
    amountYocto = BigInt(toRaw(amount || '0', 24));
  } catch {
    amountYocto = 0n;
  }
  const canStake = busy === null && amountYocto > 0n && amountYocto <= availYocto;
  const canUnstake = busy === null && stakedYocto > 0n;
  const inputCls = 'rounded-lg border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800';

  return (
    <Card title="Stake / unstake NEAR" hint="Standard validator pool. Unstake then wait the unlock window (~36h).">
      <div className="space-y-3">
        <label className="block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Validator
          <input
            type="text"
            className={`mt-1 w-full font-normal normal-case ${inputCls}`}
            value={validator}
            onChange={(e) => setValidator(e.target.value)}
          />
        </label>

        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Available: <span className="font-mono">{info ? fromRaw(info.available, 24) : '…'}</span> NEAR
          {' · '}Staked: <span className="font-mono">{info ? fromRaw(info.staked, 24) : '…'}</span> NEAR
        </p>

        <div className="flex items-center gap-3">
          <input className={`w-32 ${inputCls}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">NEAR</span>
          <button
            type="button"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            disabled={!canStake}
            onClick={() => call('/api/stake', { validator, amountYocto: toRaw(amount, 24) }, 'stake')}
          >
            {busy === 'stake' ? 'Staking…' : 'Stake'}
          </button>
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            disabled={!canUnstake}
            onClick={() => call('/api/unstake', { validator }, 'unstake')}
          >
            {busy === 'unstake' ? 'Unstaking…' : 'Unstake all'}
          </button>
        </div>
        {info && availYocto === 0n && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            No native NEAR to stake. Buy NEAR (swap), then unwrap wNEAR → NEAR first.
          </p>
        )}
      </div>
      {message && (
        <p className={`mt-3 text-sm ${message.ok ? 'text-emerald-700 dark:text-emerald-500' : 'text-red-700 dark:text-red-400'}`}>
          {message.text}
        </p>
      )}
    </Card>
  );
}
