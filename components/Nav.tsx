/**
 * Top navigation for the authenticated app. Active link highlighting via
 * usePathname; sign-out clears the session and returns home.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/wallet', label: 'Wallet' },
  { href: '/deposit', label: 'Deposit' },
  { href: '/swap', label: 'Buy NEAR' },
  { href: '/stake', label: 'Stake' },
  { href: '/withdraw', label: 'Withdraw' },
  { href: '/account', label: 'Account' },
];

export default function Nav() {
  const path = usePathname();

  async function signOut() {
    await fetch('/api/session', { method: 'DELETE' });
    window.location.href = '/';
  }

  return (
    <header className="flex flex-wrap items-center gap-2 border-b pb-3 dark:border-neutral-800">
      <span className="mr-2 font-semibold tracking-tight">OutLayer</span>
      <nav className="flex flex-wrap gap-1">
        {LINKS.map((l) => {
          const active = path === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                active
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={signOut}
        className="ml-auto rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Sign out
      </button>
    </header>
  );
}
