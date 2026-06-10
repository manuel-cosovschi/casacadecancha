'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { assertWriter, logActivity } from '@/lib/admin/actions-helpers';
import { notifyRestock } from '@/lib/admin/restock';
import { slugify } from '@/lib/utils';

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  slug: z.string().optional(),
  short_description: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  compare_at_price: z.coerce.number().optional().nullable(),
  unit_cost: z.coerce.number().min(0),
  packaging_cost: z.coerce.number().min(0),
  category_id: z.string().uuid().optional().nullable(),
  material: z.string().optional(),
  fabric: z.string().optional(),
  care: z.string().optional(),
  badge: z.string().optional(),
  active: z.coerce.boolean(),
  featured: z.coerce.boolean(),
  allow_backorder: z.coerce.boolean(),
  hide_when_out_of_stock: z.coerce.boolean(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
});

export type ActionState = { ok?: boolean; error?: string; id?: string };

function clean(v: FormDataEntryValue | null): string | undefined {
  const s = (v ?? '').toString().trim();
  return s === '' ? undefined : s;
}

export async function saveProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const raw = {
    id: clean(formData.get('id')),
    name: formData.get('name')?.toString() ?? '',
    slug: clean(formData.get('slug')),
    short_description: clean(formData.get('short_description')),
    description: clean(formData.get('description')),
    price: formData.get('price'),
    compare_at_price: clean(formData.get('compare_at_price')) ?? null,
    unit_cost: formData.get('unit_cost') ?? 0,
    packaging_cost: formData.get('packaging_cost') ?? 0,
    category_id: clean(formData.get('category_id')) ?? null,
    material: clean(formData.get('material')),
    fabric: clean(formData.get('fabric')),
    care: clean(formData.get('care')),
    badge: clean(formData.get('badge')),
    active: formData.get('active') === 'on',
    featured: formData.get('featured') === 'on',
    allow_backorder: formData.get('allow_backorder') === 'on',
    hide_when_out_of_stock: formData.get('hide_when_out_of_stock') === 'on',
    seo_title: clean(formData.get('seo_title')),
    seo_description: clean(formData.get('seo_description')),
  };

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Datos inválidos' };
  }
  const data = parsed.data;
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);

  const supabase = await createClient();
  const payload = {
    name: data.name,
    slug,
    short_description: data.short_description ?? null,
    description: data.description ?? null,
    price: data.price,
    compare_at_price: data.compare_at_price || null,
    unit_cost: data.unit_cost,
    packaging_cost: data.packaging_cost,
    category_id: data.category_id || null,
    material: data.material ?? null,
    fabric: data.fabric ?? null,
    care: data.care ?? null,
    badge: data.badge ?? null,
    active: data.active,
    featured: data.featured,
    allow_backorder: data.allow_backorder,
    hide_when_out_of_stock: data.hide_when_out_of_stock,
    seo_title: data.seo_title ?? null,
    seo_description: data.seo_description ?? null,
  };

  let id = data.id;
  if (id) {
    const { error } = await supabase.from('products').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data: inserted, error } = await supabase
      .from('products')
      .insert(payload)
      .select('id')
      .single();
    if (error) return { error: error.message };
    id = inserted.id;
  }

  await logActivity(data.id ? 'update' : 'create', 'product', id ?? null, { name: data.name });
  revalidatePath('/admin/productos');
  revalidatePath('/');
  return { ok: true, id };
}

export async function deleteProduct(id: string): Promise<ActionState> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { error: error.message };
  await logActivity('delete', 'product', id);
  revalidatePath('/admin/productos');
  return { ok: true };
}

// --- Variantes ---
export async function saveVariant(formData: FormData): Promise<ActionState> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const id = clean(formData.get('id'));
  const payload = {
    product_id: formData.get('product_id')?.toString(),
    size: clean(formData.get('size')) ?? null,
    sku: clean(formData.get('sku')) ?? null,
    stock_physical: Number(formData.get('stock_physical') || 0),
    stock_minimum: Number(formData.get('stock_minimum') || 0),
    variant_cost: clean(formData.get('variant_cost')) ? Number(formData.get('variant_cost')) : null,
    active: formData.get('active') === 'on',
  };
  let variantId = id;
  if (id) {
    const { error } = await supabase.from('product_variants').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from('product_variants').insert(payload).select('id').single();
    if (error) return { error: error.message };
    variantId = data?.id;
  }
  if (variantId && payload.stock_physical > 0) await notifyRestock(variantId);
  revalidatePath('/admin/productos');
  return { ok: true };
}

export async function deleteVariant(id: string): Promise<ActionState> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('product_variants').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/productos');
  return { ok: true };
}

// --- Imágenes ---
export async function addProductImage(formData: FormData): Promise<ActionState> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const product_id = formData.get('product_id')?.toString();
  const url = clean(formData.get('url'));
  if (!product_id || !url) return { error: 'Faltan datos de la imagen.' };
  const { count } = await supabase
    .from('product_images')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', product_id);
  const { error } = await supabase.from('product_images').insert({
    product_id,
    url,
    alt_text: clean(formData.get('alt_text')) ?? null,
    sort_order: count ?? 0,
    is_primary: (count ?? 0) === 0,
  });
  if (error) return { error: error.message };
  revalidatePath('/admin/productos');
  return { ok: true };
}

export async function deleteProductImage(id: string): Promise<ActionState> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('product_images').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/productos');
  return { ok: true };
}

// --- Upload a Storage ---
export async function uploadImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'Seleccioná un archivo.' };
  const supabase = await createClient();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return { url: data.publicUrl };
}
