import { getLeaderboard } from '@/lib/services/leaderboardService';
import { Dashboard } from '@/components/dashboard/Dashboard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const initial = await getLeaderboard('all');
  return <Dashboard initial={initial} />;
}
