/**
 * Sign-in panel — three buttons, one per chain.
 *
 * Each button calls a thin "sign-in flow" from lib/client/*-wallet.ts. The
 * UI is intentionally dumb: error → toast (here just alert), success →
 * full page refresh so the server component re-runs and reads the new
 * session.
 */

'use client';

import { useState } from 'react';
import { ethSignInFlow, discoverEthWallets } from '@/lib/client/eth-wallet';
import { solanaSignInFlow, isPhantomAvailable } from '@/lib/client/solana-wallet';
import { nearSignInFlow } from '@/lib/client/near-wallet';
import { buildSignInMessage } from '@/lib/client/message';

export default function SignInPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section className="rounded-2xl border bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold">Sign in with any wallet</h2>
      <p className="mt-2 text-sm text-neutral-600">
        We&apos;ll mint an OutLayer custody wallet behind the scenes. The same
        wallet is reachable on NEAR, Ethereum, Solana, and Bitcoin — sign in
        with whichever you have.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          className="rounded-xl border bg-neutral-50 px-4 py-3 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
          disabled={busy !== null}
          onClick={() =>
            withBusy('ethereum', async () => {
              const wallets = await discoverEthWallets();
              const wallet = wallets[0];
              if (!wallet) throw new Error('No Ethereum wallet detected');
              await ethSignInFlow(wallet.provider, buildSignInMessage);
            })
          }
        >
          {busy === 'ethereum' ? 'Connecting…' : 'Sign in with Ethereum'}
        </button>

        <button
          type="button"
          className="rounded-xl border bg-neutral-50 px-4 py-3 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
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
          className="rounded-xl border bg-neutral-50 px-4 py-3 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
          disabled={busy !== null}
          onClick={() => withBusy('near', () => nearSignInFlow(buildSignInMessage))}
        >
          {busy === 'near' ? 'Connecting…' : 'Sign in with NEAR'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </section>
  );
}
