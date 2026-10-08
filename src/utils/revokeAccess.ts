import type { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Revoca el acceso digital de una persona: elimina la cuenta en auth.users,
 * limpia personas.auth_user_id y borra sus asignaciones en usuario_roles.
 * También lo desasigna como supervisor de sus zonas (CU-07): sin rol ni cuenta
 * no puede seguir siendo responsable de una zona. Las zonas quedan sin supervisor.
 * No toca los registros comerciales históricos.
 */
export async function revokeAccess(
  supabase: AdminClient,
  persona: { id: number; auth_user_id: string }
): Promise<boolean> {
  const { error } = await supabase.auth.admin.deleteUser(persona.auth_user_id);
  if (error) {
    logger.error('Error eliminando usuario de auth.users:', error);
    return false;
  }

  // La cuenta ya no existe: si una limpieza falla se registra, pero la revocación se da por hecha
  const limpiezas = [
    { paso: 'limpiando personas.auth_user_id', resultado: await supabase.from('personas').update({ auth_user_id: null }).eq('id', persona.id) },
    { paso: 'borrando usuario_roles', resultado: await supabase.from('usuario_roles').delete().eq('id_persona', persona.id) },
    { paso: 'quitando al supervisor de sus zonas', resultado: await supabase.from('supervisor_zonas').delete().eq('id_supervisor', persona.id) },
  ];
  for (const { paso, resultado } of limpiezas) {
    if (resultado.error) {
      logger.error(`Error ${paso} al revocar el acceso:`, resultado.error);
    }
  }
  return true;
}
