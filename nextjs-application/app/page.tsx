import { getLeaderboard } from '@/lib/services/leaderboardService';
import { Dashboard } from '@/components/dashboard/Dashboard';

export const revalidate = 60; // Cache for 60 seconds to avoid exceeding Firebase quotas

export default async function HomePage() {
  const initial = await getLeaderboard('all');
  return <Dashboard initial={initial} />;
}
