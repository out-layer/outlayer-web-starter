/**
 * POST /api/auth/solana
 *
 * Body: { address, signature, message }
 * Verifies the ed25519 signature, creates or fetches an OutLayer wallet,
 * sets a session cookie.
 */

import { NextResponse } from 'next/server';
import { verifySolana } from '@/lib/server/verifiers';
import { signInWithAddress } from '@/lib/server/auth-flow';

export async function POST(req: Request) {
  const body = (await req.json()) as { address: string; signature: string; message: string };
  if (!body.address || !body.signature || !body.message) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  const verifiedAddress = verifySolana(body);
  if (!verifiedAddress) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }
  const user = await signInWithAddress('solana', verifiedAddress);
  return NextResponse.json({
    userId: user.userId,
    nearAccountId: user.nearAccountId,
    linkedAddresses: user.linkedAddresses,
  });
}
