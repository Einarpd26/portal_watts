import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { createAdminClient } from '@/lib/supabase/server';
import { todayBolivia } from '@/utils/boliviaTime';
import { revokeAccess } from '@/utils/revokeAccess';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// CU-03 A2 — Baja laboral institucional
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const caller = await requireCallerAuth(req, res, 'personal:gestionar');
  if (!caller) return;

  const rawId = req.query.id;
  const id = parseInt(typeof rawId === 'string' ? rawId : '', 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID de colaborador inválido' });

  const { fecha_baja, revocar_acceso } = req.body as { fecha_baja?: string; revocar_acceso?: boolean };
  if (!fecha_baja || !DATE_RE.test(fecha_baja)) {
    return res.status(400).json({ error: 'fecha_baja es requerida y debe tener formato YYYY-MM-DD' });
  }

  if (id === caller.id_persona) {
    return res.status(400).json({ error: 'No podés darte de baja a vos mismo' });
  }

  // La cuenta conserva acceso hasta el final de fecha_baja: no tiene sentido revocarla antes
  if (revocar_acceso && fecha_baja > todayBolivia()) {
    return res.status(400).json({ error: 'No se puede revocar el acceso con una fecha de baja futura' });
  }

  const supabase = createAdminClient();

  const { data: persona } = await supabase
    .from('personas')
    .select('id, nombres, apellidos, auth_user_id, fecha_baja, asignaciones_laborales ( id, id_sucursal, fecha_inicio, estado )')
    .eq('id', id)
    .maybeSingle();

  if (!persona) return res.status(404).json({ error: 'Colaborador no encontrado' });
  if (persona.fecha_baja !== null) {
    return res.status(400).json({ error: 'El colaborador ya está dado de baja' });
  }

  const active = persona.asignaciones_laborales?.find((a) => a.estado === 'activo') ?? null;

  if (caller.alcance_tipo === 'SUCURSAL' && active?.id_sucursal !== caller.id_sucursal) {
    return res.status(403).json({ error: 'Solo podés dar de baja personal de tu sucursal' });
  }

  if (active && fecha_baja < active.fecha_inicio) {
    return res.status(400).json({ error: 'La fecha de baja no puede ser anterior al inicio de la asignación' });
  }

  const { error: bajaError } = await supabase.from('personas').update({ fecha_baja }).eq('id', id);
  if (bajaError) {
    console.error('Error registrando baja:', bajaError);
    return res.status(500).json({ error: 'Error al registrar la baja' });
  }

  if (active) {
    const { error: closeError } = await supabase
      .from('asignaciones_laborales')
      .update({ estado: 'inactivo', fecha_fin: fecha_baja })
      .eq('id', active.id);
    if (closeError) {
      console.error('Error cerrando asignación en la baja:', closeError);
      await supabase.from('personas').update({ fecha_baja: null }).eq('id', id);
      return res.status(500).json({ error: 'Error al finalizar la asignación laboral' });
    }
  }

  let accesoRevocado = false;
  if (revocar_acceso && persona.auth_user_id) {
    accesoRevocado = await revokeAccess(supabase, { id, auth_user_id: persona.auth_user_id });
  }

  // Registrar auditoría en bitácora (UTC 0)
  await registrarBitacoraDesdeSesion(
    caller,
    'PERSONAL',
    'BAJA_PERSONAL',
    `Baja laboral registrada para el colaborador ID ${id} (${persona.nombres} ${persona.apellidos}) con fecha ${fecha_baja}`,
    req,
    { id_persona: id, fecha_baja, revocar_acceso: Boolean(revocar_acceso), acceso_revocado: accesoRevocado }
  );

  return res.status(200).json({
    success: true,
    acceso_revocado: accesoRevocado,
    // La baja ya quedó registrada; avisamos si la revocación pedida falló
    revocacion_fallida: Boolean(revocar_acceso && persona.auth_user_id && !accesoRevocado),
  });
}
