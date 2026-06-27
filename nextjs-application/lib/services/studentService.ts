import { supabase } from '@/lib/supabase/client';
import { Student, CreateStudentRequest, UpdateStudentRequest } from '@/lib/types';
import * as classService from '@/lib/services/classService';
import { normalizeLeetCodeUsername } from '@/lib/utils';

export async function getStudents(): Promise<Student[]> {
  const { data, error } = await supabase.from('students').select('*');
  if (error) throw error;
  return data.map((d: any) => ({
    ...d,
    createdAt: new Date(d.createdAt),
    updatedAt: new Date(d.updatedAt)
  })) as Student[];
}

export async function getStudentsByClassId(classId: string): Promise<Student[]> {
  const { data, error } = await supabase.from('students').select('*').eq('classId', classId);
  if (error) throw error;
  return data.map((d: any) => ({
    ...d,
    createdAt: new Date(d.createdAt),
    updatedAt: new Date(d.updatedAt)
  })) as Student[];
}

export async function getStudentById(studentId: string): Promise<Student | null> {
  const { data, error } = await supabase.from('students').select('*').eq('id', studentId).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt)
  } as Student;
}

export async function getStudentByUsername(leetcodeUsername: string): Promise<Student | null> {
  const { data, error } = await supabase.from('students').select('*').eq('leetcodeUsername', leetcodeUsername).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt)
  } as Student;
}

export async function createStudent(req: CreateStudentRequest): Promise<Student> {
  const classExists = await classService.getClassById(req.classId);
  if (!classExists) throw new Error(`Class ${req.classId} not found`);

  const leetcodeUsername = normalizeLeetCodeUsername(req.leetcodeUsername);
  
  const duplicate = await getStudentByUsername(leetcodeUsername);
  if (duplicate) throw new Error(`Username "${leetcodeUsername}" already exists`);

  const { data, error } = await supabase.from('students').insert([{
    ...req,
    leetcodeUsername
  }]).select().single();
  
  if (error) throw error;

  await classService.incrementStudentCount(req.classId, 1);

  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt)
  } as Student;
}

export async function updateStudent(studentId: string, req: UpdateStudentRequest): Promise<Student> {
  const existing = await getStudentById(studentId);
  if (!existing) throw new Error(`Student ${studentId} not found`);

  if (req.classId && req.classId !== existing.classId) {
    const newClassExists = await classService.getClassById(req.classId);
    if (!newClassExists) throw new Error(`Class ${req.classId} not found`);
    await classService.incrementStudentCount(existing.classId, -1);
    await classService.incrementStudentCount(req.classId, 1);
  }

  const payload: any = { ...req, updatedAt: new Date().toISOString() };
  if (req.leetcodeUsername) {
    payload.leetcodeUsername = normalizeLeetCodeUsername(req.leetcodeUsername);
  }

  const { data, error } = await supabase.from('students').update(payload).eq('id', studentId).select().single();
  if (error) throw error;

  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt)
  } as Student;
}

export async function deleteStudent(studentId: string): Promise<void> {
  const existing = await getStudentById(studentId);
  if (!existing) throw new Error(`Student ${studentId} not found`);

  await classService.incrementStudentCount(existing.classId, -1);
  const { error } = await supabase.from('students').delete().eq('id', studentId);
  if (error) throw error;
}
