import { AdminHeader } from '@/components/admin/AdminHeader';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-muted/30">
      <AdminHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
