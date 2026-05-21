/**
 * Buy NEAR — swap any whitelisted token (USDT/USDC/ETH/SOL) → wNEAR via
 * NEAR Intents. Shows a live quote (debounced) before the user commits.
 *
 * The token must already sit in the wallet's intents.near balance (fund it
 * via the Deposit card). The quote endpoint works regardless of balance, so
 * you can preview rates immediately.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Card from './Card';
import { postJson } from '@/lib/client/api';
import { TOKENS, WNEAR, bySymbol, fromRaw, toRaw } from '@/lib/client/tokens';

type Quote = { amount_out?: string; min_amount_out?: string };

export default function SwapCard() {
  const [symbol, setSymbol] = useState('USDT');
  const [amount, setAmount] = useState('10');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = bySymbol(symbol);

  // Debounced quote whenever token or amount changes.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setQuote(null);
    if (!amount || parseFloat(amount) <= 0) return;
    setQuoting(true);
    timer.current = setTimeout(async () => {
      try {
        const q = await postJson<Quote>('/api/swap/quote', {
          tokenIn: token.defuseId,
          tokenOut: WNEAR.defuseId,
          amountIn: toRaw(amount, token.decimals),
        });
        setQuote(q);
      } catch {
        setQuote(null);
      } finally {
        setQuoting(false);
      }
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [symbol, amount, token.defuseId, token.decimals]);

  async function swap() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await postJson<{ request_id: string; status: string; amount_out?: string }>('/api/swap', {
        tokenIn: token.defuseId,
        tokenOut: WNEAR.defuseId,
        amountIn: toRaw(amount, token.decimals),
        minAmountOut: quote?.min_amount_out,
      });
      const got = r.amount_out ? `${fromRaw(r.amount_out, WNEAR.decimals)} wNEAR` : r.status;
      setResult(`Swapped → ${got} (request ${r.request_id})`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'rounded-lg border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800';
  const estimate = quote?.amount_out ? fromRaw(quote.amount_out, WNEAR.decimals) : null;

  return (
    <Card title="Buy NEAR" hint="Swap a token in your intents.near balance into wNEAR via NEAR Intents.">
      <div className="flex flex-wrap items-end gap-3">
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
        <label className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Amount
          <input className={`mt-1 block w-28 ${inputCls}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button
          type="button"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          disabled={busy || !estimate}
          onClick={swap}
        >
          {busy ? 'Swapping…' : 'Swap'}
        </button>
      </div>

      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
        {quoting
          ? 'Getting quote…'
          : estimate
            ? `≈ ${estimate} wNEAR for ${amount} ${symbol}`
            : 'Enter an amount to see a quote'}
      </p>

      {result && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-500">{result}</p>}
      {error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </Card>
  );
}
