/**
 * GET /api/addresses — the wallet's NEAR address.
 *
 * wallet v1 only derives a NEAR address (the custody wallet is NEAR-native;
 * cross-chain value moves through NEAR Intents, not native per-chain keys).
 * So we fetch only `near` — no point hitting the gated chains, which would
 * just 400. The UI shows ETH/SOL/BTC as "coming soon" statically.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const near = await client.getAddress('near');
  return NextResponse.json({ near: { address: near.address, public_key: near.public_key } });
}
