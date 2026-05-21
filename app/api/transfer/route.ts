/**
 * POST /api/transfer — send native NEAR from the wallet's own account to a
 * recipient. This is a plain on-chain transfer (NOT an intents withdrawal):
 * the source is the wallet's native NEAR balance, and it costs gas.
 *
 * Body: { to, amount }  (amount in yoctoNEAR)
 */

import { NextResponse } from 'next/server';
import { OutlayerError } from '@outlayer/sdk';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const body = (await req.json()) as { to: string; amount: string };
  if (!body.to) return NextResponse.json({ error: 'bad_request', message: 'Missing recipient' }, { status: 400 });

  try {
    const result = await client.transfer({ chain: 'near', receiver_id: body.to, amount: body.amount });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof OutlayerError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    throw e;
  }
}
