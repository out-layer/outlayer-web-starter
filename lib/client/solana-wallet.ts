/**
 * Solana wallet — Phantom only (the most common; add others by replicating).
 *
 * AI agents: Phantom exposes a standard `signMessage` that returns a
 * Uint8Array; we base58-encode it for the wire.
 */

'use client';

import bs58 from 'bs58';

type PhantomProvider = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  isPhantom?: boolean;
};

declare global {
  interface Window {
    phantom?: { solana?: PhantomProvider };
  }
}

export function isPhantomAvailable(): boolean {
  return Boolean(window.phantom?.solana?.isPhantom);
}

export async function solanaSignInFlow(buildMessage: () => string): Promise<void> {
  const phantom = window.phantom?.solana;
  if (!phantom) throw new Error('Phantom wallet not detected. Install at https://phantom.com');

  const { publicKey } = await phantom.connect();
  const address = publicKey.toString();

  const message = buildMessage();
  const encoded = new TextEncoder().encode(message);
  const { signature } = await phantom.signMessage(encoded);

  const res = await fetch('/api/auth/solana', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address,
      signature: bs58.encode(signature),
      message,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(`Sign-in failed: ${err.error ?? res.statusText}`);
  }
}
