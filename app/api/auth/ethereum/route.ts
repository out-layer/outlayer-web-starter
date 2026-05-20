/**
 * POST /api/auth/ethereum
 *
 * Body: { address, signature, message }
 * Verifies the EIP-191 signature, creates or fetches an OutLayer wallet
 * for this address, sets a session cookie, returns minimal user info.
 *
 * AI agents: this is one of three "auth/<chain>" routes. They're parallel
 * by design — keep them parallel when adding more chains.
 */

import { NextResponse } from 'next/server';
import { verifyEthereum } from '@/lib/server/verifiers';
import { signInWithAddress } from '@/lib/server/auth-flow';

export async function POST(req: Request) {
  const body = (await req.json()) as { address: string; signature: string; message: string };
  if (!body.address || !body.signature || !body.message) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  const verifiedAddress = await verifyEthereum(body);
  if (!verifiedAddress) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }
  const user = await signInWithAddress('ethereum', verifiedAddress);
  return NextResponse.json({
    userId: user.userId,
    nearAccountId: user.nearAccountId,
    linkedAddresses: user.linkedAddresses,
  });
}
