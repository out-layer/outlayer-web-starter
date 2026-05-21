/**
 * POST /api/auth/key — sign in with an existing API key (key-login / QR import).
 *
 * Body: { apiKey }. Validates the key by deriving its address, then sets a
 * session. The key is a bearer credential — anyone holding it controls the
 * wallet (bounded by its policy).
 */

import { NextResponse } from 'next/server';
import { OutlayerError } from '@outlayer/sdk';
import { signInWithApiKey } from '@/lib/server/auth-flow';

export async function POST(req: Request) {
  const body = (await req.json()) as { apiKey?: string };
  if (!body.apiKey || !body.apiKey.startsWith('wk_')) {
    return NextResponse.json({ error: 'bad_request', message: 'Provide an API key (wk_…)' }, { status: 400 });
  }
  try {
    const user = await signInWithApiKey(body.apiKey);
    return NextResponse.json({ userId: user.userId, nearAccountId: user.nearAccountId });
  } catch (e) {
    if (e instanceof OutlayerError) {
      return NextResponse.json({ error: 'invalid_api_key', message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 });
  }
}
