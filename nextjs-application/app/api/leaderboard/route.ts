import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/services/leaderboardService';
import { LeaderboardData, TimeWindow, ApiError } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_WINDOWS: TimeWindow[] = ['all', 'today', 'week', 'date'];

export async function GET(
  request: NextRequest
): Promise<NextResponse<LeaderboardData | ApiError>> {
  try {
    const param = request.nextUrl.searchParams.get('window') || 'all';
    const window = (VALID_WINDOWS.includes(param as TimeWindow)
      ? param
      : 'all') as TimeWindow;
    const date = request.nextUrl.searchParams.get('date') || undefined;

    const data = await getLeaderboard(window, date);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error building leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to build leaderboard' },
      { status: 500 }
    );
  }
}
