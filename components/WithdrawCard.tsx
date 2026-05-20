'use client';

import { useState } from 'react';
import Card from './Card';

const USDT = 'nep141:usdt.tether-token.near';

export default function WithdrawCard() {
  const [chain, setChain] = useState<'ethereum' | 'solana'>('ethereum');
  const [to, setTo] = useState('');
  const [usdtAmount, setUsdtAmount] = useState('1');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function withdraw() {
    setBusy(true);
    setMessage(null);
    try {
      const amount = (BigInt(Math.floor(parseFloat(usdtAmount) * 1_000_000))).toString();
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain, to, amount, token: USDT }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error);
      setMessage({ ok: true, text: `Request ${data.request_id} — ${data.status}` });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Withdraw" hint="Gasless cross-chain withdraw via NEAR Intents. Token must already be in intents.near.">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={chain}
            onChange={(e) => setChain(e.target.value as 'ethereum' | 'solana')}
          >
            <option value="ethereum">Ethereum</option>
            <option value="solana">Solana</option>
          </select>
          <input
            type="text"
            placeholder="Destination address"
            className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            className="w-32 rounded-lg border px-3 py-2 text-sm"
            value={usdtAmount}
            onChange={(e) => setUsdtAmount(e.target.value)}
          />
          <span className="text-sm text-neutral-600">USDT</span>
          <button
            type="button"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
            disabled={busy || !to}
            onClick={withdraw}
          >
            {busy ? 'Submitting…' : 'Withdraw'}
          </button>
        </div>
      </div>
      {message && (
        <p className={`mt-3 text-sm ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {message.text}
        </p>
      )}
    </Card>
  );
}
