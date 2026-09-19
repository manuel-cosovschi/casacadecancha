import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { availableStock } from '@/lib/utils';
import { withSalePricing } from '@/lib/sale';
import { withPromoLinea } from '@/lib/promo-linea';
import { compararTalles } from '@/lib/talles';
import type { Collection, FAQ, Product } from '@/lib/types';

/**
 * Las columnas que lee la tienda, escritas una por una y no con `*`.
 *
 * Tiene que ser así desde que los costos dejaron de ser públicos: la clave
 * anónima ya no tiene permiso sobre `unit_cost`, `packaging_cost` ni
 * `variant_cost`, y `select('*')` los pide igual porque el asterisco se expande
 * a TODAS las columnas. Postgres rechaza la consulta entera con "permission
 * denied for table products" y el catálogo vuelve vacío, sin error a la vista:
 * la página dice "pronto vas a encontrar productos" como si no hubiera nada
 * cargado.
 *
 * O sea: agregar una columna a `products` no la hace aparecer acá sola. Si es
 * pública, hay que sumarla a esta lista Y darle permiso a `anon` en la
 * migración. Es más trabajo que un asterisco, y es el precio de que los costos
 * no viajen al navegador de cualquiera que entre.
 *
 * Va todo en una sola línea, y escrito a mano, porque el cliente de Supabase
 * saca los tipos del TEXTO del select: si se arma juntando un array en tiempo
 * de ejecución queda como un `string` cualquiera, no lo puede leer, y la
 * consulta entera termina tipada como error.
 */
const PRODUCT_SELECT =
  'id,name,slug,short_description,description,price,compare_at_price,category_id,material,fabric,care,badge,active,featured,allow_backorder,hide_when_out_of_stock,sort_order,seo_title,seo_description,created_at,updated_at,transfer_discount,preorder,mystery_box,mystery_qty,images:product_images(*),variants:product_variants(id,product_id,size,color,model,sku,stock_physical,stock_reserved,stock_minimum,variant_price,active,sort_order,created_at,encargo_reserved)';

/**
 * Pasa las filas que vuelven de la base a productos de la tienda.
 *
 * El casteo existe porque `Product` declara `unit_cost` y `packaging_cost` como
 * obligatorios —el panel los usa— y la tienda ya no los recibe. No es que se
 * pierdan: nunca salen de la base para la clave anónima, que es justamente lo
 * que queremos. Ninguna pantalla de la tienda los muestra.
 */
function aProductos(data: unknown): Product[] {
  return ((data ?? []) as Product[]).map(sortProduct);
}

/**
 * Ordena imágenes y talles, y aplica las promos vigentes. Es el único punto por
 * el que el storefront lee productos, así que alcanza con descontar acá para
 * que el precio de promo salga igual en el catálogo, la ficha y el carrito.
 *
 * Primero la promo de línea (precio fijo) y después la del catálogo
 * (porcentaje), en ese orden: si estuviera al revés, el precio fijo pisaría el
 * porcentaje y la promo del sitio no se notaría en esos productos.
 */
function sortProduct(p: Product): Product {
  if (p.images) p.images.sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  // Por el talle y no por `sort_order`: ese número se escribe a mano y una
  // variante creada sin tocarlo se iba al principio de la lista.
  if (p.variants) p.variants.sort((a, b) => compararTalles(a.size, b.size));
  return withSalePricing(withPromoLinea(p));
}

export async function getActiveProducts(limit = 24): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);
  return aProductos(data);
}

/** Productos activos que tienen al menos un talle con stock disponible. Devuelve todos. */
export async function getInStockProducts(limit = 100): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);
  const products = aProductos(data);
  return products.filter((p) =>
    (p.variants ?? []).some((v) => availableStock(v) > 0),
  );
}

export async function getFeaturedProduct(): Promise<Product | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .eq('featured', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? sortProduct(data as unknown as Product) : null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  return data ? sortProduct(data as unknown as Product) : null;
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  limit = 4,
): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  let q = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .neq('id', productId)
    .limit(limit);
  if (categoryId) q = q.eq('category_id', categoryId);
  const { data } = await q;
  return aProductos(data);
}

export async function getProductsByCategorySlug(slug: string): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (!cat) return [];
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .eq('category_id', cat.id)
    .order('sort_order', { ascending: true });
  return aProductos(data);
}

/** Productos activos en preventa (los que están por llegar). */
export async function getPreorderProducts(limit = 8): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .eq('preorder', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);
  return aProductos(data);
}

/** Las Mystery Box activas, ordenadas por precio (menor a mayor). */
export async function getMysteryBoxes(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .eq('mystery_box', true)
    .order('price', { ascending: true });
  return aProductos(data);
}

export async function getActiveCollections(): Promise<Collection[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  return (data ?? []) as Collection[];
}

export async function getProductsByCollectionSlug(slug: string): Promise<{
  collection: Collection | null;
  products: Product[];
}> {
  if (!isSupabaseConfigured()) return { collection: null, products: [] };
  const supabase = await createClient();
  const { data: collection } = await supabase
    .from('collections')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (!collection) return { collection: null, products: [] };
  const { data: links } = await supabase
    .from('collection_products')
    .select('product_id')
    .eq('collection_id', collection.id);
  const ids = (links ?? []).map((l) => l.product_id);
  if (ids.length === 0) return { collection: collection as Collection, products: [] };
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .in('id', ids);
  return {
    collection: collection as Collection,
    products: aProductos(data),
  };
}

export async function getFAQs(): Promise<FAQ[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('faqs')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  return (data ?? []) as FAQ[];
}

