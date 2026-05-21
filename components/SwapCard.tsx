/**
 * Buy NEAR — swap a whitelisted token (USDT/USDC/ETH/SOL) → wNEAR via NEAR
 * Intents. Shows the token's intents.near balance, a Max button, a live
 * (debounced) quote, and only enables Swap when the balance covers the amount.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Card from './Card';
import { getJson, postJson } from '@/lib/client/api';
import { onRefreshBalances, refreshBalances } from '@/lib/client/events';
import { TOKENS, WNEAR, bySymbol, fromRaw, toRaw } from '@/lib/client/tokens';

type Quote = { amount_out?: string; min_amount_out?: string };
type TokenBalance = { symbol: string; balance: string; decimals: number };
type Balances = { tokens: TokenBalance[] };

export default function SwapCard() {
  const [symbol, setSymbol] = useState('USDC');
  const [amount, setAmount] = useState('10');
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = bySymbol(symbol);
  const bal = balances.find((b) => b.symbol === symbol);
  const balRaw = bal ? BigInt(bal.balance) : 0n;

  const loadBalances = useCallback(async () => {
    try {
      const r = await getJson<Balances>('/api/balance');
      setBalances(r.tokens);
    } catch {
      /* ignore — balance is advisory here */
    }
  }, []);

  useEffect(() => {
    void loadBalances();
    return onRefreshBalances(() => void loadBalances());
  }, [loadBalances]);

  // Debounced quote.
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
      refreshBalances();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  let amountRaw = 0n;
  try {
    amountRaw = BigInt(toRaw(amount || '0', token.decimals));
  } catch {
    amountRaw = 0n;
  }
  const enough = amountRaw > 0n && amountRaw <= balRaw;
  const canSwap = !busy && enough && !!quote?.amount_out;

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
          <div className="mt-1 flex items-center gap-1">
            <input className={`w-28 ${inputCls}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button
              type="button"
              className="rounded-lg border px-2 py-2 text-xs hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              disabled={balRaw === 0n}
              onClick={() => bal && setAmount(fromRaw(bal.balance, bal.decimals, bal.decimals))}
            >
              Max
            </button>
          </div>
        </label>
        <button
          type="button"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          disabled={!canSwap}
          onClick={swap}
        >
          {busy ? 'Swapping…' : 'Swap'}
        </button>
      </div>

      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
        Balance: <span className="font-mono">{bal ? fromRaw(bal.balance, bal.decimals) : '0'}</span> {symbol}
        {estimate && enough && ` · ≈ ${estimate} wNEAR`}
        {quoting && ' · getting quote…'}
      </p>
      {amountRaw > 0n && !enough && balRaw === 0n && (
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
          No {symbol} in intents.near — deposit some first.
        </p>
      )}
      {amountRaw > balRaw && balRaw > 0n && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">Amount exceeds balance.</p>
      )}

      {result && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-500">{result}</p>}
      {error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </Card>
  );
}
