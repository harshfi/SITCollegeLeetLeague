import { NextRequest } from 'next/server';
import * as jwt from 'jsonwebtoken';

export async function verifyAdminSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('admin_session')?.value;

  if (!token) {
    return false;
  }

  try {
    jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'default-secret');
    return true;
  } catch {
    return false;
  }
}
