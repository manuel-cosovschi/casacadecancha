'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter, logActivity } from '@/lib/admin/actions-helpers';
import { slugify } from '@/lib/utils';

type Result = { ok?: boolean; error?: string };

async function guard(): Promise<Result | null> {
  try {
    await assertWriter();
    return null;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const n = (v: FormDataEntryValue | null) => Number(v || 0);
const t = (v: FormDataEntryValue | null) => {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
};

// ----------------------- GASTOS -----------------------
export async function saveExpense(formData: FormData): Promise<void> {
  if (await guard()) return;
  const supabase = await createClient();
  await supabase.from('expenses').insert({
    date: t(formData.get('date')) || new Date().toISOString().slice(0, 10),
    category: t(formData.get('category')) || 'Otros',
    description: t(formData.get('description')),
    amount: n(formData.get('amount')),
    related_campaign: t(formData.get('related_campaign')),
    recurring: formData.get('recurring') === 'on',
  });
  await logActivity('create', 'expense', null);
  revalidatePath('/admin/gastos');
}

export async function deleteExpense(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  await supabase.from('expenses').delete().eq('id', id);
  revalidatePath('/admin/gastos');
  return { ok: true };
}

// ----------------------- FAQ -----------------------
export async function saveFaq(formData: FormData): Promise<void> {
  if (await guard()) return;
  const supabase = await createClient();
  const id = t(formData.get('id'));
  const payload = {
    question: t(formData.get('question')) || '',
    answer: t(formData.get('answer')) || '',
    active: formData.get('active') === 'on',
    sort_order: n(formData.get('sort_order')),
  };
  if (id) await supabase.from('faqs').update(payload).eq('id', id);
  else await supabase.from('faqs').insert(payload);
  revalidatePath('/admin/faq');
  revalidatePath('/preguntas-frecuentes');
}

export async function deleteFaq(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  await supabase.from('faqs').delete().eq('id', id);
  revalidatePath('/admin/faq');
  return { ok: true };
}

// ----------------------- COLECCIONES -----------------------
export async function saveCollection(formData: FormData): Promise<void> {
  if (await guard()) return;
  const supabase = await createClient();
  const id = t(formData.get('id'));
  const name = t(formData.get('name')) || '';
  const payload = {
    name,
    slug: t(formData.get('slug')) ? slugify(t(formData.get('slug'))!) : slugify(name),
    description: t(formData.get('description')),
    image_url: t(formData.get('image_url')),
    active: formData.get('active') === 'on',
    sort_order: n(formData.get('sort_order')),
  };
  if (id) await supabase.from('collections').update(payload).eq('id', id);
  else await supabase.from('collections').insert(payload);
  revalidatePath('/admin/colecciones');
  revalidatePath('/');
}

export async function deleteCollection(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  await supabase.from('collections').delete().eq('id', id);
  revalidatePath('/admin/colecciones');
  return { ok: true };
}

// ----------------------- PROMOCIONES -----------------------
export async function savePromotion(formData: FormData): Promise<void> {
  if (await guard()) return;
  const supabase = await createClient();
  const id = t(formData.get('id'));
  const payload = {
    name: t(formData.get('name')) || '',
    type: t(formData.get('type')) || 'coupon',
    code: t(formData.get('code')),
    percentage: formData.get('percentage') ? n(formData.get('percentage')) : null,
    fixed_amount: formData.get('fixed_amount') ? n(formData.get('fixed_amount')) : null,
    minimum_amount: formData.get('minimum_amount') ? n(formData.get('minimum_amount')) : null,
    max_uses: formData.get('max_uses') ? n(formData.get('max_uses')) : null,
    active: formData.get('active') === 'on',
  };
  if (id) await supabase.from('promotions').update(payload).eq('id', id);
  else await supabase.from('promotions').insert(payload);
  revalidatePath('/admin/promociones');
}

export async function deletePromotion(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  await supabase.from('promotions').delete().eq('id', id);
  revalidatePath('/admin/promociones');
  return { ok: true };
}

// ----------------------- STOCK (ajuste) -----------------------
export async function adjustStock(formData: FormData): Promise<void> {
  if (await guard()) return;
  const supabase = await createClient();
  const variantId = t(formData.get('variant_id'));
  const newStock = n(formData.get('stock_physical'));
  if (!variantId) return;
  const { data: v } = await supabase
    .from('product_variants')
    .select('stock_physical')
    .eq('id', variantId)
    .maybeSingle();
  const diff = newStock - (v?.stock_physical ?? 0);
  await supabase.from('product_variants').update({ stock_physical: newStock }).eq('id', variantId);
  await supabase.from('inventory_movements').insert({
    variant_id: variantId,
    type: 'ajuste',
    quantity: diff,
    reason: t(formData.get('reason')) || 'Ajuste manual',
  });
  await logActivity('adjust_stock', 'variant', variantId, { diff });
  revalidatePath('/admin/stock');
}

// ----------------------- AD METRICS -----------------------
export async function saveAdMetric(formData: FormData): Promise<void> {
  if (await guard()) return;
  const supabase = await createClient();
  const clicks = n(formData.get('clicks'));
  const impressions = n(formData.get('impressions'));
  const spend = n(formData.get('spend'));
  await supabase.from('ad_metrics').insert({
    date: t(formData.get('date')) || new Date().toISOString().slice(0, 10),
    campaign: t(formData.get('campaign')),
    adset: t(formData.get('adset')),
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpc: clicks > 0 ? spend / clicks : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    purchases: n(formData.get('purchases')),
    revenue: n(formData.get('revenue')),
  });
  revalidatePath('/admin/ads');
}

export async function deleteAdMetric(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  await supabase.from('ad_metrics').delete().eq('id', id);
  revalidatePath('/admin/ads');
  return { ok: true };
}

// ----------------------- SIZE GUIDES -----------------------
export async function saveSizeGuide(
  id: string | null,
  name: string,
  audience: string,
  measurements: { size: string; width: number; length: number }[],
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const payload = { name, audience, measurements_json: measurements, active: true };
  if (id) await supabase.from('size_guides').update(payload).eq('id', id);
  else await supabase.from('size_guides').insert(payload);
  revalidatePath('/admin/talles');
  revalidatePath('/guia-de-talles');
  return { ok: true };
}

// ----------------------- USUARIOS (rol) -----------------------
export async function updateUserRole(userId: string, role: string): Promise<Result> {
  const profile = await assertWriter().catch(() => null);
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return { error: 'Sólo owner/admin pueden cambiar roles.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) return { error: error.message };
  await logActivity('update_role', 'profile', userId, { role });
  revalidatePath('/admin/usuarios');
  return { ok: true };
}
