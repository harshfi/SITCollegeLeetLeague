'use client';

import { AdminHeader } from '@/components/admin/AdminHeader';
import { motion } from 'framer-motion';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-background">
      <AdminHeader />
      <motion.main 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {children}
      </motion.main>
    </div>
  );
}
