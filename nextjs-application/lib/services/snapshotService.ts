import { supabase } from '@/lib/supabase/client';
import { DailySnapshot, StudentStats } from '@/lib/types';
import { istDateKey } from '@/lib/utils';

export async function writeSnapshot(
  stats: Pick<StudentStats, 'leetcodeUsername' | 'totalSolved' | 'easySolved' | 'mediumSolved' | 'hardSolved'>,
  date: string = istDateKey()
): Promise<void> {
  const snapshot = {
    leetcodeUsername: stats.leetcodeUsername,
    date,
    totalSolved: stats.totalSolved,
    easySolved: stats.easySolved,
    mediumSolved: stats.mediumSolved,
    hardSolved: stats.hardSolved,
    capturedAt: new Date().toISOString()
  };
  
  // upsert on multiple columns requires the constraint name or comma separated columns in some versions.
  // We use `onConflict: 'leetcodeUsername,date'`
  const { error } = await supabase.from('dailySnapshots').upsert(snapshot, { onConflict: 'leetcodeUsername,date' });
  if (error) throw error;
}

export async function getSnapshotsForDate(date: string): Promise<Map<string, DailySnapshot>> {
  const result = new Map<string, DailySnapshot>();
  const { data, error } = await supabase.from('dailySnapshots').select('*').eq('date', date);
  if (error) throw error;
  
  for (const d of data) {
    result.set(d.leetcodeUsername, {
      ...d,
      capturedAt: d.capturedAt ? new Date(d.capturedAt) : new Date()
    } as DailySnapshot);
  }
  return result;
}
