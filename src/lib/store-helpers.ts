import { getAllSettings } from '@/lib/settings';

/** Devuelve el % de descuento por transferencia vigente (0 si está inactivo). */
export async function getTransferDiscount(): Promise<number> {
  const settings = await getAllSettings();
  return settings.payments_transfer?.active
    ? settings.payments_transfer.discount_percent || 0
    : 0;
}
