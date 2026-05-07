import { supabase } from './supabaseClient';

export async function registerAudit(action: string, entityName: string, entityId: string | null, metadata?: Record<string, unknown>) {
  const { data: userData } = await supabase.auth.getUser();
  const actorId = userData.user?.id;
  await supabase.from('audit_logs').insert({
    actor_id: actorId ?? null,
    action,
    entity_name: entityName,
    entity_id: entityId,
    metadata: metadata ?? {},
  });
}
