'use client';

import { useEffect, useState } from 'react';
import Card from './Card';
import { getJson } from '@/lib/client/api';

type NearAddress = { near: { address: string; public_key: string } };

// wallet v1 derives NEAR only. These are shown as planned, not fetched —
// the API would just reject them.
const PLANNED_CHAINS = ['ethereum', 'solana', 'bitcoin'];

export default function AddressesCard() {
  const [near, setNear] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<NearAddress>('/api/addresses')
      .then((d) => setNear(d.near.address))
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <Card
      title="Wallet address"
      hint="Your custody wallet is a NEAR account. Cross-chain value moves via NEAR Intents (Deposit / Withdraw) — native addresses on other chains are planned for wallet v1."
    >
      {error && <p className="text-sm text-red-700 dark:text-red-400">Couldn&apos;t load address: {error}</p>}
      {!near && !error && <p className="text-sm text-neutral-500">Loading…</p>}
      {near && (
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[6rem_1fr]">
          <dt className="font-mono uppercase tracking-wide text-neutral-500 dark:text-neutral-400">near</dt>
          <dd className="font-mono break-all text-neutral-800 dark:text-neutral-200">{near}</dd>
          {PLANNED_CHAINS.map((chain) => (
            <Planned key={chain} chain={chain} />
          ))}
        </dl>
      )}
    </Card>
  );
}

function Planned({ chain }: { chain: string }) {
  return (
    <>
      <dt className="font-mono uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{chain}</dt>
      <dd className="text-neutral-400 dark:text-neutral-500">coming soon to wallet v1</dd>
    </>
  );
}
