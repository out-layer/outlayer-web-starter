/**
 * GET /api/deposit-status?id=<intent_id> — poll a cross-chain deposit.
 */

import { NextResponse } from 'next/server';
import { OutlayerError } from '@outlayer/sdk';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  try {
    const status = await client.getDepositStatus(id);
    return NextResponse.json(status);
  } catch (e) {
    if (e instanceof OutlayerError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    throw e;
  }
}
