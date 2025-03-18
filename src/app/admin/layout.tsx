import { Sidebar } from './Sidebar';
import { AdminProviders } from './providers';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProviders>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </AdminProviders>
  );
}
