import Link from 'next/link';
import { PageHeader } from '@/components/admin/ui';
import { ManualOrderForm } from './ManualOrderForm';

export default function ManualOrderPage() {
  return (
    <div>
      <PageHeader
        title="Pedido manual"
        description="Registrá ventas hechas por WhatsApp, Instagram, local, etc."
        action={<Link href="/admin/pedidos" className="text-sm text-navy/60 hover:text-navy">← Volver</Link>}
      />
      <ManualOrderForm />
    </div>
  );
}
