import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPreference, isMercadoPagoProEnabled } from '@/lib/mercadopago';

/** Crea una preference de Checkout Pro para un pedido existente. */
export async function POST(request: Request) {
  if (!isMercadoPagoProEnabled()) {
    return NextResponse.json({ error: 'Checkout Pro no está configurado.' }, { status: 400 });
  }

  let orderNumber: string;
  try {
    const body = await request.json();
    orderNumber = body.orderNumber;
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }
  if (!orderNumber) {
    return NextResponse.json({ error: 'Falta el número de pedido.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'Backend no configurado.' }, { status: 500 });
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, total, customer_name, customer_email, order_items(product_name, quantity, unit_price)')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  }

  // Si hay descuentos/envío, ajustamos para que el total de la preference coincida.
  const items =
    (order.order_items ?? []).length > 0
      ? (order.order_items as any[]).map((i) => ({
          title: i.product_name || 'Producto',
          quantity: i.quantity,
          unit_price: i.unit_price,
        }))
      : [{ title: `Pedido ${order.order_number}`, quantity: 1, unit_price: order.total }];

  // Reemplazamos por una sola línea con el total real (incluye descuentos/envío).
  const preferenceItems = [
    { title: `Pedido ${order.order_number} · Casaca de Cancha`, quantity: 1, unit_price: Number(order.total) },
  ];

  const preference = await createPreference({
    orderNumber: order.order_number,
    items: preferenceItems.length ? preferenceItems : items,
    payerName: order.customer_name ?? undefined,
    payerEmail: order.customer_email ?? undefined,
  });

  if (!preference) {
    return NextResponse.json({ error: 'No se pudo crear la preferencia.' }, { status: 502 });
  }

  await supabase
    .from('payments')
    .update({ external_payment_id: preference.id })
    .eq('order_id', order.id);

  return NextResponse.json({ init_point: preference.init_point, id: preference.id });
}
