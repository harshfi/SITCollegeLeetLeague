import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { verifyPin, hashPin } from '@/lib/pin';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin session
    const token = request.cookies.get('admin_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const jwtSecret = process.env.ADMIN_JWT_SECRET || 'default-secret';
      jwt.verify(token, jwtSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // 2. Parse request body
    const { currentPin, newPin } = await request.json();
    if (!currentPin || !newPin) {
      return NextResponse.json({ error: 'Missing current PIN or new PIN' }, { status: 400 });
    }

    // 3. Verify current PIN
    let pinHash = process.env.ADMIN_PIN_HASH;
    
    // Fallback: Read directly from .env.local in case process.env is stale
    try {
      const fsSync = require('fs');
      const envPath = path.join(process.cwd(), '.env.local');
      if (fsSync.existsSync(envPath)) {
        const envContent = fsSync.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/^ADMIN_PIN_HASH=(.*)$/m);
        if (match && match[1]) {
          pinHash = match[1].trim();
        }
      }
    } catch (e) {
      console.error('Failed to read .env.local directly:', e);
    }

    if (!pinHash) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const isValid = await verifyPin(currentPin, pinHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect current PIN' }, { status: 400 });
    }

    // 4. Hash new PIN
    const newHash = await hashPin(newPin);

    // 5. Update environment variable in memory (for immediate effect without restart)
    process.env.ADMIN_PIN_HASH = newHash;

    // 6. Persist to .env.local file
    const envPath = path.join(process.cwd(), '.env.local');
    try {
      let envContent = await fs.readFile(envPath, 'utf-8');
      
      if (envContent.includes('ADMIN_PIN_HASH=')) {
        envContent = envContent.replace(/ADMIN_PIN_HASH=.*/, `ADMIN_PIN_HASH=${newHash}`);
      } else {
        envContent += `\nADMIN_PIN_HASH=${newHash}\n`;
      }
      
      await fs.writeFile(envPath, envContent, 'utf-8');
    } catch (fileError) {
      console.error('Failed to write to .env.local:', fileError);
      return NextResponse.json(
        { error: 'Failed to save new PIN persistently. It may reset on server restart.' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change PIN error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
