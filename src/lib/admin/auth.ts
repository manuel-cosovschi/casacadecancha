import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types';

export interface AdminProfile {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  role: UserRole;
  active: boolean;
}

/** Devuelve el perfil del usuario logueado o null. */
export async function getCurrentProfile(): Promise<AdminProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, username, role, active')
    .eq('id', user.id)
    .maybeSingle();

  if (profile) return profile as AdminProfile;

  // Fallback: perfil mínimo si el trigger aún no creó el registro.
  return {
    id: user.id,
    name: user.email?.split('@')[0] ?? null,
    email: user.email ?? null,
    username: null,
    role: 'viewer',
    active: true,
  };
}

/** Roles con acceso total (dueño). El resto son vendedores con su propio workspace. */
export function isOwnerRole(role: UserRole): boolean {
  return role === 'owner' || role === 'admin';
}

/** id del usuario logueado (define su workspace de datos), o null. */
export async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Exige sesión de admin; redirige a login si no hay. */
export async function requireAdmin(): Promise<AdminProfile> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.active) {
    redirect('/admin/login');
  }
  return profile;
}

const WRITER_ROLES: UserRole[] = ['owner', 'admin', 'operator'];

export function canWrite(role: UserRole): boolean {
  return WRITER_ROLES.includes(role);
}
