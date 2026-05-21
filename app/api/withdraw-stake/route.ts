/**
 * POST /api/withdraw-stake — withdraw unstaked NEAR from the pool back to the
 * wallet (after the unlock window). Calls the pool's `withdraw_all`.
 *
 * Body: { validator? }
 */

import { NextResponse } from 'next/server';
import { OutlayerError } from '@outlayer/sdk';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';

const DEFAULT_VALIDATOR = process.env.VALIDATOR ?? 'zavodil.poolv1.near';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const body = (await req.json()) as { validator?: string };
  const validator = body.validator ?? DEFAULT_VALIDATOR;

  try {
    const result = await client.call({
      receiver_id: validator,
      method_name: 'withdraw_all',
      args: {},
      gas: '100000000000000',
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof OutlayerError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    throw e;
  }
}
