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
        <main className="flex-1 p-8 bg-background">
          {children}
        </main>
      </div>
    </AdminProviders>
  );
}
