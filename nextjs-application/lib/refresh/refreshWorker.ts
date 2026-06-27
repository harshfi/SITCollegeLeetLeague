import { supabase } from '@/lib/supabase/client';
import * as statsService from '@/lib/services/statsService';
import * as studentService from '@/lib/services/studentService';
import * as snapshotService from '@/lib/services/snapshotService';
import { fetchMultipleUsersWithRateLimit } from '@/lib/leetcode/rate-limiter';
import { RefreshJob } from '@/lib/types';

export async function startRefreshJob(
  usernames: string[],
  classId: string | 'all',
  options: { wait?: boolean } = {}
): Promise<string> {
  const { data, error } = await supabase.from('refreshJobs').insert([{
    classId,
    triggeredAt: new Date().toISOString(),
    completedAt: null,
    totalStudents: usernames.length,
    processed: 0,
    errors: 0,
    status: 'running',
    errorMessages: [],
  }]).select().single();

  if (error) throw error;
  const jobId = data.id;

  if (options.wait) {
    await processRefreshJob(jobId, usernames);
  } else {
    processRefreshJob(jobId, usernames).catch((err) => {
      console.error(`Error in refresh job ${jobId}:`, err);
    });
  }

  return jobId;
}

async function processRefreshJob(
  jobId: string,
  usernames: string[]
): Promise<void> {
  try {
    const students = await studentService.getStudents();
    const studentIdByUsername = new Map(
      students.map((s) => [s.leetcodeUsername, s.id])
    );

    let processed = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    await fetchMultipleUsersWithRateLimit(usernames, async (result) => {
      if (result.stats) {
        const studentId = studentIdByUsername.get(result.username) || '';
        await statsService.upsertStats(result.username, result.stats, studentId);
        await snapshotService.writeSnapshot({
          leetcodeUsername: result.username,
          totalSolved: result.stats.totalSolved,
          easySolved: result.stats.easySolved,
          mediumSolved: result.stats.mediumSolved,
          hardSolved: result.stats.hardSolved,
        });
        processed++;
      } else if (result.error) {
        await statsService.recordFetchError(result.username, result.error);
        errors++;
        if (errorMessages.length < 10) {
          errorMessages.push(`${result.username}: ${result.error}`);
        }
      }

      await supabase.from('refreshJobs').update({ processed, errors, errorMessages }).eq('id', jobId);
    });

    await supabase.from('refreshJobs').update({
      processed,
      errors,
      completedAt: new Date().toISOString(),
      status: errors > 0 ? 'partial' : 'complete',
      errorMessages,
    }).eq('id', jobId);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Refresh job ${jobId} failed:`, error);

    await supabase.from('refreshJobs').update({
      status: 'partial',
      completedAt: new Date().toISOString(),
      errorMessages: [errorMsg],
    }).eq('id', jobId);
  }
}

export async function getRefreshJobStatus(
  jobId: string
): Promise<RefreshJob | null> {
  const { data, error } = await supabase.from('refreshJobs').select('*').eq('id', jobId).single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    ...data,
    triggeredAt: new Date(data.triggeredAt),
    completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
  } as RefreshJob;
}
