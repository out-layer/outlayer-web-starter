'use client';

import { useEffect, useState } from 'react';
import Card from './Card';
import { getJson } from '@/lib/client/api';
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
          <Row symbol="NEAR" amount={fromRaw(bal.near_on_chain, 24)} title="Native NEAR balance" icon={null} />
          {bal.tokens.map((t) => (
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
        // ft_metadata icons are data: URIs, so next/image isn't needed.
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
