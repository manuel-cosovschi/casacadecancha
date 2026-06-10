'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { AdminProfile } from '@/lib/admin/auth';

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  operator: 'Operador',
  viewer: 'Lectura',
};

export function AdminHeader({ profile }: { profile: AdminProfile }) {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/admin/login');
  }

  return (
    <header className="flex items-center justify-between border-b border-navy/10 bg-white px-6 py-3">
      <Link href="/" target="_blank" className="text-sm font-medium text-navy/60 hover:text-navy">
        Ver tienda ↗
      </Link>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-navy">{profile.name || profile.email}</p>
          <p className="text-xs text-navy/50">{ROLE_LABEL[profile.role] || profile.role}</p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy hover:text-cream"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
