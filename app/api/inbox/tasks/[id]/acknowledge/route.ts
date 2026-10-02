/**
 * POST /api/inbox/tasks/:id/acknowledge — Got it: the user saw a notice.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { InboxNotConnected, gotIt } from '@/lib/server/inbox';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  try {
    await gotIt(session.userId, params.id);
    return NextResponse.json({ id: params.id, state: 'done' });
  } catch (e) {
    if (e instanceof InboxNotConnected) return NextResponse.json({ error: 'inbox_not_connected' }, { status: 409 });
    return NextResponse.json({ error: 'got_it_failed', message: (e as Error).message }, { status: 502 });
  }
}
