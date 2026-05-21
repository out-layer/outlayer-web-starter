/**
 * POST /api/deposit-intent — create a cross-chain deposit address (1Click).
 *
 * Body: { chain, amount, token }  (amount in the token's smallest unit)
 * Returns the one-time deposit address on the source chain + expected output.
 * The user sends funds there; poll /api/deposit-status until success.
 */

import { NextResponse } from 'next/server';
import { OutlayerError } from '@outlayer/sdk';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const body = (await req.json()) as { chain: string; amount: string; token: string };
  try {
    const intent = await client.createDepositIntent(body);
    return NextResponse.json(intent);
  } catch (e) {
    if (e instanceof OutlayerError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    throw e;
  }
}
