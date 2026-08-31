import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Logo } from '@/components/brand/Logo';
import { ResetForm } from './ResetForm';

export const metadata: Metadata = {
  title: 'Nueva contraseña',
  robots: { index: false, follow: false },
};

export default function RecuperarPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lift">
        <div className="mb-5 flex justify-center">
          <Logo theme="light" variant="stacked" />
        </div>
        <h1 className="text-center text-lg font-extrabold text-navy">Poné una contraseña nueva</h1>
        <Suspense>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
