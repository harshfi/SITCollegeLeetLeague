import { db } from '@/lib/firebase/admin';
import { DailySnapshot, StudentStats } from '@/lib/types';
import { istDateKey } from '@/lib/utils';

const snapshotsRef = () => db.collection('dailySnapshots');

function docId(username: string, date: string): string {
  return `${username}_${date}`;
}

/**
 * Records (or overwrites) the day's snapshot of solved totals for a student.
 * Overwriting through the day means the doc holds that day's latest totals.
 */
export async function writeSnapshot(
  stats: Pick<
    StudentStats,
    'leetcodeUsername' | 'totalSolved' | 'easySolved' | 'mediumSolved' | 'hardSolved'
  >,
  date: string = istDateKey()
): Promise<void> {
  const snapshot: DailySnapshot = {
    leetcodeUsername: stats.leetcodeUsername,
    date,
    totalSolved: stats.totalSolved,
    easySolved: stats.easySolved,
    mediumSolved: stats.mediumSolved,
    hardSolved: stats.hardSolved,
    capturedAt: new Date(),
  };
  await snapshotsRef().doc(docId(stats.leetcodeUsername, date)).set(snapshot);
}

/** Returns a map of leetcodeUsername → snapshot for the given IST date key. */
export async function getSnapshotsForDate(
  date: string
): Promise<Map<string, DailySnapshot>> {
  const result = new Map<string, DailySnapshot>();
  const query = await snapshotsRef().where('date', '==', date).get();
  for (const doc of query.docs) {
    const data = doc.data() as DailySnapshot;
    result.set(data.leetcodeUsername, data);
  }
  return result;
}
