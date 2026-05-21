'use client';

import { useEffect, useState } from 'react';
import Card from './Card';
import { getJson } from '@/lib/client/api';
import { formatYocto } from '@/lib/client/format';

type Balances = {
  near_on_chain: string;
  intents: Record<string, string>;
};

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
      {error && <p className="text-sm text-red-700">Couldn&apos;t load balance: {error}</p>}
      {!bal && !error && <p className="text-sm text-neutral-500">Loading…</p>}
      {bal && (
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[12rem_1fr]">
          <dt className="text-neutral-500">Native NEAR</dt>
          <dd className="font-mono">{formatYocto(bal.near_on_chain)} NEAR</dd>
          {Object.entries(bal.intents).map(([token, amount]) => (
            <ContentRow key={token} token={token} amount={amount} />
          ))}
        </dl>
      )}
    </Card>
  );
}

function ContentRow({ token, amount }: { token: string; amount: string }) {
  // wrap.near = 24 decimals; USDT = 6. Quick heuristic.
  const formatted = token.includes('usdt')
    ? `${(BigInt(amount) / 1_000_000n).toString()}.${(BigInt(amount) % 1_000_000n).toString().padStart(6, '0').slice(0, 2)}`
    : `${formatYocto(amount)}`;
  return (
    <>
      <dt className="text-neutral-500">intents.near: {token}</dt>
      <dd className="font-mono">{formatted}</dd>
    </>
  );
}
