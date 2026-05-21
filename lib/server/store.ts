/**
 * User store — maps a verified chain address → OutLayer wallet info.
 *
 * AI agents: replace this with a real database (Postgres, SQLite, Redis…).
 * The public surface is small on purpose: 4 functions, plain types. Drop in
 * Prisma/Drizzle/etc. and keep the function names — nothing else changes.
 *
 * Why globalThis? Next.js dev compiles RSC pages and route handlers into
 * SEPARATE module graphs, so a plain `const map = new Map()` gets duplicated
 * across them — the page would see a user that the API route can't. Pinning
 * the state to globalThis makes it a true process-wide singleton and also
 * survives hot-module-reload. (A real DB sidesteps this entirely.)
 */

export type Chain = 'ethereum' | 'solana' | 'near';

export type UserWallet = {
  userId: string;            // App-internal ID; we use the OutLayer wallet_id
  apiKey: string;            // OutLayer API key — server-side only, never to client
  walletId: string;          // OutLayer wallet UUID
  nearAccountId: string;     // The wallet's NEAR address
  linkedAddresses: Array<{ chain: Chain; address: string }>;
};

type StoreState = {
  byUserId: Map<string, UserWallet>;
  indexByAddress: Map<string, string>; // `${chain}:${address}` → userId
};

const g = globalThis as unknown as { __outlayerStore?: StoreState };
const state: StoreState =
  g.__outlayerStore ?? (g.__outlayerStore = { byUserId: new Map(), indexByAddress: new Map() });

function key(chain: Chain, address: string): string {
  return `${chain}:${address.toLowerCase()}`;
}

export function findByAddress(chain: Chain, address: string): UserWallet | null {
  const userId = state.indexByAddress.get(key(chain, address));
  return userId ? (state.byUserId.get(userId) ?? null) : null;
}

export function findByUserId(userId: string): UserWallet | null {
  return state.byUserId.get(userId) ?? null;
}

export function create(user: UserWallet): UserWallet {
  state.byUserId.set(user.userId, user);
  for (const link of user.linkedAddresses) {
    state.indexByAddress.set(key(link.chain, link.address), user.userId);
  }
  return user;
}

export function linkAddress(userId: string, chain: Chain, address: string): UserWallet | null {
  const u = state.byUserId.get(userId);
  if (!u) return null;
  if (u.linkedAddresses.some((l) => l.chain === chain && l.address.toLowerCase() === address.toLowerCase())) {
    return u;
  }
  u.linkedAddresses.push({ chain, address });
  state.indexByAddress.set(key(chain, address), userId);
  return u;
}
