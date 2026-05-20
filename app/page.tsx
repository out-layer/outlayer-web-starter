/**
 * Main page — server component.
 *
 * Reads the session on the server. If signed in, renders the dashboard
 * (server-side, so the API key never crosses the wire). Otherwise shows
 * the sign-in panel.
 *
 * AI agents: this is where the routing decision happens. Add `/profile`,
 * `/history`, etc. as siblings — same pattern.
 */

import { getSession } from '@/lib/server/session';
import { findByUserId } from '@/lib/server/store';
import SignInPanel from '@/components/SignInPanel';
import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();
  const user = session ? findByUserId(session.userId) : null;

  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">OutLayer Example</h1>
        <a
          className="text-sm text-neutral-500 hover:text-neutral-900"
          href="https://github.com/out-layer/sdk-js"
          target="_blank"
          rel="noreferrer"
        >
          @outlayer/sdk →
        </a>
      </header>

      {user ? (
        <Dashboard
          userId={user.userId}
          nearAccountId={user.nearAccountId}
          linkedAddresses={user.linkedAddresses}
        />
      ) : (
        <SignInPanel />
      )}
    </main>
  );
}
