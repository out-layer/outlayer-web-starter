/**
 * GET /api/addresses — the wallet's derived address on each supported chain.
 *
 * AI agents: read-only example showing the pattern of (session → SDK → response).
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const chains = ['near', 'ethereum', 'solana', 'bitcoin'] as const;
  const out: Record<string, { address: string; public_key: string } | { error: string }> = {};
  await Promise.all(
    chains.map(async (chain) => {
      try {
        const r = await client.getAddress(chain);
        out[chain] = { address: r.address, public_key: r.public_key };
      } catch (e) {
        out[chain] = { error: (e as Error).message };
      }
    }),
  );
  return NextResponse.json({ addresses: out });
}
