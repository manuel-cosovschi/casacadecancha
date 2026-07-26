'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter } from '@/lib/admin/actions-helpers';

/** Guarda el contacto de un proveedor (WhatsApp/link/nota) en store_settings.suppliers. */
export async function saveSupplierContact(
  supplierKey: string,
  contact: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const { data: row } = await supabase
    .from('store_settings')
    .select('value_json')
    .eq('key', 'suppliers')
    .maybeSingle();
  const current = (row?.value_json as Record<string, { contact?: string }>) || {};
  const next = { ...current, [supplierKey]: { ...(current[supplierKey] || {}), contact: contact.trim() } };
  const { error } = await supabase
    .from('store_settings')
    .upsert({ key: 'suppliers', value_json: next, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return { error: error.message };
  revalidatePath('/admin/proveedores');
  return { ok: true };
}
