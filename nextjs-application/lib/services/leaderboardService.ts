import { unstable_cache } from 'next/cache';
import * as studentService from './studentService';
import * as statsService from './statsService';
import * as classService from './classService';
import { LeaderboardData, LeaderboardRow, StudentStats, TimeWindow } from '@/lib/types';
import { istDateKey, istDateKeyDaysAgo } from '@/lib/utils';

/** Solves within the requested window, derived from the submission calendar. */
function solvesInWindow(
  stat: StudentStats | undefined,
  window: TimeWindow,
  todayKey: string,
  weekKeys: string[],
  dateKey: string
): number {
  if (!stat) return 0;
  if (window === 'all') return stat.totalSolved || 0;

  const cal = stat.submissionCalendar || {};
  if (window === 'today') return cal[todayKey] || 0;
  if (window === 'date') return cal[dateKey] || 0;
  // week
  return weekKeys.reduce((sum, k) => sum + (cal[k] || 0), 0);
}

async function computeLeaderboard(
  window: TimeWindow,
  dateStr?: string
): Promise<LeaderboardData> {
  const generatedAt = new Date().toISOString();

  const [students, classes, statsMap] = await Promise.all([
    studentService.getStudents(),
    classService.getClasses(),
    statsService.getAllStats(),
  ]);

  const classNameById = new Map(classes.map((c) => [c.id, c.name]));

  const todayKey = istDateKey();
  const weekKeys = Array.from({ length: 7 }, (_, i) => istDateKeyDaysAgo(i));
  const dateKey = dateStr || todayKey;

  let todaysSolves = 0;
  let mostActive: { name: string; count: number } | null = null;

  const instituteAgg = new Map<
    string,
    { allTime: number; today: number; week: number; members: number }
  >();
  for (const c of classes) {
    instituteAgg.set(c.id, { allTime: 0, today: 0, week: 0, members: 0 });
  }

  const rows: LeaderboardRow[] = [];

  for (const student of students) {
    const stat = statsMap.get(student.leetcodeUsername);

    const cal = stat?.submissionCalendar || {};
    const todayCount = cal[todayKey] || 0;
    const weekCount = weekKeys.reduce((s, k) => s + (cal[k] || 0), 0);
    const windowTotal = solvesInWindow(stat, window, todayKey, weekKeys, dateKey);

    // Headline aggregates (always reflect "today", independent of the tab).
    todaysSolves += todayCount;
    if (todayCount > 0 && (!mostActive || todayCount > mostActive.count)) {
      mostActive = { name: student.name, count: todayCount };
    }

    const agg = instituteAgg.get(student.classId);
    if (agg) {
      agg.members += 1;
      agg.allTime += stat?.totalSolved || 0;
      agg.today += todayCount;
      agg.week += weekCount;
    }

    if (!stat) continue; // can't rank students with no fetched stats yet

    rows.push({
      studentId: student.id,
      name: student.name,
      leetcodeUsername: student.leetcodeUsername,
      classId: student.classId,
      className: classNameById.get(student.classId) || 'Unknown',
      userAvatar: stat.userAvatar ?? null,
      // Easy/Med/Hard are all-time (only displayed in the All-Time tab).
      easy: stat.easySolved || 0,
      medium: stat.mediumSolved || 0,
      hard: stat.hardSolved || 0,
      total: windowTotal,
      streak: stat.streak || 0,
      // "Rating" on LeetCode is the contest rating, not the profile star rating.
      rating: Math.round(stat.contestRating || 0),
      ranking: stat.ranking || 0,
      hasStats: true,
    });
  }

  rows.sort((a, b) => b.total - a.total || a.ranking - b.ranking);

  const problemsSolved = rows.reduce((sum, r) => sum + r.total, 0);

  const institutes = classes
    .map((c) => {
      const agg = instituteAgg.get(c.id)!;
      return {
        classId: c.id,
        name: c.name,
        memberCount: agg.members,
        allTime: agg.allTime,
        today: agg.today,
        week: agg.week,
      };
    })
    .sort((a, b) => b.allTime - a.allTime);

  return {
    window,
    date: window === 'date' ? dateKey : null,
    generatedAt,
    totalStudents: students.length,
    problemsSolved,
    todaysSolves,
    mostActive,
    rows,
    institutes,
  };
}

/**
 * Cached leaderboard. The underlying data only changes when stats are refreshed
 * (daily cron / manual refresh), so caching the computed result avoids re-scanning
 * the students + studentStats collections on every page load and tab switch.
 * Cache key includes the (window, date) arguments. Self-heals on the 300s TTL,
 * so fresh data appears within ~5 min of a refresh.
 */
export const getLeaderboard = unstable_cache(
  computeLeaderboard,
  ['leaderboard'],
  { revalidate: 300, tags: ['leaderboard'] }
);
