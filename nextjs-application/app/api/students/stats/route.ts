import { NextResponse } from 'next/server';
import * as statsService from '@/lib/services/statsService';
import { ApiError } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Returns every student's cached stats in one read pass, keyed by LeetCode
 * username. Used by the admin Students page so it doesn't hit
 * /api/student-stats once per student (which also risks triggering a
 * refetch+write per student when stats are stale).
 * The (heavy) submissionCalendar is stripped — the admin table doesn't need it.
 */
export async function GET(): Promise<NextResponse<Record<string, unknown> | ApiError>> {
  try {
    const map = await statsService.getAllStats();
    const out: Record<string, unknown> = {};
    for (const [username, stats] of map) {
      const { submissionCalendar, ...rest } = stats;
      void submissionCalendar;
      out[username] = rest;
    }
    return NextResponse.json(out);
  } catch (error) {
    console.error('Error fetching bulk stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
