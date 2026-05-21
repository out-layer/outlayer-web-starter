/**
 * NEAR wallet via @hot-labs/near-connect (the successor to wallet-selector).
 *
 * near-connect renders its own wallet-picker modal and runs each wallet in a
 * sandboxed iframe — no per-wallet packages, no modal-ui setup. We use the
 * "sign in and sign a message" flow so we get a NEP-413 signature in one step.
 *
 * AI agents: the whole NEAR integration is this one file. `connect()` opens
 * the modal; the signed message arrives via the `wallet:signInAndSignMessage`
 * event. We wrap that event in a promise so the caller just `await`s.
 */

'use client';

import { NearConnector } from '@hot-labs/near-connect';

const RECIPIENT = 'outlayer-example-app';
// Default mainnet (NEAR Intents only work on mainnet). Override with
// NEXT_PUBLIC_NEAR_NETWORK=testnet to match a testnet backend.
const NETWORK = (process.env.NEXT_PUBLIC_NEAR_NETWORK as 'mainnet' | 'testnet') ?? 'mainnet';

type SignedMessage = { accountId: string; publicKey: string; signature: string };

let connector: NearConnector | null = null;

function getConnector(): NearConnector {
  if (!connector) connector = new NearConnector({ network: NETWORK });
  return connector;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function nearSignInFlow(buildMessage: () => string): Promise<void> {
  const c = getConnector();
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const message = buildMessage();

  // connect() opens the wallet picker; the signed message comes back on the
  // event. Resolve the promise from the handler so the caller just awaits.
  const signed = await new Promise<SignedMessage>((resolve, reject) => {
    const handler = (t: { accounts: Array<{ signedMessage?: SignedMessage }> }) => {
      c.off('wallet:signInAndSignMessage', handler);
      const sm = t.accounts[0]?.signedMessage;
      if (sm) resolve(sm);
      else reject(new Error('Wallet did not return a signed message'));
    };
    c.on('wallet:signInAndSignMessage', handler);
    c.connect({ signMessageParams: { message, recipient: RECIPIENT, nonce } }).catch(reject);
  });

  const res = await fetch('/api/auth/near', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountId: signed.accountId,
      publicKey: signed.publicKey,
      signature: signed.signature,
      message,
      nonce: toBase64(nonce),
      recipient: RECIPIENT,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(`Sign-in failed: ${err.error ?? res.statusText}`);
  }
}

/**
 * Deposit a NEP-141 token (or native NEAR) from the user's connected NEAR
 * wallet straight into the custody wallet's intents.near balance.
 *
 * This is a plain NEAR transaction signed by the user's wallet — no 1Click
 * bridge. `ft_transfer_call` to intents.near with `msg = custodyNearAddress`
 * routes the deposit to the custody wallet. Native NEAR is wrapped first.
 */
export async function nearDepositToIntents(opts: {
  custodyNearAddress: string;
  contract: string;
  amountRaw: string;
  isNative: boolean;
}): Promise<void> {
  const c = getConnector();
  let wallet = await c.wallet().catch(() => null);
  if (!wallet) wallet = await c.connect();

  const ftTransferCall = {
    type: 'FunctionCall' as const,
    params: {
      methodName: 'ft_transfer_call',
      args: { receiver_id: 'intents.near', amount: opts.amountRaw, msg: opts.custodyNearAddress },
      gas: '100000000000000',
      deposit: '1',
    },
  };

  if (opts.isNative) {
    await wallet.signAndSendTransactions({
      transactions: [
        {
          receiverId: 'wrap.near',
          actions: [
            {
              type: 'FunctionCall',
              params: { methodName: 'near_deposit', args: {}, gas: '10000000000000', deposit: opts.amountRaw },
            },
          ],
        },
        { receiverId: 'wrap.near', actions: [ftTransferCall] },
      ],
    });
  } else {
    await wallet.signAndSendTransaction({ receiverId: opts.contract, actions: [ftTransferCall] });
  }
}
