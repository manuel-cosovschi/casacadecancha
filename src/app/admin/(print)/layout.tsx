import { requireAdmin } from '@/lib/admin/auth';

/**
 * Layout para las hojas imprimibles (comprobantes y resumen de stock).
 * Sin sidebar ni header: lo que se ve es lo que sale en el PDF.
 */
export const dynamic = 'force-dynamic';

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="min-h-screen bg-navy/5 py-6 print:bg-white print:py-0">{children}</div>;
}
