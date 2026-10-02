/**
 * POST /api/inbox/session — connect the inbox: the user's custody wallet signs
 * one statement that signs this server in as a device of theirs. Called from
 * the user's click on the Inbox page.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { connect } from '@/lib/server/inbox';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  try {
    return NextResponse.json(await connect(session.userId));
  } catch (e) {
    return NextResponse.json({ error: 'inbox_sign_in_failed', message: (e as Error).message }, { status: 502 });
  }
}
