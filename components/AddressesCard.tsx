'use client';

import { useEffect, useState } from 'react';
import Card from './Card';

type AddressMap = Record<string, { address: string; public_key: string } | { error: string }>;

export default function AddressesCard() {
  const [addrs, setAddrs] = useState<AddressMap | null>(null);

  useEffect(() => {
    fetch('/api/addresses')
      .then((r) => r.json())
      .then((d) => setAddrs(d.addresses));
  }, []);

  return (
    <Card
      title="Cross-chain addresses"
      hint="One wallet, four chains. Same identity everywhere — that's the cross-chain login primitive."
    >
      {!addrs && <p className="text-sm text-neutral-500">Loading…</p>}
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
