import { NextRequest, NextResponse } from 'next/server';
import * as studentService from '@/lib/services/studentService';
import { startRefreshJob } from '@/lib/refresh/refreshWorker';
import { verifyAdminSession } from '@/lib/auth';
import { RefreshResponse, ApiError } from '@/lib/types';

export async function POST(
  request: NextRequest
): Promise<NextResponse<RefreshResponse | ApiError>> {
  try {
    // Verify admin session
    const isAdmin = await verifyAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all students
    const students = await studentService.getStudents();
    const usernames = students.map((s) => s.leetcodeUsername);

    if (usernames.length === 0) {
      return NextResponse.json(
        { error: 'No students to refresh' },
        { status: 400 }
      );
    }

    // Start the refresh job (non-blocking)
    const jobId = await startRefreshJob(usernames, 'all');

    return NextResponse.json(
      { jobId, status: 'started' },
      { status: 202 } // Accepted - processing async
    );
  } catch (error) {
    console.error('Error starting refresh job:', error);
    return NextResponse.json(
      { error: 'Failed to start refresh job' },
      { status: 500 }
    );
  }
}
