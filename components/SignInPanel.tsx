/**
 * Sign-in panel — one button per chain.
 *
 * Ethereum: multiple injected wallets (MetaMask, Rabby, Phantom's EVM mode…)
 * announce themselves via EIP-6963. We don't guess — if more than one is
 * found we show a picker so the user lands in the wallet they meant.
 *
 * Solana: Phantom. NEAR: near-connect (renders its own wallet modal).
 */

'use client';

import { useState } from 'react';
import { type EthWalletInfo, discoverEthWallets, ethSignInFlow } from '@/lib/client/eth-wallet';
import { isPhantomAvailable, solanaSignInFlow } from '@/lib/client/solana-wallet';
import { nearSignInFlow } from '@/lib/client/near-wallet';
import { buildSignInMessage } from '@/lib/client/message';

export default function SignInPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ethChoices, setEthChoices] = useState<EthWalletInfo[] | null>(null);

  async function withBusy(chain: string, fn: () => Promise<void>) {
    setBusy(chain);
    setError(null);
    try {
      await fn();
      window.location.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function startEthereum() {
    setError(null);
    const wallets = await discoverEthWallets();
    if (wallets.length === 0) {
      setError('No Ethereum wallet detected. Install MetaMask, Rabby, etc.');
      return;
    }
    if (wallets.length === 1) {
      await withBusy('ethereum', () => ethSignInFlow(wallets[0]!.provider, buildSignInMessage));
      return;
    }
    setEthChoices(wallets); // multiple — let the user pick
  }

  return (
    <section className="rounded-2xl border bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-xl font-semibold">Sign in with any wallet</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        We&apos;ll mint an OutLayer custody wallet behind the scenes. The same wallet is
        reachable on NEAR, Ethereum, Solana, and Bitcoin — sign in with whichever you have.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          className="rounded-xl border bg-neutral-50 px-4 py-3 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          disabled={busy !== null}
          onClick={startEthereum}
        >
          {busy === 'ethereum' ? 'Connecting…' : 'Sign in with Ethereum'}
        </button>

        <button
          type="button"
          className="rounded-xl border bg-neutral-50 px-4 py-3 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          disabled={busy !== null}
          onClick={() =>
            withBusy('solana', async () => {
              if (!isPhantomAvailable()) throw new Error('Phantom not installed');
              await solanaSignInFlow(buildSignInMessage);
            })
          }
        >
          {busy === 'solana' ? 'Connecting…' : 'Sign in with Solana'}
        </button>

        <button
          type="button"
          className="rounded-xl border bg-neutral-50 px-4 py-3 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          disabled={busy !== null}
          onClick={() => withBusy('near', () => nearSignInFlow(buildSignInMessage))}
        >
          {busy === 'near' ? 'Connecting…' : 'Sign in with NEAR'}
        </button>
      </div>

      {ethChoices && (
        <div className="mt-4 rounded-xl border bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <p className="mb-2 text-sm font-medium">Choose an Ethereum wallet</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ethChoices.map((w) => (
              <button
                key={w.uuid}
                type="button"
                className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-700"
                disabled={busy !== null}
                onClick={() => {
                  setEthChoices(null);
                  void withBusy('ethereum', () => ethSignInFlow(w.provider, buildSignInMessage));
                }}
              >
                {w.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.icon} alt="" className="h-5 w-5 rounded" />
                )}
                {w.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-neutral-500 hover:text-neutral-900"
            onClick={() => setEthChoices(null)}
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </section>
  );
}
