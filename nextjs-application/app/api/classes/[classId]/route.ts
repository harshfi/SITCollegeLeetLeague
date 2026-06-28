import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import * as classService from '@/lib/services/classService';
import * as studentService from '@/lib/services/studentService';
import { Class, UpdateClassRequest, ApiError } from '@/lib/types';
import { verifyAdminSession } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ classId: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<Class | ApiError>> {
  try {
    const { classId } = await params;
    const classData = await classService.getClassById(classId);

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(classData);
  } catch (error) {
    console.error('Error fetching class:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
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

    const { classId } = await params;
    const classExists = await classService.getClassById(classId);

    if (!classExists) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    const body: UpdateClassRequest = await request.json();
    const updated = await classService.updateClass(classId, body);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json(
      { error: 'Failed to update class' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<{ success: boolean } | ApiError>> {
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
    const classExists = await classService.getClassById(classId);

    if (!classExists) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Delete all students in the class
    const students = await studentService.getStudentsByClassId(classId);
    for (const student of students) {
      // This will handle student cascade deletion
      const docRef = student.id;
      await studentService.deleteStudent(docRef);
    }

    // Delete the class
    await classService.deleteClass(classId);

    // Revalidate the public leaderboard cache to instantly remove the class
    revalidateTag('leaderboard');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    );
  }
}
