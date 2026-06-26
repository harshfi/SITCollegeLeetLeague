'use client';

export function useAdminSession(): boolean {
  // The actual verification happens in middleware
  // This is just for client-side checks if needed
  if (typeof window === 'undefined') {
    return false;
  }

  const cookies = document.cookie
    .split(';')
    .map((c) => c.trim())
    .filter((c) => c.startsWith('admin_session='));

  return cookies.length > 0;
}
