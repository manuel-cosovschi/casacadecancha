import { Suspense } from 'react';
import { LoginForm } from './LoginForm';
import { Logo } from '@/components/brand/Logo';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const metadata = {
  title: 'Acceso administrador',
  robots: { index: false },
};

export default function AdminLoginPage() {
  const configured = isSupabaseConfigured();
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo theme="dark" variant="stacked" />
        </div>
        <div className="card p-6">
          <h1 className="mb-1 text-xl font-bold">Panel de administración</h1>
          <p className="mb-5 text-sm text-navy/60">Ingresá con tu cuenta.</p>
          {configured ? (
            <Suspense>
              <LoginForm />
            </Suspense>
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Supabase no está configurado. Completá las variables de entorno
              para habilitar el acceso.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
