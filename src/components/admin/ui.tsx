import Link from 'next/link';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">{title}</h1>
        {description && <p className="mt-1 text-sm text-navy/60">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'green' | 'amber' | 'red' | 'navy';
}) {
  const accentClass =
    accent === 'green'
      ? 'text-green-600'
      : accent === 'amber'
        ? 'text-amber-600'
        : accent === 'red'
          ? 'text-red-600'
          : 'text-navy';
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-navy/50">{label}</p>
      <p className={cn('mt-1 text-xl font-extrabold', accentClass)}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-navy/50">{hint}</p>}
    </div>
  );
}

export function AdminCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('card p-5', className)}>
      {title && <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">{title}</h2>}
      {children}
    </div>
  );
}

export function EmptyState({ message, cta }: { message: string; cta?: { label: string; href: string } }) {
  return (
    <div className="card p-10 text-center text-navy/60">
      <p>{message}</p>
      {cta && (
        <Link href={cta.href} className="btn-celeste mt-4 inline-flex">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  // payment
  pending_payment: 'bg-amber-100 text-amber-800',
  payment_review: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-purple-100 text-purple-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-navy/10 text-navy/60',
  // order
  new: 'bg-celeste/30 text-navy',
  preparing: 'bg-amber-100 text-amber-800',
  ready: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  returned: 'bg-orange-100 text-orange-800',
  exchanged: 'bg-purple-100 text-purple-800',
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pago pendiente',
  payment_review: 'Comprobante en revisión',
  paid: 'Pagado',
  refunded: 'Reembolsado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  new: 'Nuevo',
  preparing: 'Preparando',
  ready: 'Listo',
  shipped: 'Despachado',
  delivered: 'Entregado',
  returned: 'Devuelto',
  exchanged: 'Cambiado',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('badge', STATUS_STYLE[status] || 'bg-navy/10 text-navy')}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export { STATUS_LABEL };
