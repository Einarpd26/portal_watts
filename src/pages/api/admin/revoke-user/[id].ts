import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { createAdminClient } from '@/lib/supabase/server';
import { revokeAccess } from '@/utils/revokeAccess';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Autenticar al caller
  const caller = await requireCallerAuth(req, res, 'cuentas:gestionar');
  if (!caller) return;

  // 2. Obtener el id de la persona a revocar
  const rawId = req.query.id;
  const id = parseInt(typeof rawId === 'string' ? rawId : '', 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID de persona inválido' });
  }

  // Nadie puede revocar su propio acceso: eliminaría su cuenta en auth.users sin vuelta atrás
  if (id === caller.id_persona) {
    return res.status(400).json({ error: 'No podés revocar tu propio acceso' });
  }

  const supabaseAdmin = createAdminClient();

  // 3. Obtener auth_user_id de la persona
  const { data: persona, error: personaError } = await supabaseAdmin
    .from('personas')
    .select('id, auth_user_id')
    .eq('id', id)
    .single();

  if (personaError || !persona) {
    return res.status(404).json({ error: 'Colaborador no encontrado' });
  }

  if (!persona.auth_user_id) {
    return res.status(400).json({ error: 'Este colaborador no tiene acceso digital' });
  }

  // 4. Gate: FISCALIZADOR solo puede revocar usuarios de su sucursal
  if (caller.alcance_tipo === 'SUCURSAL' && caller.id_sucursal !== null) {
    const { data: urData } = await supabaseAdmin
      .from('usuario_roles')
      .select('id_sucursal')
      .eq('id_persona', id);

    const urArray = urData ?? [];
    const isInScope = urArray.some((r) => r.id_sucursal === caller.id_sucursal);

    if (!isInScope) {
      return res.status(403).json({ error: 'No tenés permiso para revocar este usuario' });
    }
  }

  // 5. Eliminar de auth.users, limpiar auth_user_id y usuario_roles
  const revoked = await revokeAccess(supabaseAdmin, { id, auth_user_id: persona.auth_user_id });
  if (!revoked) {
    return res.status(500).json({ error: 'Error al eliminar la cuenta de autenticación' });
  }

  return res.status(200).json({ success: true });
}
