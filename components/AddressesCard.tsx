'use client';

import { useEffect, useState } from 'react';
import Card from './Card';
import { getJson } from '@/lib/client/api';

type NearAddress = { near: { address: string; public_key: string } };

export default function AddressesCard() {
  const [near, setNear] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getJson<NearAddress>('/api/addresses')
      .then((d) => setNear(d.near.address))
      .catch((e) => setError((e as Error).message));
  }, []);

  function copy() {
    if (!near) return;
    navigator.clipboard.writeText(near);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card
      title="Wallet address"
      hint="Your custody wallet lives on NEAR. Send NEAR or NEP-141 tokens here directly. To bring funds from Ethereum, Solana, and other chains, use Deposit below — bridged in gaslessly via NEAR Intents."
    >
      {error && <p className="text-sm text-red-700 dark:text-red-400">Couldn&apos;t load address: {error}</p>}
      {!near && !error && <p className="text-sm text-neutral-500">Loading…</p>}
      {near && (
        <div className="flex items-start gap-2">
          <code className="flex-1 break-all rounded-lg bg-neutral-100 px-3 py-2 font-mono text-sm dark:bg-neutral-800">
            {near}
          </code>
          <button
            type="button"
            className="shrink-0 rounded-lg border px-3 py-2 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            onClick={copy}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </Card>
  );
}
