import { PageHeader } from '@/components/admin/ui';
import { RoleSelect } from './RoleSelect';
import { getProfiles } from '@/lib/admin/data';
import { getCurrentProfile } from '@/lib/admin/auth';

export default async function UsersPage() {
  const [profiles, me] = await Promise.all([getProfiles(), getCurrentProfile()]);
  const canManage = me?.role === 'owner' || me?.role === 'admin';

  return (
    <div>
      <PageHeader title="Usuarios administradores" description="Gestioná los accesos y roles del panel." />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy/10 text-left text-navy/50">
              <th className="p-3">Nombre</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p: any) => (
              <tr key={p.id} className="border-b border-navy/5">
                <td className="p-3 font-medium">{p.name || '—'}</td>
                <td className="p-3 text-navy/60">{p.email}</td>
                <td className="p-3">
                  {canManage && p.id !== me?.id ? (
                    <RoleSelect userId={p.id} role={p.role} />
                  ) : (
                    <span className="badge bg-navy/10 text-navy">{p.role}</span>
                  )}
                </td>
                <td className="p-3">{p.active ? '✓ Activo' : '✗ Inactivo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mt-5 p-5 text-sm text-navy/70">
        <h2 className="mb-2 font-bold text-navy">¿Cómo agregar un administrador?</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Creá el usuario en Supabase → Authentication → Users → Add user.</li>
          <li>Al iniciar sesión por primera vez se crea su perfil automáticamente con rol <code>viewer</code>.</li>
          <li>Desde acá, un owner o admin puede elevar su rol.</li>
        </ol>
      </div>
    </div>
  );
}
