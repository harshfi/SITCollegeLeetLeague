import { db } from '@/lib/firebase/admin';
import * as statsService from '@/lib/services/statsService';
import * as studentService from '@/lib/services/studentService';
import * as snapshotService from '@/lib/services/snapshotService';
import { fetchMultipleUsersWithRateLimit } from '@/lib/leetcode/rate-limiter';
import { RefreshJob } from '@/lib/types';

const jobsRef = () => db.collection('refreshJobs');

export async function startRefreshJob(
  usernames: string[],
  classId: string | 'all',
  options: { wait?: boolean } = {}
): Promise<string> {
  const jobRef = await jobsRef().add({
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

  if (options.wait) {
    // Synchronous run (used by the cron job, where background work would be
    // killed once the response is sent).
    await processRefreshJob(jobId, usernames);
  } else {
    // Background run (admin-triggered): returns immediately, UI polls status.
    processRefreshJob(jobId, usernames).catch((error) => {
      console.error(`Error in refresh job ${jobId}:`, error);
    });
  }

  return jobId;
}

async function processRefreshJob(
  jobId: string,
  usernames: string[]
): Promise<void> {
  const jobRef = jobsRef().doc(jobId);

  try {
    // Map usernames → studentId so stats are linked to the right student.
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
        // Capture today's snapshot for time-window calculations.
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

      // Incremental progress so the admin UI can poll a live count.
      await jobRef.update({ processed, errors, errorMessages });
    });

    await jobRef.update({
      processed,
      errors,
      completedAt: new Date(),
      status: errors > 0 ? 'partial' : 'complete',
      errorMessages,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Refresh job ${jobId} failed:`, error);

    await jobRef.update({
      status: 'partial',
      completedAt: new Date(),
      errorMessages: [errorMsg],
    });
  }
}

export async function getRefreshJobStatus(
  jobId: string
): Promise<RefreshJob | null> {
  const snapshot = await jobsRef().doc(jobId).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data()!;
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
