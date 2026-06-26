export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The root layout already renders the Navbar and the centered page container.
  // Middleware redirects unauthenticated users to /admin, so anyone reaching a
  // protected admin route is authenticated via the admin_session cookie.
  return <>{children}</>;
}
