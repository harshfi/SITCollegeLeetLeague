import { StudentStats } from '@/lib/types';
import { userProfileQuery, userContestQuery } from './graphql-queries';

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
          'User-Agent':
            'Mozilla/5.0 (compatible; LeetCodeTracker/1.0)',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        if (response.status === 429 || response.status === 503) {
          if (attempt < MAX_RETRIES - 1) {
            await exponentialBackoff(attempt);
            continue;
          }
        }
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );
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

function getTodaysSolvedCount(submissionCalendarJson: string): number {
  try {
    const calendar = JSON.parse(submissionCalendarJson);

    // Get today's UTC date at midnight
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const todayTimestamp = Math.floor(today.getTime() / 1000);

    return calendar[todayTimestamp] || 0;
  } catch {
    return 0;
  }
}

export async function fetchLeetCodeStats(
  username: string
): Promise<StudentStats> {
  // Fetch profile + stats
  interface ProfileData {
    matchedUser?: {
      username: string;
      profile?: { ranking: number; reputation: number; starRating: number };
      submitStatsGlobal?: { acSubmissionNum: Array<{ difficulty: string; count: number }> };
      badges?: Array<{ id: string; name: string }>;
      userCalendar?: {
        streak: number;
        totalActiveDays: number;
        submissionCalendar: string;
      };
    };
    allQuestionsCount?: Array<{ difficulty: string; count: number }>;
  }

  const profileData = await graphqlFetch<ProfileData>(userProfileQuery, {
    username,
  });

  if (!profileData.matchedUser) {
    throw new Error(`User ${username} not found`);
  }

  const user = profileData.matchedUser;

  // Extract submission counts by difficulty
  const acSubmissionNum = user.submitStatsGlobal?.acSubmissionNum || [];
  const acByDifficulty: Record<string, number> = {};
  acSubmissionNum.forEach(
    (item: { difficulty: string; count: number }) => {
      acByDifficulty[item.difficulty.toLowerCase()] = item.count;
    }
  );

  // Extract total counts by difficulty
  const allQuestionsCount = profileData.allQuestionsCount || [];
  const totalByDifficulty: Record<string, number> = {};
  allQuestionsCount.forEach(
    (item: { difficulty: string; count: number }) => {
      totalByDifficulty[item.difficulty.toLowerCase()] = item.count;
    }
  );

  // Extract badges
  const badgeCount = user.badges?.length || 0;

  // Parse calendar data
  const calendar = user.userCalendar || { streak: 0, totalActiveDays: 0, submissionCalendar: '{}' };
  const solvedToday = getTodaysSolvedCount(calendar.submissionCalendar || '{}');

  // Fetch contest data
  interface ContestData {
    userContestRanking?: {
      attendedContestsCount: number;
      rating: number;
      globalRanking: number;
    };
  }

  let contestData = {
    attendedContestsCount: 0,
    rating: 0,
    globalRanking: 0,
  };

  try {
    const contestResponse = await graphqlFetch<ContestData>(userContestQuery, {
      username,
    });

    // Handle case where contest ranking doesn't exist
    if (contestResponse.userContestRanking) {
      contestData = contestResponse.userContestRanking;
    }
  } catch {
    // If contest query fails, just use defaults
    contestData = {
      attendedContestsCount: 0,
      rating: 0,
      globalRanking: 0,
    };
  }

  return {
    leetcodeUsername: username,
    studentId: '', // Will be set by the caller
    totalSolved: acByDifficulty.easy + acByDifficulty.medium + acByDifficulty.hard,
    easySolved: acByDifficulty.easy || 0,
    mediumSolved: acByDifficulty.medium || 0,
    hardSolved: acByDifficulty.hard || 0,
    totalEasy: totalByDifficulty.easy || 0,
    totalMedium: totalByDifficulty.medium || 0,
    totalHard: totalByDifficulty.hard || 0,
    ranking: user.profile?.ranking || 0,
    rating: user.profile?.starRating || 0,
    streak: calendar.streak || 0,
    maxStreak: 0, // LeetCode API doesn't expose this
    activeDays: calendar.totalActiveDays || 0,
    contestsAttended: contestData.attendedContestsCount || 0,
    contestRating: contestData.rating || 0,
    globalContestRanking: contestData.globalRanking || 0,
    badgeCount,
    solvedToday,
    lastFetchedAt: new Date(),
    lastFetchError: null,
    fetchStatus: 'ok',
  } as StudentStats;
}
