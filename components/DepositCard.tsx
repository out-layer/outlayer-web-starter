/**
 * Deposit — two paths (modeled on near-fm):
 *
 *  - From NEAR: a plain transaction signed by the user's own NEAR wallet
 *    (ft_transfer_call to intents.near, native NEAR wrapped first). No bridge.
 *  - From another chain: NEAR Intents 1Click — get a one-time deposit address
 *    on the source chain, send funds, poll until credited.
 */

'use client';

import { useState } from 'react';
import Card from './Card';
import { getJson, postJson } from '@/lib/client/api';
import { refreshBalances } from '@/lib/client/events';
import { NEAR_DEPOSIT_TOKENS, toRaw } from '@/lib/client/tokens';
import { nearDepositToIntents } from '@/lib/client/near-wallet';

const CHAINS = ['near', 'ethereum', 'solana', 'base', 'arbitrum', 'polygon', 'optimism', 'avalanche'];
const BRIDGE_TOKENS = ['USDC', 'USDT'];
const QUICK = ['1', '5', '10', '25'];

type Intent = {
  intent_id: string;
  deposit_address: string;
  amount: string;
  amount_out: string;
  estimated_time_secs: number;
};
type Status = { intent_id: string; status: string };
type Step = 'idle' | 'creating' | 'waiting_send' | 'bridging' | 'signing' | 'done' | 'error';

export default function DepositCard({ nearAccountId }: { nearAccountId: string }) {
  const [chain, setChain] = useState('near');
  const [token, setToken] = useState('USDC');
  const [nearSymbol, setNearSymbol] = useState('NEAR');
  const [amount, setAmount] = useState('5');
  const [step, setStep] = useState<Step>('idle');
  const [intent, setIntent] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isNear = chain === 'near';
  const showForm = step !== 'waiting_send' && step !== 'bridging';
  const inputCls = 'rounded-lg border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800';

  function reset() {
    setStep('idle');
    setIntent(null);
  }

  // ── NEAR: direct transaction via the user's wallet ──
  async function nearDeposit() {
    const t = NEAR_DEPOSIT_TOKENS.find((x) => x.symbol === nearSymbol);
    if (!t) return;
    setStep('signing');
    setError(null);
    setResult(null);
    try {
      await nearDepositToIntents({
        custodyNearAddress: nearAccountId,
        contract: t.contract,
        amountRaw: toRaw(amount, t.decimals),
        isNative: !!t.isNative,
      });
      setResult(`Deposited ${amount} ${nearSymbol} into intents.near`);
      setStep('done');
      refreshBalances();
    } catch (e) {
      setError((e as Error).message);
      setStep('error');
    }
  }

  // ── Bridge: 1Click cross-chain ──
  async function createIntent() {
    setStep('creating');
    setError(null);
    setResult(null);
    try {
      const raw = BigInt(Math.round(parseFloat(amount) * 1_000_000)).toString(); // USDC/USDT, 6 decimals
      const i = await postJson<Intent>('/api/deposit-intent', { chain, amount: raw, token });
      setIntent(i);
      setStep('waiting_send');
    } catch (e) {
      setError((e as Error).message);
      setStep('error');
    }
  }

  async function confirmSent() {
    if (!intent) return;
    setStep('bridging');
    try {
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const s = await getJson<Status>(`/api/deposit-status?id=${intent.intent_id}`);
        if (s.status === 'success') {
          setResult(`Deposited ~${(Number(intent.amount_out) / 1_000_000).toFixed(2)} ${token}`);
          setStep('done');
          setIntent(null);
          refreshBalances();
          return;
        }
        if (s.status === 'failed' || s.status === 'expired') throw new Error(`Bridge ${s.status}`);
      }
      throw new Error('Bridge timed out');
    } catch (e) {
      setError((e as Error).message);
      setStep('error');
      setIntent(null);
    }
  }

  function copyAddress() {
    if (!intent) return;
    navigator.clipboard.writeText(intent.deposit_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card title="Deposit" hint="From NEAR: a direct wallet transaction. From another chain: gasless 1Click bridge.">
      {showForm && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <label className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              From chain
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
              {isNear ? (
                <select className={`mt-1 block ${inputCls}`} value={nearSymbol} onChange={(e) => setNearSymbol(e.target.value)}>
                  {NEAR_DEPOSIT_TOKENS.map((t) => (
                    <option key={t.symbol} value={t.symbol}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
              ) : (
                <select className={`mt-1 block ${inputCls}`} value={token} onChange={(e) => setToken(e.target.value)}>
                  {BRIDGE_TOKENS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Amount
              <input className={`mt-1 block w-28 ${inputCls}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
          </div>

          <div className="flex gap-2">
            {QUICK.map((v) => (
              <button
                key={v}
                type="button"
                className="rounded-lg border px-3 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                onClick={() => setAmount(v)}
              >
                {v}
              </button>
            ))}
          </div>

          {isNear ? (
            <button
              type="button"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
              disabled={step === 'signing' || !amount || parseFloat(amount) <= 0}
              onClick={nearDeposit}
            >
              {step === 'signing' ? 'Confirm in wallet…' : `Deposit ${amount} ${nearSymbol} from NEAR`}
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
              disabled={step === 'creating' || !amount || parseFloat(amount) <= 0}
              onClick={createIntent}
            >
              {step === 'creating' ? 'Preparing…' : `Deposit ${amount} ${token} from ${chain}`}
            </button>
          )}
        </div>
      )}

      {step === 'waiting_send' && intent && (
        <div className="space-y-3 rounded-xl border p-4 dark:border-neutral-700">
          <p className="text-sm">
            Send <span className="font-medium">{amount} {token}</span> on <span className="font-medium">{chain}</span> to:
          </p>
          <div className="flex items-start gap-2">
            <code className="flex-1 break-all rounded-lg bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-800">
              {intent.deposit_address}
            </code>
            <button
              type="button"
              className="shrink-0 rounded-lg border px-3 py-2 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              onClick={copyAddress}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Send exactly {amount} {token} on {chain}. You&apos;ll receive ≈{' '}
            {(Number(intent.amount_out) / 1_000_000).toFixed(2)} {token}.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
              onClick={confirmSent}
            >
              I&apos;ve sent it
            </button>
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              onClick={reset}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'bridging' && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Bridging from {chain}… (usually under a minute)</p>
      )}

      {result && step === 'done' && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-500">{result}</p>}
      {error && step === 'error' && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </Card>
  );
}
