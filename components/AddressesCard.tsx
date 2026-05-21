'use client';

import { useEffect, useState } from 'react';
import Card from './Card';
import { getJson } from '@/lib/client/api';

type AddressInfo = { address: string; public_key: string } | { error: string };
type AddressMap = Record<string, AddressInfo>;

// Order matters: NEAR first (the custody root), then chains pending derivation.
const CHAIN_ORDER = ['near', 'ethereum', 'solana', 'bitcoin'];

export default function AddressesCard() {
  const [addrs, setAddrs] = useState<AddressMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<{ addresses: AddressMap }>('/api/addresses')
      .then((d) => setAddrs(d.addresses))
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <Card
      title="Wallet address"
      hint="Your custody wallet is a NEAR account. Cross-chain value moves via NEAR Intents (Deposit / Withdraw below) — native addresses on other chains are coming to wallet v1."
    >
      {error && <p className="text-sm text-red-700">Couldn&apos;t load address: {error}</p>}
      {!addrs && !error && <p className="text-sm text-neutral-500">Loading…</p>}
      {addrs && (
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[6rem_1fr]">
          {CHAIN_ORDER.filter((c) => addrs[c]).map((chain) => (
            <Row key={chain} chain={chain} info={addrs[chain]!} />
          ))}
        </dl>
      )}
    </Card>
  );
}

function Row({ chain, info }: { chain: string; info: AddressInfo }) {
  const available = 'address' in info;
  return (
    <>
      <dt className="font-mono uppercase tracking-wide text-neutral-500">{chain}</dt>
      <dd className={available ? 'font-mono break-all text-neutral-800' : 'text-neutral-400'}>
        {available ? info.address : 'coming soon to wallet v1'}
      </dd>
    </>
  );
}
