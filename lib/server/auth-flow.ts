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
import { findByAddress, create, type Chain, type UserWallet } from './store';
import { registerWallet } from './outlayer';

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
