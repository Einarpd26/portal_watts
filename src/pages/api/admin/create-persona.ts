import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { createAdminClient } from '@/lib/supabase/server';
import { todayBolivia } from '@/utils/boliviaTime';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { logger } from '@/lib/logger';
import { enAlcanceDeSucursal } from '@/utils/sucursalScope';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const caller = await requireCallerAuth(req, res, 'personal:gestionar');
  if (!caller) return;

  const { ci, nombres, apellidos, telefono, id_sucursal, id_cargo, fecha_inicio } = req.body as {
    ci: string;
    nombres: string;
    apellidos: string;
    telefono?: string;
    id_sucursal: number;
    id_cargo: number;
    fecha_inicio?: string;
  };

  if (!ci || !nombres || !apellidos || !id_sucursal || !id_cargo) {
    return res.status(400).json({ error: 'Faltan campos requeridos: ci, nombres, apellidos, id_sucursal, id_cargo' });
  }

  // FISCALIZADOR: solo puede registrar en su propia sucursal
  if (!enAlcanceDeSucursal(caller, [id_sucursal])) {
    return res.status(403).json({ error: 'Solo podés registrar personal en tu sucursal' });
  }

  const supabase = createAdminClient();

  // CI único en personas
  const { data: existing } = await supabase
    .from('personas')
    .select('id')
    .eq('ci', ci.trim())
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'Ya existe un colaborador con ese CI' });
  }

  // Crear persona
  const { data: persona, error: personaError } = await supabase
    .from('personas')
    .insert({
      ci: ci.trim(),
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      telefono: telefono?.trim() || null,
    })
    .select('id')
    .single();

  if (personaError || !persona) {
    logger.error('Error creando persona:', personaError);
    return res.status(500).json({ error: 'Error al crear el colaborador' });
  }

  // Crear asignación laboral
  const { error: asignError } = await supabase.from('asignaciones_laborales').insert({
    id_persona: persona.id,
    id_cargo,
    id_sucursal,
    fecha_inicio: fecha_inicio ?? todayBolivia(),
    estado: 'activo',
  });

  if (asignError) {
    // Rollback: eliminar la persona recién creada
    await supabase.from('personas').delete().eq('id', persona.id);
    logger.error('Error creando asignación, rollback ejecutado:', asignError);
    return res.status(500).json({ error: 'Error al crear la asignación laboral' });
  }

  // Registrar auditoría en bitácora (UTC 0)
  await registrarBitacoraDesdeSesion(
    caller,
    'PERSONAL',
    'CREAR_PERSONAL',
    `Nuevo colaborador registrado: ${nombres.trim()} ${apellidos.trim()} (CI: ${ci.trim()})`,
    req,
    { id_persona: persona.id, ci: ci.trim(), id_cargo, id_sucursal, fecha_inicio: fecha_inicio ?? todayBolivia() }
  );

  return res.status(201).json({ success: true, id_persona: persona.id });
}
