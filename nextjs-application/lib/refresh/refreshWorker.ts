import { db } from '@/lib/firebase/admin';
import * as statsService from '@/lib/services/statsService';
import {
  fetchMultipleUsersWithRateLimit,
} from '@/lib/leetcode/rate-limiter';
import { RefreshJob } from '@/lib/types';

export async function startRefreshJob(
  usernames: string[],
  classId: string | 'all'
): Promise<string> {
  // Create a new refresh job document
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jobsCollection = (db as any).collection('refreshJobs');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jobRef = await jobsCollection.add({
    classId,
    triggeredAt: new Date(),
    completedAt: null,
    totalStudents: usernames.length,
    processed: 0,
    errors: 0,
    status: 'running' as const,
    errorMessages: [],
  });

  const jobId = jobRef.id;

  // Start the fetch process asynchronously (non-blocking)
  processRefreshJob(jobId, usernames).catch((error) => {
    console.error(`Error in refresh job ${jobId}:`, error);
  });

  return jobId;
}

async function processRefreshJob(
  jobId: string,
  usernames: string[]
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jobRef = (db as any).collection('refreshJobs').doc(jobId);

  try {
    // Use rate-limited batch fetching
    const results = await fetchMultipleUsersWithRateLimit(usernames);

    let processed = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    // Process results and update stats
    for (const result of results) {
      if (result.stats) {
        await statsService.upsertStats(result.username, result.stats, '');
        processed++;
      } else if (result.error) {
        await statsService.recordFetchError(result.username, result.error);
        errors++;
        errorMessages.push(`${result.username}: ${result.error}`);
      }
    }

    // Mark job as complete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (jobRef as any).update({
      processed,
      errors,
      completedAt: new Date(),
      status: errors > 0 ? 'partial' : 'complete',
      errorMessages: errorMessages.slice(0, 10), // Keep first 10 errors
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`Refresh job ${jobId} failed:`, error);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (jobRef as any).update({
      status: 'partial',
      completedAt: new Date(),
      errorMessages: [errorMsg],
    });
  }
}

export async function getRefreshJobStatus(jobId: string): Promise<RefreshJob | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snapshot = await (db as any).collection('refreshJobs').doc(jobId).get();

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    id: snapshot.id,
    classId: data.classId,
    triggeredAt: data.triggeredAt?.toDate() || new Date(),
    completedAt: data.completedAt?.toDate() || undefined,
    totalStudents: data.totalStudents,
    processed: data.processed,
    errors: data.errors,
    status: data.status,
    errorMessages: data.errorMessages,
  } as RefreshJob;
}
