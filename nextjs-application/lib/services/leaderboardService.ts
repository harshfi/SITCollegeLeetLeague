import * as studentService from './studentService';
import * as statsService from './statsService';
import * as classService from './classService';
import {
  LeaderboardData,
  LeaderboardRow,
  TimeWindow,
} from '@/lib/types';

export async function getLeaderboard(
  window: TimeWindow,
  dateStr?: string
): Promise<LeaderboardData> {
  const generatedAt = new Date().toISOString();

  // Fetch all students and classes
  const students = await studentService.getStudents();
  const classes = await classService.getClasses();

  // Fetch stats for all students
  const allStats = await Promise.all(
    students.map((student) =>
      statsService
        .getStats(student.leetcodeUsername)
        .catch(() => null)
    )
  );

  // Build rows
  const rows: LeaderboardRow[] = students
    .map((student, idx) => {
      const stat = allStats[idx];
      const cls = classes.find((c) => c.id === student.classId);

      if (!stat) {
        return {
          studentId: student.id,
          name: student.name,
          leetcodeUsername: student.leetcodeUsername,
          classId: student.classId,
          className: cls?.name || 'Unknown',
          userAvatar: null,
          easy: 0,
          medium: 0,
          hard: 0,
          total: 0,
          streak: 0,
          rating: 0,
          ranking: 0,
          hasStats: false,
        };
      }

      return {
        studentId: student.id,
        name: student.name,
        leetcodeUsername: student.leetcodeUsername,
        classId: student.classId,
        className: cls?.name || 'Unknown',
        userAvatar: stat.userAvatar,
        easy: stat.easySolved,
        medium: stat.mediumSolved,
        hard: stat.hardSolved,
        total: stat.totalSolved,
        streak: stat.streak,
        rating: stat.rating || 0,
        ranking: stat.ranking || 0,
        hasStats: true,
      };
    })
    .filter((row) => row.hasStats);

  // Calculate aggregate stats
  const totalProblems = rows.reduce((sum, r) => sum + r.total, 0);
  const mostActive = rows.length > 0
    ? rows.reduce((prev, current) =>
        current.total > prev.total ? current : prev
      )
    : null;

  // Calculate today's solves
  let todaysSolves = 0;
  try {
    todaysSolves = allStats
      .filter(Boolean)
      .reduce((sum, s) => sum + (s?.solvedToday || 0), 0);
  } catch {
    // ignore
  }

  // Calculate institute summaries
  const institutes = classes
    .map((cls) => {
      const classRows = rows.filter((r) => r.classId === cls.id);
      return {
        classId: cls.id,
        name: cls.name,
        memberCount: students.filter((s) => s.classId === cls.id).length,
        allTime: classRows.reduce((sum, r) => sum + r.total, 0),
        today: classRows.reduce(
          (sum, r) =>
            sum +
            (allStats
              .find((s) => s?.leetcodeUsername === r.leetcodeUsername)
              ?.solvedToday || 0),
          0
        ),
        week: 0,
      };
    })
    .sort((a, b) => b.allTime - a.allTime);

  return {
    window,
    date: dateStr || null,
    generatedAt,
    totalStudents: students.length,
    problemsSolved: totalProblems,
    todaysSolves,
    mostActive: mostActive
      ? {
          name: mostActive.name,
          count: mostActive.total,
        }
      : null,
    rows,
    institutes,
  };
}
