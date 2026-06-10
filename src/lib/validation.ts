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

export const checkoutSchema = z.object({
  first_name: z.string().min(2, 'Ingresá tu nombre'),
  last_name: z.string().min(2, 'Ingresá tu apellido'),
  phone: z.string().min(6, 'Ingresá tu WhatsApp'),
  email: z.string().email('Email inválido'),
  dni: z.string().optional(),
  province: z.string().min(2, 'Elegí tu provincia'),
  city: z.string().min(2, 'Ingresá tu ciudad'),
  postal_code: z.string().optional(),
  address: z.string().optional(),
  address_number: z.string().optional(),
  floor: z.string().optional(),
  references: z.string().optional(),
  shipping_method: z.enum(['nacional', 'retiro', 'coordinar']),
  payment_method: z.enum(['transfer', 'mercadopago']),
  coupon_code: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(checkoutItemSchema).min(1, 'El carrito está vacío'),
  attribution: attributionSchema.optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
