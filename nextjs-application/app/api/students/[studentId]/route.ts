import { NextRequest, NextResponse } from 'next/server';
import * as studentService from '@/lib/services/studentService';
import { Student, UpdateStudentRequest, ApiError } from '@/lib/types';
import { verifyAdminSession } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ studentId: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<Student | ApiError>> {
  try {
    const { studentId } = await params;
    const student = await studentService.getStudentById(studentId);

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<Student | ApiError>> {
  try {
    // Verify admin session
    const isAdmin = await verifyAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { studentId } = await params;
    const studentExists = await studentService.getStudentById(studentId);

    if (!studentExists) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    const body: UpdateStudentRequest = await request.json();
    const updated = await studentService.updateStudent(studentId, body);

    return NextResponse.json(updated);
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Failed to update student', details: errorMsg },
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

    const { studentId } = await params;
    const studentExists = await studentService.getStudentById(studentId);

    if (!studentExists) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    await studentService.deleteStudent(studentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Failed to delete student', details: errorMsg },
      { status: 500 }
    );
  }
}
