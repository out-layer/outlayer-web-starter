import { getSession } from '@/lib/server/session';
import { findByUserId } from '@/lib/server/store';
import DepositCard from '@/components/DepositCard';

export const dynamic = 'force-dynamic';

export default async function DepositPage() {
  const session = await getSession();
  const user = session ? findByUserId(session.userId) : null;
  if (!user) return null; // layout guards; this satisfies the type
  return <DepositCard nearAccountId={user.nearAccountId} />;
}
