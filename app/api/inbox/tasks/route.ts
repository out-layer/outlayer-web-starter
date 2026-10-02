/**
 * GET /api/inbox/tasks — what waits for the user, read on this server's device,
 * and the deliveries the inbox POSTed here.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { InboxNotConnected, readInbox, webhookUrl } from '@/lib/server/inbox';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  try {
    return NextResponse.json({ connected: true, webhook: webhookUrl() !== null, ...(await readInbox(session.userId)) });
  } catch (e) {
    if (e instanceof InboxNotConnected) return NextResponse.json({ connected: false, webhook: webhookUrl() !== null });
    return NextResponse.json({ error: 'inbox_unavailable', message: (e as Error).message }, { status: 502 });
  }
}
