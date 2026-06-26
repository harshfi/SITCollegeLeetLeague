import { NextRequest, NextResponse } from 'next/server';
import { getRefreshJobStatus } from '@/lib/refresh/refreshWorker';
import { verifyAdminSession } from '@/lib/auth';
import { RefreshStatusResponse, ApiError } from '@/lib/types';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<RefreshStatusResponse | ApiError>> {
  try {
    // Verify admin session
    const isAdmin = await verifyAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { jobId } = await params;
    const job = await getRefreshJobStatus(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error fetching refresh job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}
