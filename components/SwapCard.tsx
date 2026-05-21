'use client';

import { useState } from 'react';
import Card from './Card';

const USDT = 'nep141:usdt.tether-token.near';
const WNEAR = 'nep141:wrap.near';

export default function SwapCard() {
  const [usdtAmount, setUsdtAmount] = useState('10');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function swap() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const amount_in = (BigInt(Math.floor(parseFloat(usdtAmount) * 1_000_000))).toString();
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIn: USDT, tokenOut: WNEAR, amountIn: amount_in }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error);
      setResult(`Submitted ${data.request_id} (${data.status})`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Buy NEAR" hint="Swap intents-USDT → wNEAR via NEAR Intents. Settle the wrap unwrap separately.">
      <div className="flex items-center gap-3">
        <input
          type="text"
          className="w-32 rounded-lg border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 text-sm"
          value={usdtAmount}
          onChange={(e) => setUsdtAmount(e.target.value)}
        />
        <span className="text-sm text-neutral-600">USDT → wNEAR</span>
        <button
          type="button"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          disabled={busy}
          onClick={swap}
        >
          {busy ? 'Swapping…' : 'Swap'}
        </button>
      </div>
      {result && <p className="mt-3 text-sm text-emerald-700">{result}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </Card>
  );
}
