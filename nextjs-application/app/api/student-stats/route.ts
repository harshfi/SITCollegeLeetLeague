import { NextResponse } from 'next/server';
import { getAllStats } from '@/lib/services/statsService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const statsMap = await getAllStats();
    
    // Map is not directly JSON serializable, convert it to an object
    const statsObject = Object.fromEntries(statsMap.entries());

    return NextResponse.json({ data: statsObject });
  } catch (error) {
    console.error('Error fetching all stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
