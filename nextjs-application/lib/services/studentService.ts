import { db } from '@/lib/firebase/admin';
import {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
} from '@/lib/types';
import * as classService from '@/lib/services/classService';
import { normalizeLeetCodeUsername } from '@/lib/utils';

const studentsRef = () => db.collection('students');

export async function getStudents(): Promise<Student[]> {
  const snapshot = await studentsRef().get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  } as Student));
}

export async function getStudentsByClassId(classId: string): Promise<Student[]> {
  const snapshot = await studentsRef().where('classId', '==', classId).get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  } as Student));
}

export async function getStudentById(studentId: string): Promise<Student | null> {
  const snapshot = await studentsRef().doc(studentId).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data()!;
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Student;
}

export async function getStudentByUsername(
  leetcodeUsername: string
): Promise<Student | null> {
  const snapshot = await studentsRef()
    .where('leetcodeUsername', '==', leetcodeUsername)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Student;
}

export async function createStudent(req: CreateStudentRequest): Promise<Student> {
  // Verify class exists
  const classExists = await classService.getClassById(req.classId);
  if (!classExists) {
    throw new Error(`Class ${req.classId} not found`);
  }

  const leetcodeUsername = normalizeLeetCodeUsername(req.leetcodeUsername);

  // Enforce one student per LeetCode username so imports/manual adds can't
  // create duplicates (and re-running an import is safe).
  const duplicate = await getStudentByUsername(leetcodeUsername);
  if (duplicate) {
    throw new Error(`Username "${leetcodeUsername}" already exists`);
  }

  const docRef = await studentsRef().add({
    ...req,
    leetcodeUsername,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Increment student count in class
  await classService.incrementStudentCount(req.classId, 1);

  const snapshot = await docRef.get();
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  } as Student;
}

export async function updateStudent(
  studentId: string,
  req: UpdateStudentRequest
): Promise<Student> {
  const existing = await getStudentById(studentId);
  if (!existing) {
    throw new Error(`Student ${studentId} not found`);
  }

  // If classId changed, update counts in both classes
  if (req.classId && req.classId !== existing.classId) {
    const newClassExists = await classService.getClassById(req.classId);
    if (!newClassExists) {
      throw new Error(`Class ${req.classId} not found`);
    }
    await classService.incrementStudentCount(existing.classId, -1);
    await classService.incrementStudentCount(req.classId, 1);
  }

  await studentsRef().doc(studentId).update({
    ...req,
    ...(req.leetcodeUsername
      ? { leetcodeUsername: normalizeLeetCodeUsername(req.leetcodeUsername) }
      : {}),
    updatedAt: new Date(),
  });

  return getStudentById(studentId) as Promise<Student>;
}

export async function deleteStudent(studentId: string): Promise<void> {
  const existing = await getStudentById(studentId);
  if (!existing) {
    throw new Error(`Student ${studentId} not found`);
  }

  // Decrement student count in class
  await classService.incrementStudentCount(existing.classId, -1);

  await studentsRef().doc(studentId).delete();
}
