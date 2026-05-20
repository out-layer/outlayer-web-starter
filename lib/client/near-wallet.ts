/**
 * NEAR wallet — wallet-selector (NEP-413 signing).
 *
 * AI agents: wallet-selector handles connection UI for all NEAR wallets
 * (My NEAR Wallet, Meteor, etc.). We only call `signMessage` and forward
 * the result. Lazy-init the selector so SSR doesn't choke.
 */

'use client';

import { setupWalletSelector, type WalletSelector } from '@near-wallet-selector/core';
import { setupModal, type WalletSelectorModal } from '@near-wallet-selector/modal-ui';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';

const RECIPIENT = 'outlayer-example-app';

let cached: { selector: WalletSelector; modal: WalletSelectorModal } | null = null;

async function getSelector(): Promise<{ selector: WalletSelector; modal: WalletSelectorModal }> {
  if (cached) return cached;
  const selector = await setupWalletSelector({
    network: 'mainnet',
    modules: [setupMyNearWallet(), setupMeteorWallet()],
  });
  const modal = setupModal(selector, { contractId: 'outlayer.near' });
  cached = { selector, modal };
  return cached;
}

export async function nearSignInFlow(buildMessage: () => string): Promise<void> {
  const { selector, modal } = await getSelector();

  if (!selector.isSignedIn()) {
    // Open the wallet picker. We `await` the close event by polling — most
    // NEAR wallets redirect away and come back, so we'll re-enter on the
    // landing page (treat this as a no-op return).
    modal.show();
    await new Promise<void>((resolve) => {
      const sub = selector.store.observable.subscribe((state) => {
        if (state.accounts.length > 0) {
          modal.hide();
          sub.unsubscribe();
          resolve();
        }
      });
    });
  }

  const wallet = await selector.wallet();
  const message = buildMessage();
  const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
  const nonceBuffer = Buffer.from(nonceBytes);

  const signed = await wallet.signMessage({
    message,
    recipient: RECIPIENT,
    nonce: nonceBuffer,
  });
  if (!signed) throw new Error('Wallet did not return a signature');

  const res = await fetch('/api/auth/near', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountId: signed.accountId,
      publicKey: signed.publicKey,
      signature: signed.signature, // already base64 in wallet-selector responses
      message,
      nonce: nonceBuffer.toString('base64'),
      recipient: RECIPIENT,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(`Sign-in failed: ${err.error ?? res.statusText}`);
  }
}
