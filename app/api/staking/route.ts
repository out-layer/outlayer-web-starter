/**
 * GET /api/staking?validator=<pool> — staking info for the logged-in wallet:
 *   available — native NEAR balance (what you can stake)
 *   staked    — amount staked with this validator (what you can unstake)
 *
 * `staked` comes from the pool's `get_account_staked_balance` view.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { findByUserId } from '@/lib/server/store';
import { clientForUser } from '@/lib/server/outlayer';

const RPC = process.env.NEAR_RPC_URL ?? 'https://rpc.mainnet.fastnear.com';
const DEFAULT_VALIDATOR = process.env.VALIDATOR ?? 'zavodil.poolv1.near';

async function viewStaked(validator: string, accountId: string): Promise<string> {
  const args = Buffer.from(JSON.stringify({ account_id: accountId })).toString('base64');
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'query',
      params: {
        request_type: 'call_function',
        finality: 'final',
        account_id: validator,
        method_name: 'get_account_staked_balance',
        args_base64: args,
      },
    }),
  });
  const json = (await res.json()) as { result?: { result?: number[] } };
  const bytes = json.result?.result;
  if (!Array.isArray(bytes)) return '0';
  // The pool returns a JSON string like "\"12345...\"".
  return JSON.parse(Buffer.from(bytes).toString()) as string;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const user = findByUserId(session.userId);
  if (!user) return NextResponse.json({ error: 'orphan_session' }, { status: 401 });

  const validator = new URL(req.url).searchParams.get('validator') || DEFAULT_VALIDATOR;
  const client = clientForUser(session.userId);

  const [available, staked] = await Promise.all([
    client
      .getBalance({ chain: 'near', source: 'chain' })
      .then((b) => b.balance)
      .catch(() => '0'),
    viewStaked(validator, user.nearAccountId).catch(() => '0'),
  ]);

  return NextResponse.json({ available, staked });
}
