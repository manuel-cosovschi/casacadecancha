// Tipos de dominio para Casaca de Cancha.

export type UserRole = 'owner' | 'admin' | 'operator' | 'viewer';
export type PaymentMethod = 'transfer' | 'mercadopago' | 'cash' | 'other';
export type PaymentStatus =
  | 'pending_payment'
  | 'payment_review'
  | 'paid'
  | 'refunded'
  | 'rejected'
  | 'cancelled';
export type OrderStatus =
  | 'new'
  | 'preparing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'exchanged';
export type SalesChannel =
  | 'web'
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'local'
  | 'referido'
  | 'familia'
  | 'otro';

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  model: string | null;
  sku: string | null;
  stock_physical: number;
  stock_reserved: number;
  encargo_reserved: number;
  stock_minimum: number;
  variant_cost: number | null;
  variant_price: number | null;
  active: boolean;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  unit_cost: number;
  packaging_cost: number;
  category_id: string | null;
  material: string | null;
  fabric: string | null;
  care: string | null;
  badge: string | null;
  active: boolean;
  featured: boolean;
  allow_backorder: boolean;
  hide_when_out_of_stock: boolean;
  transfer_discount: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  active: boolean;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sort_order: number;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  active: boolean;
  sort_order: number;
}

export interface SizeGuide {
  id: string;
  name: string;
  audience: string;
  measurements_json: { size: string; width: number; length: number }[];
  active: boolean;
  sort_order: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  estimated_cost: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  shipping_method: string | null;
  tracking_code: string | null;
  carrier: string | null;
  channel: SalesChannel;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string | null;
  size: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount: number;
  subtotal: number;
}

// --- Configuración del sitio (store_settings) ---
export interface AnnouncementBarSettings {
  active: boolean;
  messages: { text: string; active: boolean }[];
}

export interface HeroSettings {
  active: boolean;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  secondary_text: string;
  image_desktop: string;
  image_mobile: string;
  align: 'left' | 'center';
}

export interface TransferSettings {
  active: boolean;
  discount_percent: number;
  alias: string;
  cbu: string;
  holder: string;
  bank: string;
  cuit: string;
  text: string;
  instructions: string;
}

export interface MercadoPagoSettings {
  active: boolean;
  link: string;
  checkout_pro_active: boolean;
}

export interface WhatsAppSettings {
  active: boolean;
  number: string;
  default_message: string;
}

export interface ShippingSettings {
  national_active: boolean;
  pickup_active: boolean;
  pickup_text: string;
  coordinate_text: string;
  flat_rate: number;
  free_from: number;
  text: string;
  mdp_text?: string;
  nacional_note?: string;
}

// Item del carrito (cliente).
export interface CartItem {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  size: string;
  price: number;
  image: string | null;
  quantity: number;
  maxStock: number;
  /** Si el producto aplica al descuento por transferencia (default true). */
  transferEligible?: boolean;
}
