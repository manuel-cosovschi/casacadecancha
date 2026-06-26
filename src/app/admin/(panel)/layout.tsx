import { requireAdmin } from '@/lib/admin/auth';
import { Sidebar } from '@/components/admin/Sidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

// Siempre dinámico y por-usuario (nunca cachear el header/perfil entre cuentas).
export const dynamic = 'force-dynamic';

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-cream lg:flex-row">
      <Sidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader profile={profile} />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
