import { db } from '@/lib/firebase/admin';
import { StudentStats } from '@/lib/types';

const statsRef = () => db.collection('studentStats');

export async function getStats(
  leetcodeUsername: string
): Promise<StudentStats | null> {
  const snapshot = await statsRef().doc(leetcodeUsername).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data()!;
  return {
    ...data,
    lastFetchedAt: data.lastFetchedAt?.toDate() || new Date(),
  } as StudentStats;
}

/** Returns a map of leetcodeUsername → latest stats for all tracked users. */
export async function getAllStats(): Promise<Map<string, StudentStats>> {
  const result = new Map<string, StudentStats>();
  const snapshot = await statsRef().get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    result.set(doc.id, {
      ...data,
      lastFetchedAt: data.lastFetchedAt?.toDate() || new Date(),
    } as StudentStats);
  }
  return result;
}

export async function upsertStats(
  leetcodeUsername: string,
  stats: Partial<StudentStats>,
  studentId: string
): Promise<StudentStats> {
  const docRef = statsRef().doc(leetcodeUsername);

  const now = new Date();
  const dataToSave = {
    leetcodeUsername,
    studentId,
    ...stats,
    lastFetchedAt: now,
    fetchStatus: 'ok' as const,
    lastFetchError: null,
  };

  await docRef.set(dataToSave, { merge: true });

  return {
    ...dataToSave,
    lastFetchedAt: now,
  } as StudentStats;
}

export async function recordFetchError(
  leetcodeUsername: string,
  error: string
): Promise<void> {
  const docRef = statsRef().doc(leetcodeUsername);

  await docRef.set(
    {
      lastFetchedAt: new Date(),
      fetchStatus: 'error' as const,
      lastFetchError: error,
    },
    { merge: true }
  );
}

export function isStale(
  stats: StudentStats | null,
  maxAgeMs: number
): boolean {
  if (!stats) return true;

  const now = new Date().getTime();
  const lastFetch = stats.lastFetchedAt.getTime();

  return now - lastFetch > maxAgeMs;
}

export const STALE_THRESHOLDS = {
  general: 24 * 60 * 60 * 1000, // 24 hours
  todayProgress: 60 * 60 * 1000, // 1 hour
};
