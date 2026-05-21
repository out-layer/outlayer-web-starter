'use client';

import { useEffect, useState } from 'react';
import Card from './Card';
import { getJson } from '@/lib/client/api';
import { TOKEN_COLOR, fromRaw } from '@/lib/client/tokens';

type TokenBalance = { symbol: string; contract: string; decimals: number; balance: string };
type Balances = { near_on_chain: string; tokens: TokenBalance[] };

export default function BalanceCard() {
  const [bal, setBal] = useState<Balances | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<Balances>('/api/balance')
      .then(setBal)
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <Card title="Balances" hint="Native NEAR balance + intents.near positions.">
      {error && <p className="text-sm text-red-700 dark:text-red-400">Couldn&apos;t load balance: {error}</p>}
      {!bal && !error && <p className="text-sm text-neutral-500">Loading…</p>}
      {bal && (
        <ul className="space-y-2">
          <Row symbol="NEAR" amount={fromRaw(bal.near_on_chain, 24)} title="Native NEAR balance" />
          {bal.tokens.map((t) => (
            <Row
              key={t.contract}
              symbol={t.symbol}
              amount={fromRaw(t.balance, t.decimals)}
              title={`intents.near · ${t.contract}`}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function Row({ symbol, amount, title }: { symbol: string; amount: string; title: string }) {
  const color = TOKEN_COLOR[symbol] ?? 'bg-neutral-500';
  return (
    <li className="flex items-center gap-3" title={title}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ${color}`}>
        {symbol.slice(0, 4)}
      </span>
      <span className="font-mono text-sm">{amount}</span>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{symbol}</span>
    </li>
  );
}
