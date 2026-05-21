/**
 * POST /api/unwrap — convert the wallet's wNEAR (held on intents.near) into
 * native NEAR on its own account.
 *
 * Uses the withdraw endpoint with token=near, which the coordinator routes
 * through the intents `native_withdraw` intent: it debits wNEAR, unwraps via
 * wrap.near, and sends native NEAR to the receiver — gaslessly, with no
 * wrap.near storage needed on the recipient. `to` = the wallet's own implicit
 * account (always safe; a native transfer auto-creates it).
 *
 * This is the missing link for staking: USDC → (swap) wNEAR → (unwrap) native
 * NEAR → stake.
 */

import { NextResponse } from 'next/server';
import { OutlayerError } from '@outlayer/sdk';
import { getSession } from '@/lib/server/session';
import { findByUserId } from '@/lib/server/store';
import { clientForUser } from '@/lib/server/outlayer';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const user = findByUserId(session.userId);
  if (!user) return NextResponse.json({ error: 'orphan_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  // Unwrap the full wNEAR balance currently held on intents.near.
  const wnear = await client
    .getBalance({ chain: 'near', source: 'intents', token: 'wrap.near' })
    .then((b) => b.balance)
    .catch(() => '0');

  if (BigInt(wnear) === 0n) {
    return NextResponse.json({ error: 'no_balance', message: 'No wNEAR to unwrap' }, { status: 400 });
  }

  try {
    const result = await client.withdraw({
      chain: 'near',
      to: user.nearAccountId,
      token: 'near', // native — coordinator unwraps via native_withdraw
      amount: wnear,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof OutlayerError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    throw e;
  }
}
