/**
 * Ethereum wallet via EIP-6963 (no wagmi / RainbowKit needed).
 *
 * AI agents: this file is pure client-side TS — no React, no provider wrapper.
 * Pick a wallet, sign a message, post to /api/auth/ethereum.
 */

'use client';

export type EthWalletInfo = {
  uuid: string;
  name: string;
  icon: string;
  provider: EthProvider;
};

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthProvider;
  }
}

export function discoverEthWallets(timeoutMs = 200): Promise<EthWalletInfo[]> {
  return new Promise((resolve) => {
    const wallets: EthWalletInfo[] = [];
    const seen = new Set<string>();

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { info: { uuid: string; name: string; icon: string }; provider: EthProvider }
        | undefined;
      if (!detail) return;
      if (seen.has(detail.info.uuid)) return;
      seen.add(detail.info.uuid);
      wallets.push({
        uuid: detail.info.uuid,
        name: detail.info.name,
        icon: detail.info.icon,
        provider: detail.provider,
      });
    };

    window.addEventListener('eip6963:announceProvider', handler);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handler);
      // Fallback: injected window.ethereum if EIP-6963 returned nothing
      if (wallets.length === 0 && window.ethereum) {
        wallets.push({
          uuid: 'injected',
          name: 'Injected Wallet',
          icon: '',
          provider: window.ethereum,
        });
      }
      resolve(wallets);
    }, timeoutMs);
  });
}

export async function ethSignInFlow(
  provider: EthProvider,
  buildMessage: () => string,
): Promise<void> {
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
  const address = accounts[0];
  if (!address) throw new Error('No account returned by wallet');

  const message = buildMessage();
  const signature = (await provider.request({
    method: 'personal_sign',
    params: [message, address],
  })) as string;

  const res = await fetch('/api/auth/ethereum', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, message }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(`Sign-in failed: ${err.error ?? res.statusText}`);
  }
}
