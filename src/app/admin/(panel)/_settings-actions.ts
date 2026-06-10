'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter, logActivity } from '@/lib/admin/actions-helpers';

/** Actualiza (o crea) una entrada de store_settings por key. */
export async function updateSetting(
  key: string,
  value: Record<string, unknown>,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('store_settings')
    .upsert({ key, value_json: value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return { error: error.message };

  await logActivity('update', 'settings', key);
  revalidatePath('/', 'layout');
  return { ok: true };
}
