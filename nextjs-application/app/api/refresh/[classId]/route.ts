import { NextRequest, NextResponse } from 'next/server';
import * as studentService from '@/lib/services/studentService';
import * as classService from '@/lib/services/classService';
import { startRefreshJob } from '@/lib/refresh/refreshWorker';
import { verifyAdminSession } from '@/lib/auth';
import { RefreshResponse, ApiError } from '@/lib/types';

interface RouteParams {
  params: Promise<{ classId: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
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

    const { classId } = await params;

    // Verify class exists
    const classExists = await classService.getClassById(classId);
    if (!classExists) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Get all students in the class
    const students = await studentService.getStudentsByClassId(classId);
    const usernames = students.map((s) => s.leetcodeUsername);

    if (usernames.length === 0) {
      return NextResponse.json(
        { error: 'No students in this class' },
        { status: 400 }
      );
    }

    // Start the refresh job (non-blocking)
    const jobId = await startRefreshJob(usernames, classId);

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
