import { requireAdmin } from '@/lib/admin/auth';
import { Sidebar } from '@/components/admin/Sidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-cream lg:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader profile={profile} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
