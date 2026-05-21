/**
 * Dashboard — composes 6 panel components.
 *
 * Each panel is independent: hits one or two API routes, manages its own
 * state. This makes it easy for AI agents to delete or duplicate any
 * single panel without breaking others.
 */

'use client';

import type { Chain } from '@/lib/server/store';
import AddressesCard from './AddressesCard';
import BalanceCard from './BalanceCard';
import DepositCard from './DepositCard';
import SwapCard from './SwapCard';
import StakeCard from './StakeCard';
import WithdrawCard from './WithdrawCard';

export type DashboardProps = {
  userId: string;
  nearAccountId: string;
  linkedAddresses: Array<{ chain: Chain; address: string }>;
};

export default function Dashboard(props: DashboardProps) {
  async function signOut() {
    await fetch('/api/session', { method: 'DELETE' });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Wallet</h2>
            <p className="mt-1 font-mono text-sm break-all text-neutral-700 dark:text-neutral-300">
              {props.nearAccountId}
            </p>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Signed in via:{' '}
              {props.linkedAddresses.map((l) => `${l.chain} (${shorten(l.address)})`).join(', ')}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      </section>

      <AddressesCard />
      <BalanceCard />
      <DepositCard />
      <SwapCard />
      <StakeCard />
      <WithdrawCard />
    </div>
  );
}

function shorten(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
