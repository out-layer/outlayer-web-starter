/**
 * POST /api/unstake — unstake all from a validator.
 *
 * Body: { validator? }
 * Funds release after the validator's unlock window (typically 4 epochs).
 * After release, call /api/withdraw-stake to pull them back (out of scope
 * for this minimal example — see SDK docs).
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

  const body = (await req.json()) as { validator?: string };
  const validator = body.validator ?? DEFAULT_VALIDATOR;

  try {
    const result = await client.call({
      receiver_id: validator,
      method_name: 'unstake_all',
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
