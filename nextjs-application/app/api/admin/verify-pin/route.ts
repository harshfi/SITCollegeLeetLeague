import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { verifyPin } from '@/lib/pin';
import { VerifyPinRequest, VerifyPinResponse, ApiError } from '@/lib/types';

export async function POST(
  request: NextRequest
): Promise<NextResponse<VerifyPinResponse | ApiError>> {
  try {
    const body: VerifyPinRequest = await request.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json(
        { error: 'PIN is required', details: 'Provide pin in request body' },
        { status: 400 }
      );
    }

    const pinHash = process.env.ADMIN_PIN_HASH;
    if (!pinHash) {
      console.error('ADMIN_PIN_HASH not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const isValid = await verifyPin(pin, pinHash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Incorrect PIN' },
        { status: 401 }
      );
    }

    // Generate JWT token (8-hour expiry)
    const jwtSecret = process.env.ADMIN_JWT_SECRET || 'default-secret';
    const token = jwt.sign(
      { authenticated: true, timestamp: Date.now() },
      jwtSecret,
      { expiresIn: '8h' }
    );

    // Return response with HttpOnly cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
    });

    return response;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
