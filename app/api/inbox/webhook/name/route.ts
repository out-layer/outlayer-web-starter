/**
 * POST /api/inbox/webhook/name — connect notifications: name this app's
 * `/api/inbox/webhook` as the URL the user's task events go to. The custody
 * wallet confirms it; it replaces any URL named elsewhere. Needs
 * INBOX_PUBLIC_URL: the inbox reaches public HTTPS hosts only.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { InboxNotConnected, connectNotifications, webhookUrl } from '@/lib/server/inbox';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const url = webhookUrl();
  if (!url) {
    return NextResponse.json({ error: 'no_public_url', message: 'Set INBOX_PUBLIC_URL to the public HTTPS address of this app.' }, { status: 400 });
  }
  try {
    await connectNotifications(session.userId, url);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof InboxNotConnected) return NextResponse.json({ error: 'inbox_not_connected' }, { status: 409 });
    return NextResponse.json({ error: 'webhook_failed', message: (e as Error).message }, { status: 502 });
  }
}
