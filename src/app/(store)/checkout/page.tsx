import type { Metadata } from 'next';
import { CheckoutForm } from './CheckoutForm';
import { getAllSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false },
};

export default async function CheckoutPage() {
  const settings = await getAllSettings();
  const transferDiscount = settings.payments_transfer?.active
    ? settings.payments_transfer.discount_percent || 0
    : 0;
  const transferText =
    settings.payments_transfer?.text ||
    (transferDiscount > 0
      ? `Pagando por transferencia obtenés un ${transferDiscount}% de descuento.`
      : 'Pagá por transferencia bancaria y envianos el comprobante por WhatsApp.');

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-3xl font-extrabold uppercase">Finalizar compra</h1>
      <CheckoutForm
        transferDiscount={transferDiscount}
        transferText={transferText}
        shipping={settings.shipping}
        shippingCalc={settings.shipping_calc}
      />
    </div>
  );
}
