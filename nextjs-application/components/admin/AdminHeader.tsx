'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

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
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold tracking-tight transition-opacity hover:opacity-80">
            <img src="/logo.png" alt="SIT Logo" className="h-7 w-auto object-contain drop-shadow-sm" />
            <span>SIT LeetCode Tracker <span className="text-muted-foreground font-normal">· Admin</span></span>
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
          <ThemeToggle />
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
