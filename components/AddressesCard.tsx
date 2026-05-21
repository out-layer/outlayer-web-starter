'use client';

import { useEffect, useState } from 'react';
import Card from './Card';
import { getJson } from '@/lib/client/api';

type AddressMap = Record<string, { address: string; public_key: string } | { error: string }>;

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
      title="Cross-chain addresses"
      hint="One wallet, four chains. Same identity everywhere — that's the cross-chain login primitive."
    >
      {error && <p className="text-sm text-red-700">Couldn&apos;t load addresses: {error}</p>}
      {!addrs && !error && <p className="text-sm text-neutral-500">Loading…</p>}
      {addrs && (
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[6rem_1fr]">
          {Object.entries(addrs).map(([chain, info]) => (
            <Row key={chain} chain={chain} info={info} />
          ))}
        </dl>
      )}
    </Card>
  );
}

function Row({
  chain,
  info,
}: {
  chain: string;
  info: { address: string; public_key: string } | { error: string };
}) {
  return (
    <>
      <dt className="font-mono uppercase tracking-wide text-neutral-500">{chain}</dt>
      <dd className="font-mono break-all text-neutral-800">
        {'address' in info ? info.address : <span className="text-neutral-400">— {info.error}</span>}
      </dd>
    </>
  );
}
