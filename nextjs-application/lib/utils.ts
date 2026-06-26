import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLastFetched(date: Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function assignRanks(items: Array<{ totalSolved: number }>): Array<{
  totalSolved: number;
  rank: number;
}> {
  const sorted = items
    .map((item, idx) => ({ ...item, originalIdx: idx }))
    .sort((a, b) => b.totalSolved - a.totalSolved);

  let currentRank = 1;
  let prevSolved = -1;
  const withRanks = sorted.map((item, idx) => {
    if (item.totalSolved !== prevSolved) {
      currentRank = idx + 1;
      prevSolved = item.totalSolved;
    }
    return {
      ...item,
      rank: currentRank,
    };
  });

  // Restore original order if needed
  return withRanks.sort((a, b) => a.originalIdx - b.originalIdx);
}

export function getPercentage(solved: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((solved / total) * 100);
}

export function getStreakColor(streak: number): string {
  if (streak === 0) return 'text-muted-foreground';
  if (streak < 7) return 'text-orange-500';
  if (streak < 30) return 'text-yellow-500';
  return 'text-green-500';
}

export function getProgressBarColor(percentage: number): string {
  if (percentage < 25) return 'bg-red-500';
  if (percentage < 50) return 'bg-orange-500';
  if (percentage < 75) return 'bg-yellow-500';
  return 'bg-green-500';
}
