import { NextRequest, NextResponse } from 'next/server';
import * as statsService from '@/lib/services/statsService';
import * as studentService from '@/lib/services/studentService';
import { fetchLeetCodeStats } from '@/lib/leetcode/fetcher';
import { StudentStatsResponse, ApiError } from '@/lib/types';

interface RouteParams {
  params: Promise<{ username: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<StudentStatsResponse | ApiError>> {
  try {
    const { username } = await params;

    // Try to get from cache first
    let stats = await statsService.getStats(username);

    const isStale = statsService.isStale(
      stats,
      statsService.STALE_THRESHOLDS.general
    );

    if (!stats || isStale) {
      // Fetch from LeetCode
      try {
        const freshStats = await fetchLeetCodeStats(username);

        // Get student info to link stats with student
        const student = await studentService.getStudentByUsername(username);
        if (!student) {
          // Student doesn't exist in our system yet, but we still cache the stats
          freshStats.studentId = '';
        } else {
          freshStats.studentId = student.id;
        }

        // Save to Firestore
        await statsService.upsertStats(username, freshStats, freshStats.studentId);
        stats = freshStats;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';

        // Record the error in Firestore
        await statsService.recordFetchError(username, errorMsg);

        // If we have cached data, return it with error indicator
        if (stats) {
          return NextResponse.json(
            {
              data: stats,
              cached: true,
              fetchedAt: stats.lastFetchedAt.toISOString(),
            },
            { status: 206 } // Partial content
          );
        }

        return NextResponse.json(
          { error: 'Failed to fetch LeetCode stats', details: errorMsg },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      data: stats,
      cached: !isStale,
      fetchedAt: stats.lastFetchedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error in student-stats endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
