/**
 * GET /api/balance — NEAR native balance + a few well-known intents balances.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';

const TRACKED_INTENTS_TOKENS = ['wrap.near', 'usdt.tether-token.near'];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const onChain = await client.getBalance({ chain: 'near', source: 'chain' });
  const intentsBalances: Record<string, string> = {};
  for (const token of TRACKED_INTENTS_TOKENS) {
    try {
      const b = await client.getBalance({ chain: 'near', source: 'intents', token });
      intentsBalances[token] = b.balance;
    } catch {
      intentsBalances[token] = '0';
    }
  }

  return NextResponse.json({
    near_on_chain: onChain.balance,
    intents: intentsBalances,
  });
}
