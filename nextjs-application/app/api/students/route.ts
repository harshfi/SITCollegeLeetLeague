import { NextRequest, NextResponse } from 'next/server';
import * as studentService from '@/lib/services/studentService';
import { Student, CreateStudentRequest, ApiError } from '@/lib/types';
import { verifyAdminSession } from '@/lib/auth';

export async function GET(
  request: NextRequest
): Promise<NextResponse<Student[] | ApiError>> {
  try {
    const classId = request.nextUrl.searchParams.get('classId');

    let students: Student[];
    if (classId) {
      students = await studentService.getStudentsByClassId(classId);
    } else {
      students = await studentService.getStudents();
    }

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
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

    const body: CreateStudentRequest = await request.json();

    if (!body.name || !body.classId || !body.leetcodeUsername) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details:
            'name, classId, and leetcodeUsername are required',
        },
        { status: 400 }
      );
    }

    const newStudent = await studentService.createStudent(body);
    return NextResponse.json(newStudent, { status: 201 });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Failed to create student', details: errorMsg },
      { status: 500 }
    );
  }
}
