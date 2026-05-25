/**
 * Authenticated app layout — shared nav + auth guard for /dashboard and
 * /account. Redirects home if there's no session.
 */

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/server/session';
import { findByUserId } from '@/lib/server/store';
import Nav from '@/components/Nav';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const user = session ? findByUserId(session.userId) : null;
  if (!user) redirect('/');

  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-10">
      <Nav />
      <div className="mt-6 space-y-6">{children}</div>
    </main>
  );
}
