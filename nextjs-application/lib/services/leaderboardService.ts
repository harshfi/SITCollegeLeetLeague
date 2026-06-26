import * as classService from '@/lib/services/classService';
import * as studentService from '@/lib/services/studentService';
import * as statsService from '@/lib/services/statsService';
import * as snapshotService from '@/lib/services/snapshotService';
import {
  DailySnapshot,
  LeaderboardData,
  LeaderboardRow,
  StudentStats,
  TimeWindow,
} from '@/lib/types';
import { istDateKey, istDateKeyDaysAgo, prevDateKey } from '@/lib/utils';

interface Counts {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

const ZERO: Counts = { easy: 0, medium: 0, hard: 0, total: 0 };

function countsFromStats(s?: StudentStats): Counts {
  if (!s) return ZERO;
  return {
    easy: s.easySolved,
    medium: s.mediumSolved,
    hard: s.hardSolved,
    total: s.totalSolved,
  };
}

function countsFromSnapshot(s?: DailySnapshot): Counts | undefined {
  if (!s) return undefined;
  return {
    easy: s.easySolved,
    medium: s.mediumSolved,
    hard: s.hardSolved,
    total: s.totalSolved,
  };
}

/** current − base, clamped at 0. Returns ZERO if base is unknown. */
function delta(current: Counts, base?: Counts): Counts {
  if (!base) return ZERO;
  return {
    easy: Math.max(0, current.easy - base.easy),
    medium: Math.max(0, current.medium - base.medium),
    hard: Math.max(0, current.hard - base.hard),
    total: Math.max(0, current.total - base.total),
  };
}

export async function getLeaderboard(
  window: TimeWindow,
  dateParam?: string
): Promise<LeaderboardData> {
  const [classes, students, statsMap] = await Promise.all([
    classService.getClasses(),
    studentService.getStudents(),
    statsService.getAllStats(),
  ]);

  const classNameById = new Map(classes.map((c) => [c.id, c.name]));

  // Baselines needed for window math. Fetch only what's relevant.
  const yesterdayKey = istDateKeyDaysAgo(1);
  const weekAgoKey = istDateKeyDaysAgo(7);
  const dateKey = dateParam || istDateKey();
  const datePrevKey = prevDateKey(dateKey);

  const [snapYesterday, snapWeekAgo, snapDate, snapDatePrev] = await Promise.all([
    snapshotService.getSnapshotsForDate(yesterdayKey),
    snapshotService.getSnapshotsForDate(weekAgoKey),
    window === 'date' ? snapshotService.getSnapshotsForDate(dateKey) : Promise.resolve(new Map()),
    window === 'date' ? snapshotService.getSnapshotsForDate(datePrevKey) : Promise.resolve(new Map()),
  ]);

  let problemsSolved = 0;
  let todaysSolves = 0;
  let mostActive: { name: string; count: number } | null = null;

  // Per-institute accumulators
  const instituteAgg = new Map<
    string,
    { allTime: number; today: number; week: number; members: number }
  >();
  for (const c of classes) {
    instituteAgg.set(c.id, { allTime: 0, today: 0, week: 0, members: 0 });
  }

  const rows: LeaderboardRow[] = students.map((student) => {
    const stats = statsMap.get(student.leetcodeUsername);
    const current = countsFromStats(stats);

    const todayDelta = delta(current, countsFromSnapshot(snapYesterday.get(student.leetcodeUsername)));
    const weekDelta = delta(current, countsFromSnapshot(snapWeekAgo.get(student.leetcodeUsername)));

    // Window-specific displayed counts
    let windowCounts: Counts;
    if (window === 'today') {
      windowCounts = todayDelta;
    } else if (window === 'week') {
      windowCounts = weekDelta;
    } else if (window === 'date') {
      const cur = countsFromSnapshot(snapDate.get(student.leetcodeUsername));
      windowCounts = cur ? delta(cur, countsFromSnapshot(snapDatePrev.get(student.leetcodeUsername))) : ZERO;
    } else {
      windowCounts = current;
    }

    // Aggregations
    todaysSolves += todayDelta.total;
    problemsSolved += windowCounts.total;
    if (!mostActive || todayDelta.total > mostActive.count) {
      if (todayDelta.total > 0) mostActive = { name: student.name, count: todayDelta.total };
    }

    const agg = instituteAgg.get(student.classId);
    if (agg) {
      agg.members += 1;
      agg.allTime += current.total;
      agg.today += todayDelta.total;
      agg.week += weekDelta.total;
    }

    return {
      studentId: student.id,
      name: student.name,
      leetcodeUsername: student.leetcodeUsername,
      classId: student.classId,
      className: classNameById.get(student.classId) || 'Unknown',
      userAvatar: stats?.userAvatar ?? null,
      easy: windowCounts.easy,
      medium: windowCounts.medium,
      hard: windowCounts.hard,
      total: windowCounts.total,
      streak: stats?.streak ?? 0,
      rating: stats?.rating ?? 0,
      ranking: stats?.ranking ?? 0,
      hasStats: !!stats,
    };
  });

  // Rank by the window's total (desc), then by all-time as a tiebreaker.
  rows.sort((a, b) => b.total - a.total || b.ranking - a.ranking);

  const institutes = classes.map((c) => {
    const agg = instituteAgg.get(c.id)!;
    return {
      classId: c.id,
      name: c.name,
      memberCount: agg.members,
      allTime: agg.allTime,
      today: agg.today,
      week: agg.week,
    };
  });

  return {
    window,
    date: window === 'date' ? dateKey : null,
    generatedAt: new Date().toISOString(),
    totalStudents: students.length,
    problemsSolved,
    todaysSolves,
    mostActive,
    rows,
    institutes,
  };
}
