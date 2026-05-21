/**
 * POST /api/swap/quote — preview a swap rate (no execution, no balance needed).
 *
 * Body: { tokenIn, tokenOut, amountIn }
 */

import { NextResponse } from 'next/server';
import { OutlayerError } from '@outlayer/sdk';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const body = (await req.json()) as { tokenIn: string; tokenOut: string; amountIn: string };
  try {
    const quote = await client.swapQuote({
      token_in: body.tokenIn,
      token_out: body.tokenOut,
      amount_in: body.amountIn,
    });
    return NextResponse.json(quote);
  } catch (e) {
    if (e instanceof OutlayerError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    throw e;
  }
}
