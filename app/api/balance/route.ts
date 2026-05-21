/**
 * GET /api/balance — native NEAR balance + tracked intents.near token balances,
 * each with its logo (from ft_metadata, cached).
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';
import { getTokenIcon } from '@/lib/server/token-icons';

// Tokens we surface as intents.near balances. `contract` is the bare NEP-141
// account the balance + ft_metadata endpoints expect.
const TRACKED = [
  { symbol: 'USDC', contract: '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1', decimals: 6 },
  { symbol: 'USDT', contract: 'usdt.tether-token.near', decimals: 6 },
  { symbol: 'ETH', contract: 'eth.omft.near', decimals: 18 },
  { symbol: 'SOL', contract: 'sol.omft.near', decimals: 9 },
];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const onChain = await client.getBalance({ chain: 'near', source: 'chain' });

  const tokens = await Promise.all(
    TRACKED.map(async (t) => {
      const [balance, icon] = await Promise.all([
        client
          .getBalance({ chain: 'near', source: 'intents', token: t.contract })
          .then((b) => b.balance)
          .catch(() => '0'),
        getTokenIcon(t.contract),
      ]);
      return { symbol: t.symbol, contract: t.contract, decimals: t.decimals, balance, icon };
    }),
  );

  return NextResponse.json({ near_on_chain: onChain.balance, tokens });
}
