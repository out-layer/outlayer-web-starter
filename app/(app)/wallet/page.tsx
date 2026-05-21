/**
 * Wallet — the main screen. Everything the user operates lives here:
 * address, balances, and all four actions (deposit, buy NEAR, stake, withdraw).
 * Account (API key / QR) is the only separate page.
 */

import { getSession } from '@/lib/server/session';
import { findByUserId } from '@/lib/server/store';
import AddressesCard from '@/components/AddressesCard';
import BalanceCard from '@/components/BalanceCard';
import DepositCard from '@/components/DepositCard';
import SwapCard from '@/components/SwapCard';
import StakeCard from '@/components/StakeCard';
import WithdrawCard from '@/components/WithdrawCard';

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  const session = await getSession();
  const user = session ? findByUserId(session.userId) : null;
  if (!user) return null; // layout guards; satisfies the type

  return (
    <>
      <AddressesCard />
      <BalanceCard />
      <DepositCard nearAccountId={user.nearAccountId} />
      <SwapCard />
      <StakeCard />
      <WithdrawCard />
    </>
  );
}
