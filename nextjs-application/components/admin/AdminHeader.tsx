'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function AdminHeader() {
  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      window.location.href = '/';
    }
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin/dashboard" className="font-semibold tracking-tight">
            LeetCode Tracker{' '}
            <span className="text-muted-foreground font-normal">· Admin</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/admin/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/admin/classes" className="hover:text-foreground">
              Classes
            </Link>
            <Link href="/admin/students" className="hover:text-foreground">
              Students
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View site
          </Link>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
