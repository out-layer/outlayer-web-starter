/**
 * Home — sign-in. If already authed, go straight to /wallet.
 */

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/server/session';
import { findByUserId } from '@/lib/server/store';
import SignInPanel from '@/components/SignInPanel';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();
  const user = session ? findByUserId(session.userId) : null;
  if (user) redirect('/wallet');

  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">OutLayer Example</h1>
        <a
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          href="https://github.com/out-layer/sdk-js"
          target="_blank"
          rel="noreferrer"
        >
          @outlayer/sdk →
        </a>
      </header>
      <SignInPanel />
    </main>
  );
}
