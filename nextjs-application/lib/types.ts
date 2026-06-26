// Firestore document types

export interface Class {
  id: string;
  name: string;
  description?: string;
  studentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  rollNumber?: string;
  leetcodeUsername: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentStats {
  leetcodeUsername: string;
  studentId: string;

  // Core metrics
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalEasy: number;
  totalMedium: number;
  totalHard: number;

  // Ranking
  ranking: number;
  rating: number;

  // Streaks & Activity
  streak: number;
  maxStreak: number;
  activeDays: number;

  // Contest
  contestsAttended: number;
  contestRating: number;
  globalContestRanking: number;

  // Badges
  badgeCount: number;

  // Today's progress (submissions on the current UTC day, from the calendar)
  solvedToday: number;

  // Profile
  userAvatar: string | null;
  realName: string | null;

  // Fetch metadata
  lastFetchedAt: Date;
  lastFetchError: string | null;
  fetchStatus: 'ok' | 'error' | 'pending';
}

/**
 * A point-in-time capture of a student's solved totals for a given day.
 * Used to compute "Today" / "This Week" / per-date deltas accurately.
 * Doc id: `${leetcodeUsername}_${date}` where date is an IST YYYY-MM-DD key.
 */
export interface DailySnapshot {
  leetcodeUsername: string;
  date: string; // IST YYYY-MM-DD
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  capturedAt: Date;
}

export interface RefreshJob {
  id: string;
  classId: string | 'all';
  triggeredAt: Date;
  completedAt?: Date;
  totalStudents: number;
  processed: number;
  errors: number;
  status: 'running' | 'complete' | 'partial';
  errorMessages?: string[];
}

// API request/response types

export interface CreateClassRequest {
  name: string;
  description?: string;
}

export interface UpdateClassRequest {
  name?: string;
  description?: string;
}

export interface CreateStudentRequest {
  classId: string;
  name: string;
  rollNumber?: string;
  leetcodeUsername: string;
}

export interface UpdateStudentRequest {
  name?: string;
  rollNumber?: string;
  leetcodeUsername?: string;
  classId?: string;
}

export interface VerifyPinRequest {
  pin: string;
}

export interface VerifyPinResponse {
  success: boolean;
  error?: string;
}

export interface RefreshResponse {
  jobId: string;
  status: 'started';
}

export interface RefreshStatusResponse {
  job: RefreshJob | null;
}

export interface StudentStatsResponse {
  data: StudentStats;
  cached: boolean;
  fetchedAt: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

// LeetCode API types (for fetcher)

export interface LeetCodeUserProfile {
  username: string;
  ranking: number;
  reputation: number;
  starRating?: number;
  acSubmissionNum: Array<{
    difficulty: string;
    count: number;
  }>;
  badges: Array<{
    id: string;
    name: string;
  }>;
  userCalendar: {
    streak: number;
    totalActiveDays: number;
    submissionCalendar: string; // JSON string with timestamps as keys
  };
}

export interface LeetCodeContestRanking {
  attendedContestsCount: number;
  rating: number;
  globalRanking: number;
}

export interface AllQuestionsCount {
  difficulty: string;
  count: number;
}

// Leaderboard / dashboard types

export type TimeWindow = 'all' | 'today' | 'week' | 'date';

export interface LeaderboardRow {
  studentId: string;
  name: string;
  leetcodeUsername: string;
  classId: string;
  className: string;
  userAvatar: string | null;
  // Counts for the selected window
  easy: number;
  medium: number;
  hard: number;
  total: number;
  // Always all-time / latest, shown as supporting columns
  streak: number;
  rating: number;
  ranking: number;
  hasStats: boolean;
}

export interface InstituteSummary {
  classId: string;
  name: string;
  memberCount: number;
  allTime: number;
  today: number;
  week: number;
}

export interface LeaderboardData {
  window: TimeWindow;
  date: string | null; // for window === 'date'
  generatedAt: string;
  totalStudents: number;
  problemsSolved: number; // sum of total for the window
  todaysSolves: number; // sum of today across all students
  mostActive: { name: string; count: number } | null;
  rows: LeaderboardRow[];
  institutes: InstituteSummary[];
}
