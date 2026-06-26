import { NextRequest, NextResponse } from 'next/server';
import * as classService from '@/lib/services/classService';
import { Class, CreateClassRequest, ApiError } from '@/lib/types';
import { verifyAdminSession } from '@/lib/auth';

export async function GET(): Promise<NextResponse<Class[] | ApiError>> {
  try {
    const classes = await classService.getClasses();
    return NextResponse.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<Class | ApiError>> {
  try {
    // Verify admin session
    const isAdmin = await verifyAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreateClassRequest = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Validation error', details: 'Class name is required' },
        { status: 400 }
      );
    }

    const newClass = await classService.createClass(body);
    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
