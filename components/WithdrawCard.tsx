/**
 * Withdraw / send out of the wallet.
 *
 * Two modes, picked by the chosen token:
 *  - NEAR (native, chain=near): an on-chain transfer of the wallet's own
 *    native NEAR balance. Costs gas → Max leaves a small gas reserve.
 *  - any NEP-141 / other chain: a gasless NEAR Intents withdrawal (the token
 *    must be in the wallet's intents.near balance).
 */

'use client';

import { useEffect, useState } from 'react';
import Card from './Card';
import { getJson, postJson } from '@/lib/client/api';
import { onRefreshBalances, refreshBalances } from '@/lib/client/events';
import { TOKENS, fromRaw, toRaw } from '@/lib/client/tokens';

const CHAINS = ['near', 'ethereum', 'solana', 'base', 'arbitrum', 'polygon', 'optimism', 'avalanche'];
const QUICK = ['1', '5', '10', '25'];
const GAS_RESERVE = 10n ** 24n / 20n; // 0.05 NEAR

type WithdrawOption = { symbol: string; wire: string; decimals: number };
const NATIVE_NEAR: WithdrawOption = { symbol: 'NEAR', wire: 'near', decimals: 24 };
const STABLES: WithdrawOption[] = TOKENS.map((t) => ({ symbol: t.symbol, wire: t.defuseId, decimals: t.decimals }));

function optionsFor(chain: string): WithdrawOption[] {
  return chain === 'near' ? [NATIVE_NEAR, ...STABLES] : STABLES;
}

type Result = {
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
  const [nativeNear, setNativeNear] = useState('0');
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const options = optionsFor(chain);
  const token = options.find((o) => o.symbol === symbol) ?? options[0]!;
  const isNativeNear = chain === 'near' && token.symbol === 'NEAR';

  useEffect(() => {
    const fetchBalances = () =>
      getJson<{ near_on_chain: string; tokens: TokenBalance[] }>('/api/balance')
        .then((r) => {
          setNativeNear(r.near_on_chain);
          setBalances(r.tokens);
        })
        .catch(() => {});
    void fetchBalances();
    return onRefreshBalances(fetchBalances);
  }, []);

  useEffect(() => {
    if (!optionsFor(chain).some((o) => o.symbol === symbol)) {
      setSymbol(optionsFor(chain)[0]!.symbol);
    }
  }, [chain, symbol]);

  // Source balance: native NEAR account balance for the native transfer,
  // otherwise the token's intents.near balance.
  const tokenBal = balances.find((b) => b.symbol === token.symbol);
  const sourceRaw = isNativeNear ? BigInt(nativeNear) : BigInt(tokenBal?.balance ?? '0');
  const sourceDecimals = isNativeNear ? 24 : (tokenBal?.decimals ?? token.decimals);

  function setMax() {
    if (isNativeNear) {
      const spendable = sourceRaw > GAS_RESERVE ? sourceRaw - GAS_RESERVE : 0n;
      setAmount(fromRaw(spendable.toString(), 24, 24));
    } else {
      setAmount(fromRaw(sourceRaw.toString(), sourceDecimals, sourceDecimals));
    }
  }

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const r = isNativeNear
        ? await postJson<Result>('/api/transfer', { to, amount: toRaw(amount, 24) })
        : await postJson<Result>('/api/withdraw', {
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

  const inputCls = 'rounded-lg border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800';
  const addrPlaceholder = chain === 'near' ? 'recipient.near' : chain === 'solana' ? 'Solana address' : '0x…';

  return (
    <Card title="Withdraw" hint="NEAR sends your native account balance (on-chain). Other tokens go gasless via NEAR Intents from your intents.near balance.">
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
            disabled={sourceRaw === 0n}
            onClick={setMax}
          >
            Max
          </button>
          <button
            type="button"
            className="ml-auto rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            disabled={busy || !to}
            onClick={submit}
          >
            {busy ? 'Submitting…' : 'Withdraw'}
          </button>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Balance: <span className="font-mono">{fromRaw(sourceRaw.toString(), sourceDecimals)}</span> {token.symbol}
          {isNativeNear ? ' (native, on your account — Max leaves 0.05 for gas)' : ' (intents.near)'}
        </p>
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? 'text-emerald-700 dark:text-emerald-500' : 'text-red-700 dark:text-red-400'}`}>
          {message.text}
        </p>
      )}
    </Card>
  );
}
