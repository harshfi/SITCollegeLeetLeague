import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              LeetCode Tracker
            </Link>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Classes
            </Link>
            <Link
              href="/admin/dashboard"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
