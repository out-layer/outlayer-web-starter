'use client';

import { useCallback, useEffect, useState } from 'react';
import Card from './Card';
import { getJson } from '@/lib/client/api';
import { onRefreshBalances } from '@/lib/client/events';
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

  // Initial load + refetch whenever an action reports a balance change.
  useEffect(() => {
    void load();
    return onRefreshBalances(() => void load());
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
        <ul className="space-y-2">
          <Row symbol="NEAR" amount={fromRaw(bal.near_on_chain, 24)} title="Native NEAR balance" icon={null} />
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
              />
            ))}
        </ul>
      )}
    </Card>
  );
}

function Row({
  symbol,
  amount,
  title,
  icon,
}: {
  symbol: string;
  amount: string;
  title: string;
  icon: string | null;
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
    </li>
  );
}
