/**
 * POST /api/inbox/webhook — the inbox tells this app of a task: made,
 * approved, answered, failed or expired, `kind: notice` for a notice. The
 * bytes received are checked against `X-Webhook-Signature` with the secret of
 * the owner the body names; nothing of an unsigned body is kept. It carries
 * nothing of what the task shows; the page reads the task.
 */

import { NextResponse } from 'next/server';
import { received } from '@/lib/server/inbox';

export async function POST(request: Request) {
  const body = await request.text();
  const kept = await received(body, request.headers.get('x-webhook-signature'));
  return kept ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_signed' }, { status: 401 });
}
