'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile, isOwnerRole } from '@/lib/admin/auth';
import { COMPRA_SEMANAL_KEY, lunesDeLaSemana } from '@/lib/admin/compra-semanal';

/** "Listo": la sugerencia de compra no vuelve a aparecer hasta el lunes que viene. */
export async function marcarCompraSemanalVista(): Promise<void> {
  const me = await getCurrentProfile();
  if (!me || !me.active || !isOwnerRole(me.role)) return;
  const supabase = await createClient();
  await supabase.from('store_settings').upsert(
    {
      key: COMPRA_SEMANAL_KEY,
      value_json: { vista: lunesDeLaSemana() },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );
  revalidatePath('/admin');
}
