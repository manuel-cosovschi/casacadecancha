import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPreference, isMercadoPagoProEnabled } from '@/lib/mercadopago';

/** Crea una preference de Checkout Pro (monto dinámico) para un pedido. */
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
    supabase = await createClient();
  } catch {
    return NextResponse.json({ error: 'Backend no configurado.' }, { status: 500 });
  }

  // Lectura del pedido mediante la RPC pública SECURITY DEFINER (sin service role).
  const { data: order } = await supabase.rpc('storefront_get_order', {
    p_order_number: orderNumber,
  });
  if (!order) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  }

  const preference = await createPreference({
    orderNumber: order.order_number,
    items: [
      {
        title: `Pedido ${order.order_number} · Casaca de Cancha`,
        quantity: 1,
        unit_price: Number(order.total),
      },
    ],
    payerName: order.customer_name ?? undefined,
    payerEmail: order.customer_email ?? undefined,
  });

  if (!preference) {
    return NextResponse.json({ error: 'No se pudo crear la preferencia.' }, { status: 502 });
  }

  // Guardar el preference_id (RPC acotada).
  await supabase.rpc('mp_set_preference', {
    p_order_number: order.order_number,
    p_preference_id: preference.id,
  });

  return NextResponse.json({ init_point: preference.init_point, id: preference.id });
}
