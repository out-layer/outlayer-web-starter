/**
 * POST /api/swap — swap one intents token for another.
 *
 * Body: { tokenIn, tokenOut, amountIn, minAmountOut? }
 * If minAmountOut is omitted, we first fetch a quote and use its min_amount_out.
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
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minAmountOut?: string;
  };

  let minAmountOut = body.minAmountOut;
  if (!minAmountOut) {
    const quote = await client.swapQuote({
      token_in: body.tokenIn,
      token_out: body.tokenOut,
      amount_in: body.amountIn,
    });
    minAmountOut = quote.min_amount_out;
  }

  try {
    const result = await client.swap({
      token_in: body.tokenIn,
      token_out: body.tokenOut,
      amount_in: body.amountIn,
      ...(minAmountOut ? { min_amount_out: minAmountOut } : {}),
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof OutlayerError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    throw e;
  }
}
