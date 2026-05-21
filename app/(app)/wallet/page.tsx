import AddressesCard from '@/components/AddressesCard';
import BalanceCard from '@/components/BalanceCard';

export const dynamic = 'force-dynamic';

export default function WalletPage() {
  return (
    <>
      <AddressesCard />
      <BalanceCard />
    </>
  );
}
