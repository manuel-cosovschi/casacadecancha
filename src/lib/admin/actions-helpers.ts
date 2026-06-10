import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile, canWrite } from '@/lib/admin/auth';

/** Verifica que el usuario actual pueda escribir. Lanza si no. */
export async function assertWriter() {
  const profile = await getCurrentProfile();
  if (!profile || !profile.active || !canWrite(profile.role)) {
    throw new Error('No tenés permisos para esta acción.');
  }
  return profile;
}

/** Registra una acción en activity_logs. */
export async function logActivity(
  action: string,
  entity: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    const profile = await getCurrentProfile();
    const supabase = await createClient();
    await supabase.from('activity_logs').insert({
      user_id: profile?.id ?? null,
      action,
      entity,
      entity_id: entityId,
      metadata_json: metadata,
    });
  } catch {
    /* el log no debe romper la operación */
  }
}
