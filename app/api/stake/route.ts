/**
 * POST /api/stake — stake NEAR with a validator.
 *
 * Body: { validator, amountYocto }
 * Default validator is configurable per deployment; we put it in code
 * to keep the example self-contained.
 */

import { NextResponse } from 'next/server';
import { OutlayerError } from '@outlayer/sdk';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';

const DEFAULT_VALIDATOR = process.env.VALIDATOR ?? 'astro-stakers.poolv1.near';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const body = (await req.json()) as { validator?: string; amountYocto: string };
  const validator = body.validator ?? DEFAULT_VALIDATOR;

  try {
    const result = await client.call({
      receiver_id: validator,
      method_name: 'deposit_and_stake',
      args: {},
      gas: '100000000000000', // 100 TGas
      deposit: body.amountYocto,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof OutlayerError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    throw e;
  }
}
