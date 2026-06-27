import { NextRequest, NextResponse } from 'next/server';
import * as studentService from '@/lib/services/studentService';
import { startRefreshJob } from '@/lib/refresh/refreshWorker';

// Allow the full refresh to run within the request (cron has no UI to poll).
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Daily scheduled refresh. Configured via vercel.json cron, which sends
 * `Authorization: Bearer <CRON_SECRET>`. Refreshes every student's stats and
 * writes a daily snapshot, building the history that powers Today/This Week.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const students = await studentService.getStudents();
    const usernames = students.map((s) => s.leetcodeUsername);

    if (usernames.length === 0) {
      return NextResponse.json({ status: 'no-students' });
    }

    const jobId = await startRefreshJob(usernames, 'all', { wait: true });
    // The leaderboard cache (300s TTL) self-heals shortly after this refresh.
    return NextResponse.json({ status: 'complete', jobId, count: usernames.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cron daily refresh failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
