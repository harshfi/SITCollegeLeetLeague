import { supabase } from '@/lib/supabase/client';
import { StudentStats } from '@/lib/types';

export const STALE_THRESHOLDS = {
  general: 1000 * 60 * 60 * 2, // 2 hours
  error: 1000 * 60 * 30, // 30 mins
};

export function isStale(stats: StudentStats | null, defaultThreshold: number = STALE_THRESHOLDS.general): boolean {
  if (!stats?.lastFetchedAt) return true;
  const age = Date.now() - stats.lastFetchedAt.getTime();
  const threshold = stats.fetchStatus === 'error' ? STALE_THRESHOLDS.error : defaultThreshold;
  return age > threshold;
}

export async function upsertStats(leetcodeUsername: string, stats: StudentStats, studentId?: string): Promise<void> {
  const payload = {
    ...stats,
    leetcodeUsername,
    studentId: studentId || stats.studentId,
    lastFetchedAt: stats.lastFetchedAt ? stats.lastFetchedAt.toISOString() : new Date().toISOString()
  };
  const { error } = await supabase.from('studentStats').upsert(payload, { onConflict: 'leetcodeUsername' });
  if (error) throw error;
}

export async function recordFetchError(leetcodeUsername: string, errorMsg: string): Promise<void> {
  await supabase.from('studentStats').update({
    fetchStatus: 'error',
    lastFetchError: errorMsg,
    lastFetchedAt: new Date().toISOString()
  }).eq('leetcodeUsername', leetcodeUsername);
}

export async function getStats(leetcodeUsername: string): Promise<StudentStats | null> {
  const { data, error } = await supabase.from('studentStats').select('*').eq('leetcodeUsername', leetcodeUsername).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return {
    ...data,
    lastFetchedAt: data.lastFetchedAt ? new Date(data.lastFetchedAt) : new Date()
  } as StudentStats;
}

export async function getAllStats(): Promise<Map<string, StudentStats>> {
  const result = new Map<string, StudentStats>();
  const { data, error } = await supabase.from('studentStats').select('*');
  if (error) throw error;
  
  for (const d of data) {
    result.set(d.leetcodeUsername, {
      ...d,
      lastFetchedAt: d.lastFetchedAt ? new Date(d.lastFetchedAt) : new Date()
    } as StudentStats);
  }
  return result;
}
