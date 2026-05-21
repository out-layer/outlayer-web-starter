/**
 * GET /api/staking?validator=<pool> — staking lifecycle info for the wallet:
 *   available    — native NEAR balance (what you can stake)
 *   staked       — currently staked
 *   unstaked     — unstaked but not yet withdrawn (locked during the unlock window)
 *   withdrawable — true once the unlock window (~4 epochs) has passed
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { findByUserId } from '@/lib/server/store';
import { clientForUser } from '@/lib/server/outlayer';

const RPC = process.env.NEAR_RPC_URL ?? 'https://rpc.mainnet.fastnear.com';
const DEFAULT_VALIDATOR = process.env.VALIDATOR ?? 'zavodil.poolv1.near';

async function poolView<T>(validator: string, method: string, accountId: string, fallback: T): Promise<T> {
  try {
    const args = Buffer.from(JSON.stringify({ account_id: accountId })).toString('base64');
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'query',
        params: { request_type: 'call_function', finality: 'final', account_id: validator, method_name: method, args_base64: args },
      }),
    });
    const json = (await res.json()) as { result?: { result?: number[] } };
    const bytes = json.result?.result;
    if (!Array.isArray(bytes)) return fallback;
    return JSON.parse(Buffer.from(bytes).toString()) as T;
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const user = findByUserId(session.userId);
  if (!user) return NextResponse.json({ error: 'orphan_session' }, { status: 401 });

  const validator = new URL(req.url).searchParams.get('validator') || DEFAULT_VALIDATOR;
  const client = clientForUser(session.userId);
  const acct = user.nearAccountId;

  const [available, staked, unstaked, withdrawable] = await Promise.all([
    client.getBalance({ chain: 'near', source: 'chain' }).then((b) => b.balance).catch(() => '0'),
    poolView<string>(validator, 'get_account_staked_balance', acct, '0'),
    poolView<string>(validator, 'get_account_unstaked_balance', acct, '0'),
    poolView<boolean>(validator, 'is_account_unstaked_balance_available', acct, false),
  ]);

  return NextResponse.json({ available, staked, unstaked, withdrawable });
}
