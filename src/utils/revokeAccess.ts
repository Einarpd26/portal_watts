import type { createAdminClient } from '@/lib/supabase/server';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Revoca el acceso digital de una persona: elimina la cuenta en auth.users,
 * limpia personas.auth_user_id y borra sus asignaciones en usuario_roles.
 * No toca los registros comerciales históricos.
 */
export async function revokeAccess(
  supabase: AdminClient,
  persona: { id: number; auth_user_id: string }
): Promise<boolean> {
  const { error } = await supabase.auth.admin.deleteUser(persona.auth_user_id);
  if (error) {
    console.error('Error eliminando usuario de auth.users:', error);
    return false;
  }

  await supabase.from('personas').update({ auth_user_id: null }).eq('id', persona.id);
  await supabase.from('usuario_roles').delete().eq('id_persona', persona.id);
  return true;
}
