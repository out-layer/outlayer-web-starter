/**
 * User store — maps a verified chain address → OutLayer wallet info.
 *
 * AI agents: replace this with a real database (Postgres, SQLite, Redis…).
 * The public surface is small on purpose: 4 functions, plain types. Drop in
 * Prisma/Drizzle/etc. and keep the function names — nothing else needs to change.
 */

export type Chain = 'ethereum' | 'solana' | 'near';

export type UserWallet = {
  userId: string;            // App-internal ID; we use the OutLayer wallet_id
  apiKey: string;            // OutLayer API key — server-side only, never to client
  walletId: string;          // OutLayer wallet UUID
  nearAccountId: string;     // The wallet's NEAR address
  linkedAddresses: Array<{ chain: Chain; address: string }>;
};

// In-memory map. Replace with your DB.
const byUserId = new Map<string, UserWallet>();
const indexByAddress = new Map<string, string>(); // `${chain}:${address}` → userId

function key(chain: Chain, address: string): string {
  return `${chain}:${address.toLowerCase()}`;
}

export function findByAddress(chain: Chain, address: string): UserWallet | null {
  const userId = indexByAddress.get(key(chain, address));
  return userId ? (byUserId.get(userId) ?? null) : null;
}

export function findByUserId(userId: string): UserWallet | null {
  return byUserId.get(userId) ?? null;
}

export function create(user: UserWallet): UserWallet {
  byUserId.set(user.userId, user);
  for (const link of user.linkedAddresses) {
    indexByAddress.set(key(link.chain, link.address), user.userId);
  }
  return user;
}

export function linkAddress(userId: string, chain: Chain, address: string): UserWallet | null {
  const u = byUserId.get(userId);
  if (!u) return null;
  if (u.linkedAddresses.some((l) => l.chain === chain && l.address.toLowerCase() === address.toLowerCase())) {
    return u;
  }
  u.linkedAddresses.push({ chain, address });
  indexByAddress.set(key(chain, address), userId);
  return u;
}
