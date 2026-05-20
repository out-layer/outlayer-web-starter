/**
 * POST /api/withdraw — cross-chain withdraw (gasless via NEAR Intents).
 *
 * Body: { chain, to, amount, token }
 * The token must already be in the wallet's intents.near balance. For a
 * full "wrap NEAR → deposit → swap → withdraw" flow, see the SDK's
 * examples/05-cross-chain-app.ts.
 */

import { NextResponse } from 'next/server';
import { OutlayerError } from '@outlayer/sdk';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const body = (await req.json()) as {
    chain: 'ethereum' | 'solana' | 'near' | 'bitcoin';
    to: string;
    amount: string;
    token: string;
  };

  try {
    const result = await client.withdraw(body);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof OutlayerError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    throw e;
  }
}
