'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import Card from './Card';
import { getJson, postJson } from '@/lib/client/api';
import { onRefreshBalances, refreshBalances } from '@/lib/client/events';
import { TOKEN_COLOR, fromRaw } from '@/lib/client/tokens';

type TokenBalance = {
  symbol: string;
  contract: string;
  decimals: number;
  balance: string;
  icon: string | null;
};
type Balances = { near_on_chain: string; tokens: TokenBalance[] };

export default function BalanceCard() {
  const [bal, setBal] = useState<Balances | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unwrapping, setUnwrapping] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBal(await getJson<Balances>('/api/balance'));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // wNEAR (intents) → native NEAR on the wallet's account. Unblocks staking.
  async function unwrap() {
    setUnwrapping(true);
    setNote(null);
    try {
      const r = await postJson<{ status: string }>('/api/unwrap', {});
      setNote(`Unwrapped to native NEAR (${r.status})`);
      refreshBalances();
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setUnwrapping(false);
    }
  }

  // Initial load + refetch whenever an action reports a balance change.
  // On-chain settlement (esp. native_withdraw) can lag a few seconds, so we
  // refetch immediately and again shortly after to catch the settled state.
  useEffect(() => {
    void load();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const unsub = onRefreshBalances(() => {
      void load();
      timers.push(setTimeout(() => void load(), 3000));
      timers.push(setTimeout(() => void load(), 7000));
    });
    return () => {
      unsub();
      for (const t of timers) clearTimeout(t);
    };
  }, [load]);

  return (
    <Card title="Balances" hint="Native NEAR balance + intents.near positions.">
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          className="text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-400 dark:hover:text-neutral-100"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {error && <p className="text-sm text-red-700 dark:text-red-400">Couldn&apos;t load balance: {error}</p>}
      {!bal && !error && <p className="text-sm text-neutral-500">Loading…</p>}
      {bal && (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              On your NEAR account
            </p>
            <ul className="space-y-2">
              <Row
                symbol="NEAR"
                amount={fromRaw(bal.near_on_chain, 24)}
                title="Native NEAR — on-chain account balance (pays gas)"
                icon={null}
              />
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              In intents.near
            </p>
            <ul className="space-y-2">
              {bal.tokens
                // wNEAR is a transient swap output — only surface it when held.
                .filter((t) => t.symbol !== 'wNEAR' || BigInt(t.balance) > 0n)
                .map((t) => (
                  <Row
                    key={t.contract}
                    symbol={t.symbol}
                    amount={fromRaw(t.balance, t.decimals)}
                    title={`intents.near · ${t.contract}`}
                    icon={t.icon}
                    action={
                      t.symbol === 'wNEAR' ? (
                        <button
                          type="button"
                          className="ml-auto rounded-lg border px-2.5 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                          onClick={unwrap}
                          disabled={unwrapping}
                          title="Withdraw wNEAR as native NEAR to your account (gasless)"
                        >
                          {unwrapping ? 'Unwrapping…' : 'Unwrap → NEAR'}
                        </button>
                      ) : undefined
                    }
                  />
                ))}
            </ul>
          </div>
        </div>
      )}
      {note && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{note}</p>}
    </Card>
  );
}

function Row({
  symbol,
  amount,
  title,
  icon,
  action,
}: {
  symbol: string;
  amount: string;
  title: string;
  icon: string | null;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3" title={title}>
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt={symbol} className="h-7 w-7 rounded-full bg-white object-contain" />
      ) : (
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ${TOKEN_COLOR[symbol] ?? 'bg-neutral-500'}`}
        >
          {symbol.slice(0, 4)}
        </span>
      )}
      <span className="font-mono text-sm">{amount}</span>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{symbol}</span>
      {action}
    </li>
  );
}
