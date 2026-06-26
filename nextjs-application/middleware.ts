import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow access to /admin (PIN gate page - no auth required)
  if (pathname === '/admin') {
    return NextResponse.next();
  }

  // Allow access to /api/admin/verify-pin (PIN authentication endpoint)
  if (pathname === '/api/admin/verify-pin') {
    return NextResponse.next();
  }

  // Check for admin session cookie on protected routes
  const token = request.cookies.get('admin_session')?.value;

  if (!token) {
    // Redirect to PIN gate
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Verify JWT signature and expiry
  try {
    const jwtSecret = process.env.ADMIN_JWT_SECRET || 'default-secret';
    jwt.verify(token, jwtSecret);
    return NextResponse.next();
  } catch {
    // Token invalid or expired
    const response = NextResponse.redirect(
      new URL('/admin', request.url)
    );
    response.cookies.delete('admin_session');
    return response;
  }
}
