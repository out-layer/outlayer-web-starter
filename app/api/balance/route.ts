/**
 * GET /api/balance — native NEAR balance + tracked intents.near token balances.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';

// Tokens we surface as intents.near balances. `contract` is the bare NEP-141
// account the balance endpoint expects (no `nep141:` prefix).
const TRACKED = [
  { symbol: 'USDC', contract: '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1', decimals: 6 },
  { symbol: 'USDT', contract: 'usdt.tether-token.near', decimals: 6 },
];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const onChain = await client.getBalance({ chain: 'near', source: 'chain' });

  const tokens = await Promise.all(
    TRACKED.map(async (t) => {
      let balance = '0';
      try {
        const b = await client.getBalance({ chain: 'near', source: 'intents', token: t.contract });
        balance = b.balance;
      } catch {
        /* no balance */
      }
      return { symbol: t.symbol, contract: t.contract, decimals: t.decimals, balance };
    }),
  );

  return NextResponse.json({ near_on_chain: onChain.balance, tokens });
}
