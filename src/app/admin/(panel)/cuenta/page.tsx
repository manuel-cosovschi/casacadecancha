import { PageHeader } from '@/components/admin/ui';
import { PasswordChange } from './PasswordChange';
import { getCurrentProfile } from '@/lib/admin/auth';

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  return (
    <div className="space-y-5">
      <PageHeader title="Mi cuenta" description="Datos de tu acceso y seguridad." />

      <div className="card max-w-md p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Datos</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-navy/55">Email</dt>
            <dd className="font-medium text-navy">{profile?.email}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-navy/55">Rol</dt>
            <dd className="font-medium text-navy capitalize">{profile?.role}</dd>
          </div>
        </dl>
      </div>

      <PasswordChange />
    </div>
  );
}
