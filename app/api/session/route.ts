/**
 * GET /api/session  — current user info, or 401
 * DELETE /api/session — sign out
 */

import { NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/server/session';
import { findByUserId } from '@/lib/server/store';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const user = findByUserId(session.userId);
  if (!user) return NextResponse.json({ error: 'orphan_session' }, { status: 401 });
  return NextResponse.json({
    userId: user.userId,
    nearAccountId: user.nearAccountId,
    linkedAddresses: user.linkedAddresses,
  });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
