'use client';

import { useEffect, useState } from 'react';
import Card from './Card';
import { getJson } from '@/lib/client/api';

type Info = {
  near_address: string;
  bridges: Array<{ chain: string; name: string; url: string; note: string }>;
  next_step: string;
};

export default function DepositCard() {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<Info>('/api/deposit-info')
      .then(setInfo)
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <Card title="Deposit" hint="Move funds in from your external chain wallets.">
      {error && <p className="text-sm text-red-700">Couldn&apos;t load deposit info: {error}</p>}
      {!info && !error && <p className="text-sm text-neutral-500">Loading…</p>}
      {info && (
        <div className="space-y-3 text-sm">
          <p>
            Direct deposits to: <span className="font-mono break-all">{info.near_address}</span>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-neutral-700">
            {info.bridges.map((b) => (
              <li key={b.url}>
                <a className="text-blue-600 underline" href={b.url} target="_blank" rel="noreferrer">
                  {b.name}
                </a>{' '}
                — {b.note}
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500">{info.next_step}</p>
        </div>
      )}
    </Card>
  );
}
