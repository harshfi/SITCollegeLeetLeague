import { db } from '@/lib/firebase/admin';
import { Class, CreateClassRequest, UpdateClassRequest } from '@/lib/types';

const classesRef = () => db.collection('classes');

export async function getClasses(): Promise<Class[]> {
  const snapshot = await classesRef().get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  } as Class));
}

export async function getClassById(classId: string): Promise<Class | null> {
  const snapshot = await classesRef().doc(classId).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data()!;
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Class;
}

export async function createClass(req: CreateClassRequest): Promise<Class> {
  const docRef = await classesRef().add({
    ...req,
    studentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const snapshot = await docRef.get();
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  } as Class;
}

export async function updateClass(
  classId: string,
  req: UpdateClassRequest
): Promise<Class> {
  await classesRef().doc(classId).update({
    ...req,
    updatedAt: new Date(),
  });

  return getClassById(classId) as Promise<Class>;
}

export async function deleteClass(classId: string): Promise<void> {
  // Cascade: remove all students belonging to this class, then the class itself.
  // (Batched in chunks to stay under Firestore's 500-op batch limit.)
  const studentsSnap = await db
    .collection('students')
    .where('classId', '==', classId)
    .get();

  const docs = studentsSnap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + 450)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  await classesRef().doc(classId).delete();
}

export async function incrementStudentCount(
  classId: string,
  delta: number
): Promise<void> {
  const snapshot = await classesRef().doc(classId).get();

  if (!snapshot.exists) {
    throw new Error(`Class ${classId} not found`);
  }

  const currentCount = snapshot.data()!.studentCount || 0;
  await classesRef().doc(classId).update({
    studentCount: Math.max(0, currentCount + delta),
    updatedAt: new Date(),
  });
}
