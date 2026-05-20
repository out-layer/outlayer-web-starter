/**
 * GET /api/deposit-info — where to send funds from external chains.
 *
 * Cross-chain INCOMING deposits aren't an SDK call yet — they're bridge
 * operations from the user's external wallet. This endpoint returns:
 *  - The wallet's NEAR address (for direct NEAR / NEP-141 deposits)
 *  - Curated bridge URLs for each supported source chain
 *
 * AI agents: when OutLayer ships a v0.2 /wallet/v1/deposit endpoint that
 * generates per-chain deposit addresses, replace the bridges array with
 * a `client.createDeposit({ chain, token })` call.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { clientForUser } from '@/lib/server/outlayer';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const client = clientForUser(session.userId);

  const near = await client.getAddress('near');
  return NextResponse.json({
    near_address: near.address,
    bridges: [
      {
        chain: 'ethereum',
        name: 'Rainbow Bridge',
        url: 'https://rainbowbridge.app',
        note: 'Bridge USDT/USDC/ETH from Ethereum to NEAR. Land on the address above.',
      },
      {
        chain: 'solana',
        name: 'Allbridge',
        url: 'https://allbridge.io',
        note: 'Bridge from Solana to NEAR.',
      },
      {
        chain: 'ethereum',
        name: 'Wormhole Portal',
        url: 'https://portalbridge.com',
        note: 'Multi-chain bridge (EVM ↔ Solana ↔ NEAR via NEP-141 wrappers).',
      },
    ],
    next_step: 'Once tokens land as NEP-141 on NEAR, POST /api/intents-deposit to move them into intents.near (not implemented in this minimal demo).',
  });
}
