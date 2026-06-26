import { StudentStats } from '@/lib/types';
import { buildUserProfileQuery, userContestQuery } from './graphql-queries';

interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second
const DAY_SECONDS = 86400;
const IST_OFFSET_SECONDS = 5.5 * 3600;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function exponentialBackoff(attempt: number): Promise<void> {
  const waitTime = BASE_DELAY * Math.pow(2, attempt);
  await delay(waitTime);
}

async function graphqlFetch<T>(query: string, variables: Record<string, string>): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
          'User-Agent': 'Mozilla/5.0 (compatible; LeetCodeTracker/1.0)',
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        if (response.status === 429 || response.status === 503) {
          if (attempt < MAX_RETRIES - 1) {
            await exponentialBackoff(attempt);
            continue;
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: GraphQLResponse<T> = await response.json();

      if (result.errors && result.errors.length > 0) {
        const errorMsg = result.errors.map((e) => e.message).join(', ');
        throw new Error(`GraphQL error: ${errorMsg}`);
      }

      if (!result.data) {
        throw new Error('No data in GraphQL response');
      }

      return result.data;
    } catch (error) {
      if (attempt < MAX_RETRIES - 1) {
        await exponentialBackoff(attempt);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

/** IST day index (days since epoch in IST) for a unix-seconds timestamp. */
function istDayIndex(unixSeconds: number): number {
  return Math.floor((unixSeconds + IST_OFFSET_SECONDS) / DAY_SECONDS);
}

/** Parse one or more submissionCalendar JSON strings into a day-index → count map. */
function parseCalendar(...calendarJsons: (string | undefined)[]): Map<number, number> {
  const byDay = new Map<number, number>();
  for (const json of calendarJsons) {
    if (!json) continue;
    try {
      const calendar = JSON.parse(json) as Record<string, number>;
      for (const [tsStr, count] of Object.entries(calendar)) {
        const day = istDayIndex(Number(tsStr));
        byDay.set(day, (byDay.get(day) || 0) + (count || 0));
      }
    } catch {
      // ignore malformed calendar
    }
  }
  return byDay;
}

/**
 * Computes the *current* active streak (consecutive active days ending today
 * or yesterday) and the *max* streak across the calendar.
 */
function computeStreaks(byDay: Map<number, number>): {
  current: number;
  max: number;
} {
  const activeDays = new Set<number>();
  for (const [day, count] of byDay.entries()) {
    if (count > 0) activeDays.add(day);
  }

  // Current streak: walk backwards from today (allowing today to be unsolved yet).
  const todayIdx = istDayIndex(Math.floor(Date.now() / 1000));
  let cursor = activeDays.has(todayIdx) ? todayIdx : todayIdx - 1;
  let current = 0;
  while (activeDays.has(cursor)) {
    current++;
    cursor--;
  }

  // Max streak: longest consecutive run among active days.
  const sorted = [...activeDays].sort((a, b) => a - b);
  let max = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of sorted) {
    run = prev !== null && day === prev + 1 ? run + 1 : 1;
    if (run > max) max = run;
    prev = day;
  }

  return { current, max };
}

export async function fetchLeetCodeStats(
  username: string
): Promise<StudentStats> {
  interface ProfileData {
    matchedUser?: {
      username: string;
      profile?: {
        ranking: number;
        reputation: number;
        starRating: number;
        userAvatar?: string;
        realName?: string;
      };
      submitStatsGlobal?: {
        acSubmissionNum: Array<{ difficulty: string; count: number }>;
      };
      badges?: Array<{ id: string; name: string }>;
      calendarCurrent?: {
        streak: number;
        totalActiveDays: number;
        submissionCalendar: string;
      };
      calendarPrev?: { submissionCalendar: string };
    };
    allQuestionsCount?: Array<{ difficulty: string; count: number }>;
  }

  const currentYear = new Date().getUTCFullYear();
  const profileData = await graphqlFetch<ProfileData>(
    buildUserProfileQuery(currentYear),
    { username }
  );

  if (!profileData.matchedUser) {
    throw new Error(`User ${username} not found`);
  }

  const user = profileData.matchedUser;

  // Submission counts by difficulty
  const acByDifficulty: Record<string, number> = {};
  (user.submitStatsGlobal?.acSubmissionNum || []).forEach((item) => {
    acByDifficulty[item.difficulty.toLowerCase()] = item.count;
  });

  // Total available questions by difficulty
  const totalByDifficulty: Record<string, number> = {};
  (profileData.allQuestionsCount || []).forEach((item) => {
    totalByDifficulty[item.difficulty.toLowerCase()] = item.count;
  });

  const badgeCount = user.badges?.length || 0;

  // Streaks + today's submissions from the merged calendar
  const byDay = parseCalendar(
    user.calendarCurrent?.submissionCalendar,
    user.calendarPrev?.submissionCalendar
  );
  const { current: currentStreak, max: maxStreak } = computeStreaks(byDay);
  const todayIdx = istDayIndex(Math.floor(Date.now() / 1000));
  const solvedToday = byDay.get(todayIdx) || 0;

  // Contest data (best-effort)
  interface ContestData {
    userContestRanking?: {
      attendedContestsCount: number;
      rating: number;
      globalRanking: number;
    };
  }

  let contestData = { attendedContestsCount: 0, rating: 0, globalRanking: 0 };
  try {
    const contestResponse = await graphqlFetch<ContestData>(userContestQuery, {
      username,
    });
    if (contestResponse.userContestRanking) {
      contestData = contestResponse.userContestRanking;
    }
  } catch {
    // keep defaults
  }

  return {
    leetcodeUsername: username,
    studentId: '', // set by the caller
    totalSolved:
      (acByDifficulty.easy || 0) +
      (acByDifficulty.medium || 0) +
      (acByDifficulty.hard || 0),
    easySolved: acByDifficulty.easy || 0,
    mediumSolved: acByDifficulty.medium || 0,
    hardSolved: acByDifficulty.hard || 0,
    totalEasy: totalByDifficulty.easy || 0,
    totalMedium: totalByDifficulty.medium || 0,
    totalHard: totalByDifficulty.hard || 0,
    ranking: user.profile?.ranking || 0,
    rating: user.profile?.starRating || 0,
    streak: currentStreak,
    maxStreak,
    activeDays: user.calendarCurrent?.totalActiveDays || 0,
    contestsAttended: contestData.attendedContestsCount || 0,
    contestRating: contestData.rating || 0,
    globalContestRanking: contestData.globalRanking || 0,
    badgeCount,
    solvedToday,
    userAvatar: user.profile?.userAvatar || null,
    realName: user.profile?.realName || null,
    lastFetchedAt: new Date(),
    lastFetchError: null,
    fetchStatus: 'ok',
  } as StudentStats;
}
