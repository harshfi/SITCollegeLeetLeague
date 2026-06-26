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

  // Today's progress
  solvedToday: number;

  // Fetch metadata
  lastFetchedAt: Date;
  lastFetchError: string | null;
  fetchStatus: 'ok' | 'error' | 'pending';
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
