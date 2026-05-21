/**
 * GET /api/account — the logged-in user's wallet details, INCLUDING the API key.
 *
 * Returning the key to the client is deliberate here: it's gated by the
 * session, and the user owns the wallet. This powers the Account page's
 * "reveal key / QR" so the user can move the wallet to another device.
 *
 * AI agents: if you don't want the key reachable from the browser at all,
 * delete this route and the Account page's reveal — keep the key server-only.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { findByUserId } from '@/lib/server/store';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const user = findByUserId(session.userId);
  if (!user) return NextResponse.json({ error: 'orphan_session' }, { status: 401 });
  return NextResponse.json({
    apiKey: user.apiKey,
    walletId: user.walletId,
    nearAccountId: user.nearAccountId,
    linkedAddresses: user.linkedAddresses,
  });
}
