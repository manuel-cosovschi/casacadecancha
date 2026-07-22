import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { availableStock } from '@/lib/utils';
import type { Collection, FAQ, Product, SizeGuide } from '@/lib/types';

const PRODUCT_SELECT =
  '*, images:product_images(*), variants:product_variants(*)';

function sortProduct(p: Product): Product {
  if (p.images) p.images.sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  if (p.variants) p.variants.sort((a, b) => a.sort_order - b.sort_order);
  return p;
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
  return (data ?? []).map(sortProduct) as Product[];
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
  const products = (data ?? []).map(sortProduct) as Product[];
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
  return data ? sortProduct(data as Product) : null;
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
  return data ? sortProduct(data as Product) : null;
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
  return (data ?? []).map(sortProduct) as Product[];
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
  return (data ?? []).map(sortProduct) as Product[];
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
    products: (data ?? []).map(sortProduct) as Product[],
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

export async function getSizeGuides(): Promise<SizeGuide[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('size_guides')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  return (data ?? []) as SizeGuide[];
}
