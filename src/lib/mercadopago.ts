// Integración con Mercado Pago Checkout Pro (REST API, sin SDK).
// Sólo se activa si MERCADOPAGO_ACCESS_TOKEN está configurado.

const MP_API = 'https://api.mercadopago.com';

export function isMercadoPagoProEnabled() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
}

interface CreatePreferenceArgs {
  orderNumber: string;
  items: PreferenceItem[];
  payerName?: string;
  payerEmail?: string;
  /**
   * A dónde vuelve la persona después de pagar, sin el dominio.
   *
   * Por defecto vuelve a la página del pedido, que es lo que hace falta el 99%
   * de las veces. La cuota del carnet de socio no es un pedido —no tiene número
   * ni página propia— así que necesita volver a otro lado.
   */
  backPath?: string;
}

/** Crea una preference de Checkout Pro y devuelve el init_point. */
export async function createPreference({
  orderNumber,
  items,
  payerName,
  payerEmail,
  backPath,
}: CreatePreferenceArgs): Promise<{ id: string; init_point: string } | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const volver = backPath ?? `/pedido/${orderNumber}`;
  // El destino puede traer sus propios parámetros (la cuota de socio vuelve con
  // el id del carnet). Sin esto quedaba `?s=xxx?method=...` y el segundo `?`
  // rompe la dirección entera.
  const sep = volver.includes('?') ? '&' : '?';

  const body = {
    items: items.map((i) => ({
      title: i.title,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      currency_id: 'ARS',
    })),
    external_reference: orderNumber,
    payer: payerEmail ? { name: payerName, email: payerEmail } : undefined,
    back_urls: {
      success: `${siteUrl}${volver}${sep}method=mercadopago&status=success`,
      pending: `${siteUrl}${volver}${sep}method=mercadopago&status=pending`,
      failure: `${siteUrl}${volver}${sep}method=mercadopago&status=failure`,
    },
    auto_return: 'approved',
    notification_url: `${siteUrl}/api/mercadopago/webhook`,
    statement_descriptor: 'CASACADECANCHA',
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return { id: data.id, init_point: data.init_point };
}

/** Consulta un pago por ID. */
export async function getPayment(paymentId: string): Promise<{
  status: string;
  external_reference: string;
  id: string;
} | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    status: data.status,
    external_reference: data.external_reference,
    id: String(data.id),
  };
}
