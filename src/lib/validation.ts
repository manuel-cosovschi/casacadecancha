import { z } from 'zod';

export const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});

export const attributionSchema = z
  .object({
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_content: z.string().optional(),
    utm_term: z.string().optional(),
    fbclid: z.string().optional(),
    referrer: z.string().optional(),
    landing_page: z.string().optional(),
    device: z.string().optional(),
  })
  .partial();

export const checkoutSchema = z
  .object({
    first_name: z.string().min(2, 'Ingresá tu nombre'),
    last_name: z.string().min(2, 'Ingresá tu apellido'),
    phone: z.string().min(6, 'Ingresá tu WhatsApp'),
    email: z.string().email('Email inválido'),
    dni: z.string().optional(),
    province: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
    address: z.string().optional(),
    address_number: z.string().optional(),
    floor: z.string().optional(),
    references: z.string().optional(),
    shipping_method: z.enum(['mdp', 'nacional', 'retiro']),
    payment_method: z.enum(['transfer', 'mercadopago', 'cash']),
    coupon_code: z.string().optional(),
    notes: z.string().optional(),
    mdp_zone: z.string().optional(),
    shipping_cost: z.number().optional(),
    items: z.array(checkoutItemSchema).min(1, 'El carrito está vacío'),
    attribution: attributionSchema.optional(),
  })
  .superRefine((data, ctx) => {
    // Para envío al resto del país, los datos de envío son obligatorios.
    if (data.shipping_method === 'nacional') {
      if (!data.province || data.province.length < 2)
        ctx.addIssue({ code: 'custom', path: ['province'], message: 'Elegí tu provincia' });
      if (!data.city || data.city.length < 2)
        ctx.addIssue({ code: 'custom', path: ['city'], message: 'Ingresá tu ciudad' });
      if (!data.postal_code || data.postal_code.length < 3)
        ctx.addIssue({ code: 'custom', path: ['postal_code'], message: 'Ingresá tu código postal' });
      if (!data.address || data.address.length < 3)
        ctx.addIssue({ code: 'custom', path: ['address'], message: 'Ingresá tu dirección' });
      if (!data.address_number || data.address_number.length < 1)
        ctx.addIssue({ code: 'custom', path: ['address_number'], message: 'Ingresá la altura' });
    }
    // En Mar del Plata pedimos la dirección para calcular el envío por distancia.
    if (data.shipping_method === 'mdp') {
      if (!data.address || data.address.length < 3)
        ctx.addIssue({ code: 'custom', path: ['address'], message: 'Ingresá tu dirección' });
      if (!data.address_number || data.address_number.length < 1)
        ctx.addIssue({ code: 'custom', path: ['address_number'], message: 'Ingresá la altura' });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
