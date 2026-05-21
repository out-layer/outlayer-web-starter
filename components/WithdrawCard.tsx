/**
 * Withdraw — gasless cross-chain withdraw via NEAR Intents.
 *
 * Pick destination chain + token + amount + address. The token must already
 * be in the wallet's intents.near balance. Modeled on near-fm's withdraw UX
 * (chain chips + quick amounts).
 */

'use client';

import { useState } from 'react';
import Card from './Card';
import { postJson } from '@/lib/client/api';
import { refreshBalances } from '@/lib/client/events';
import { TOKENS, bySymbol, toRaw } from '@/lib/client/tokens';

const CHAINS = ['ethereum', 'solana', 'base', 'arbitrum', 'polygon', 'optimism', 'avalanche'];
const QUICK = ['1', '5', '10', '25'];

type WithdrawResult = {
  request_id: string;
  status: string;
  approval_id?: string | null;
  required?: number | null;
  approved?: number | null;
};

export default function WithdrawCard() {
  const [chain, setChain] = useState('ethereum');
  const [symbol, setSymbol] = useState('USDC');
  const [amount, setAmount] = useState('1');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const token = bySymbol(symbol);
  const inputCls = 'rounded-lg border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800';

  async function withdraw() {
    setBusy(true);
    setMessage(null);
    try {
      const r = await postJson<WithdrawResult>('/api/withdraw', {
        chain,
        to,
        amount: toRaw(amount, token.decimals),
        token: token.defuseId,
      });
      if (r.status === 'pending_approval') {
        setMessage({ ok: true, text: `Pending approval ${r.approval_id} (${r.approved ?? 0}/${r.required})` });
      } else {
        setMessage({ ok: true, text: `Submitted ${r.request_id} — ${r.status}` });
      }
      refreshBalances();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Withdraw" hint="Gasless cross-chain withdraw via NEAR Intents. Token must be in your intents.near balance.">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <label className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            To chain
            <select className={`mt-1 block ${inputCls}`} value={chain} onChange={(e) => setChain(e.target.value)}>
              {CHAINS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Token
            <select className={`mt-1 block ${inputCls}`} value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              {TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Destination address
            <input
              className={`mt-1 block w-full font-mono ${inputCls}`}
              placeholder={chain === 'solana' ? 'Solana address' : '0x…'}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input className={`w-28 ${inputCls}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">{symbol}</span>
          {QUICK.map((v) => (
            <button
              key={v}
              type="button"
              className="rounded-lg border px-2.5 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              onClick={() => setAmount(v)}
            >
              {v}
            </button>
          ))}
          <button
            type="button"
            className="ml-auto rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            disabled={busy || !to}
            onClick={withdraw}
          >
            {busy ? 'Submitting…' : 'Withdraw'}
          </button>
        </div>
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? 'text-emerald-700 dark:text-emerald-500' : 'text-red-700 dark:text-red-400'}`}>
          {message.text}
        </p>
      )}
    </Card>
  );
}
