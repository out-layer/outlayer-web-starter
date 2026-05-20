/**
 * POST /api/auth/near
 *
 * Body: { accountId, publicKey, signature, message, nonce, recipient }
 * Verifies the NEP-413 signature.
 */

import { NextResponse } from 'next/server';
import { verifyNear } from '@/lib/server/verifiers';
import { signInWithAddress } from '@/lib/server/auth-flow';

export async function POST(req: Request) {
  const body = (await req.json()) as {
    accountId: string;
    publicKey: string;
    signature: string;
    message: string;
    nonce: string;
    recipient: string;
  };

  for (const k of ['accountId', 'publicKey', 'signature', 'message', 'nonce', 'recipient'] as const) {
    if (!body[k]) return NextResponse.json({ error: 'missing_fields', field: k }, { status: 400 });
  }

  const verified = verifyNear(body);
  if (!verified) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }
  const user = await signInWithAddress('near', verified);
  return NextResponse.json({
    userId: user.userId,
    nearAccountId: user.nearAccountId,
    linkedAddresses: user.linkedAddresses,
  });
}
