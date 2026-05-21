/**
 * Withdraw — gasless withdraw via NEAR Intents.
 *
 * To NEAR: deliver native NEAR (token "near", unwraps wNEAR) or a NEP-141.
 * To other chains: 1Click bridges the Intents asset and delivers the chain's
 * native asset. Token must be in the wallet's intents.near balance.
 */

'use client';

import { useEffect, useState } from 'react';
import Card from './Card';
import { getJson, postJson } from '@/lib/client/api';
import { onRefreshBalances, refreshBalances } from '@/lib/client/events';
import { TOKENS, fromRaw, toRaw } from '@/lib/client/tokens';

const CHAINS = ['near', 'ethereum', 'solana', 'base', 'arbitrum', 'polygon', 'optimism', 'avalanche'];
const QUICK = ['1', '5', '10', '25'];

type WithdrawOption = { symbol: string; wire: string; decimals: number };

// Native NEAR is only a withdraw target on the `near` chain.
const NATIVE_NEAR: WithdrawOption = { symbol: 'NEAR', wire: 'near', decimals: 24 };
const STABLES: WithdrawOption[] = TOKENS.map((t) => ({ symbol: t.symbol, wire: t.defuseId, decimals: t.decimals }));

function optionsFor(chain: string): WithdrawOption[] {
  return chain === 'near' ? [NATIVE_NEAR, ...STABLES] : STABLES;
}

type WithdrawResult = {
  request_id: string;
  status: string;
  approval_id?: string | null;
  required?: number | null;
  approved?: number | null;
};

type TokenBalance = { symbol: string; balance: string; decimals: number };

export default function WithdrawCard() {
  const [chain, setChain] = useState('near');
  const [symbol, setSymbol] = useState('NEAR');
  const [amount, setAmount] = useState('1');
  const [to, setTo] = useState('');
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const options = optionsFor(chain);
  const token = options.find((o) => o.symbol === symbol) ?? options[0]!;

  // Native NEAR withdrawals debit wNEAR; everything else debits its own token.
  const sourceSymbol = token.symbol === 'NEAR' ? 'wNEAR' : token.symbol;
  const sourceBal = balances.find((b) => b.symbol === sourceSymbol);

  useEffect(() => {
    const fetchBalances = () =>
      getJson<{ tokens: TokenBalance[] }>('/api/balance')
        .then((r) => setBalances(r.tokens))
        .catch(() => {});
    void fetchBalances();
    return onRefreshBalances(fetchBalances);
  }, []);

  // Keep the token valid when the chain changes (e.g. NEAR-only token + EVM chain).
  useEffect(() => {
    if (!optionsFor(chain).some((o) => o.symbol === symbol)) {
      setSymbol(optionsFor(chain)[0]!.symbol);
    }
  }, [chain, symbol]);

  const inputCls = 'rounded-lg border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800';

  async function withdraw() {
    setBusy(true);
    setMessage(null);
    try {
      const r = await postJson<WithdrawResult>('/api/withdraw', {
        chain,
        to,
        amount: toRaw(amount, token.decimals),
        token: token.wire,
      });
      if (r.status === 'pending_approval') {
        setMessage({ ok: true, text: `Pending approval ${r.approval_id} (${r.approved ?? 0}/${r.required})` });
      } else {
        setMessage({ ok: true, text: `Submitted ${r.request_id} — ${r.status}` });
      }
      refreshBalances();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const addrPlaceholder = chain === 'near' ? 'recipient.near' : chain === 'solana' ? 'Solana address' : '0x…';

  return (
    <Card title="Withdraw" hint="Gasless withdraw via NEAR Intents. Token must be in your intents.near balance.">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <label className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            To chain
            <select className={`mt-1 block ${inputCls}`} value={chain} onChange={(e) => setChain(e.target.value)}>
              {CHAINS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Token
            <select className={`mt-1 block ${inputCls}`} value={token.symbol} onChange={(e) => setSymbol(e.target.value)}>
              {options.map((o) => (
                <option key={o.symbol} value={o.symbol}>
                  {o.symbol}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Destination address
            <input
              className={`mt-1 block w-full font-mono ${inputCls}`}
              placeholder={addrPlaceholder}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input className={`w-28 ${inputCls}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">{token.symbol}</span>
          {QUICK.map((v) => (
            <button
              key={v}
              type="button"
              className="rounded-lg border px-2.5 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              onClick={() => setAmount(v)}
            >
              {v}
            </button>
          ))}
          <button
            type="button"
            className="rounded-lg border px-2.5 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            disabled={!sourceBal || BigInt(sourceBal.balance) === 0n}
            onClick={() => sourceBal && setAmount(fromRaw(sourceBal.balance, sourceBal.decimals, sourceBal.decimals))}
          >
            Max
          </button>
          <button
            type="button"
            className="ml-auto rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            disabled={busy || !to}
            onClick={withdraw}
          >
            {busy ? 'Submitting…' : 'Withdraw'}
          </button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Balance: <span className="font-mono">{sourceBal ? fromRaw(sourceBal.balance, sourceBal.decimals) : '0'}</span>{' '}
          {sourceSymbol}
          {token.symbol === 'NEAR' && ' (native NEAR is withdrawn from your wNEAR)'}
        </p>
        {chain === 'near' && token.symbol === 'NEAR' && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Delivers native NEAR (unwraps your wNEAR). Recipient needs no wrap.near storage; named
            accounts must already exist.
          </p>
        )}
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? 'text-emerald-700 dark:text-emerald-500' : 'text-red-700 dark:text-red-400'}`}>
          {message.text}
        </p>
      )}
    </Card>
  );
}
