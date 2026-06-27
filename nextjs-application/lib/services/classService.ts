import { supabase } from '@/lib/supabase/client';
import { Class, CreateClassRequest, UpdateClassRequest } from '@/lib/types';

export async function getClasses(): Promise<Class[]> {
  const { data, error } = await supabase.from('classes').select('*');
  if (error) throw error;
  return data.map((d: any) => ({
    ...d,
    createdAt: new Date(d.createdAt),
    updatedAt: new Date(d.updatedAt)
  })) as Class[];
}

export async function getClassById(classId: string): Promise<Class | null> {
  const { data, error } = await supabase.from('classes').select('*').eq('id', classId).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt)
  } as Class;
}

export async function createClass(req: CreateClassRequest): Promise<Class> {
  const { data, error } = await supabase.from('classes').insert([req]).select().single();
  if (error) throw error;
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt)
  } as Class;
}

export async function updateClass(classId: string, req: UpdateClassRequest): Promise<Class> {
  const { data, error } = await supabase.from('classes').update({
    ...req,
    updatedAt: new Date().toISOString()
  }).eq('id', classId).select().single();
  if (error) throw error;
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt)
  } as Class;
}

export async function deleteClass(classId: string): Promise<void> {
  const { error } = await supabase.from('classes').delete().eq('id', classId);
  if (error) throw error;
}

export async function incrementStudentCount(classId: string, by: number): Promise<void> {
  const current = await getClassById(classId);
  if (!current) return;
  await supabase.from('classes').update({ studentCount: current.studentCount + by }).eq('id', classId);
}
