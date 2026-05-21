/**
 * Sign-in flow — the meat of "cross-chain login".
 *
 * Given a verified chain address (signature already checked):
 *   - If we know this address: log them in (return existing user).
 *   - If we don't: mint a new OutLayer wallet, store the mapping, log them in.
 *
 * Linking a second wallet to an existing user is a separate concern (see
 * the /api/auth/link endpoint — not implemented here to keep the demo short).
 */

import 'server-only';
import { createSession } from './session';
import { findByAddress, findByUserId, create, type Chain, type UserWallet } from './store';
import { registerWallet, inspectApiKey } from './outlayer';

export async function signInWithAddress(chain: Chain, address: string): Promise<UserWallet> {
  const existing = findByAddress(chain, address);
  if (existing) {
    await createSession(existing.userId);
    return existing;
  }

  const minted = await registerWallet();
  const user = create({
    userId: minted.walletId,
    apiKey: minted.apiKey,
    walletId: minted.walletId,
    nearAccountId: minted.nearAccountId,
    linkedAddresses: [{ chain, address }],
  });
  await createSession(user.userId);
  return user;
}

/**
 * Sign in by presenting an existing API key (key-login / QR import). The key
 * IS the credential — we validate it by deriving its address, then attach a
 * session to the corresponding wallet.
 */
export async function signInWithApiKey(apiKey: string): Promise<UserWallet> {
  const { walletId, nearAccountId } = await inspectApiKey(apiKey);
  const existing = findByUserId(walletId);
  if (existing) {
    await createSession(walletId);
    return existing;
  }
  const user = create({
    userId: walletId,
    apiKey,
    walletId,
    nearAccountId,
    linkedAddresses: [],
  });
  await createSession(walletId);
  return user;
}
