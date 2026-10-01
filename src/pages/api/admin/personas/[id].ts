import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { createAdminClient } from '@/lib/supabase/server';
import { todayBolivia } from '@/utils/boliviaTime';

type EditBody = {
  ci?: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  id_sucursal?: number;
  id_cargo?: number;
};

// CU-03 — Editar colaborador
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const caller = await requireCallerAuth(req, res, 'personal:gestionar');
  if (!caller) return;

  const rawId = req.query.id;
  const id = parseInt(typeof rawId === 'string' ? rawId : '', 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID de colaborador inválido' });

  const { ci, nombres, apellidos, telefono, id_sucursal, id_cargo } = req.body as EditBody;
  if (!ci?.trim() || !nombres?.trim() || !apellidos?.trim() || !id_sucursal || !id_cargo) {
    return res.status(400).json({ error: 'Faltan campos requeridos: ci, nombres, apellidos, id_sucursal, id_cargo' });
  }

  const supabase = createAdminClient();

  const { data: persona } = await supabase
    .from('personas')
    .select('id, ci, auth_user_id, fecha_baja, asignaciones_laborales ( id, id_cargo, id_sucursal, fecha_inicio, estado )')
    .eq('id', id)
    .maybeSingle();

  if (!persona) return res.status(404).json({ error: 'Colaborador no encontrado' });
  if (persona.fecha_baja !== null) {
    return res.status(400).json({ error: 'No se puede editar un colaborador dado de baja' });
  }

  const active = persona.asignaciones_laborales?.find((a) => a.estado === 'activo') ?? null;

  // FISCALIZADOR: solo opera sobre su sucursal, de origen y de destino
  if (caller.alcance_tipo === 'SUCURSAL') {
    if (active?.id_sucursal !== caller.id_sucursal || id_sucursal !== caller.id_sucursal) {
      return res.status(403).json({ error: 'Solo podés editar personal de tu sucursal' });
    }
  }

  // CI único (excluyendo a la propia persona)
  if (ci.trim() !== persona.ci) {
    const { data: dup } = await supabase.from('personas').select('id').eq('ci', ci.trim()).neq('id', id).maybeSingle();
    if (dup) return res.status(409).json({ error: 'Ya existe un colaborador con ese CI' });
  }

  const { error: updError } = await supabase
    .from('personas')
    .update({
      ci: ci.trim(),
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      telefono: telefono?.trim() || null,
    })
    .eq('id', id);

  if (updError) {
    console.error('Error actualizando persona:', updError);
    return res.status(500).json({ error: 'Error al actualizar el colaborador' });
  }

  // Cambio de cargo o sucursal: se cierra la asignación vigente y se abre una nueva
  // para conservar el historial laboral.
  const changed = !active || active.id_cargo !== id_cargo || active.id_sucursal !== id_sucursal;
  if (changed) {
    const today = todayBolivia();
    const inicio = active && active.fecha_inicio > today ? active.fecha_inicio : today;

    if (active) {
      const { error: closeError } = await supabase
        .from('asignaciones_laborales')
        .update({ estado: 'inactivo', fecha_fin: inicio })
        .eq('id', active.id);
      if (closeError) {
        console.error('Error cerrando asignación:', closeError);
        return res.status(500).json({ error: 'Error al actualizar la asignación laboral' });
      }
    }

    const { error: insError } = await supabase.from('asignaciones_laborales').insert({
      id_persona: id,
      id_cargo,
      id_sucursal,
      fecha_inicio: inicio,
      estado: 'activo',
    });

    if (insError) {
      console.error('Error creando nueva asignación:', insError);
      if (active) {
        await supabase.from('asignaciones_laborales').update({ estado: 'activo', fecha_fin: null }).eq('id', active.id);
      }
      return res.status(500).json({ error: 'Error al crear la nueva asignación laboral' });
    }

    // Si ya tiene cuenta con alcance de sucursal, el alcance debe seguir a la asignación
    if (persona.auth_user_id && active?.id_sucursal !== id_sucursal) {
      await supabase
        .from('usuario_roles')
        .update({ id_sucursal })
        .eq('id_persona', id)
        .eq('alcance_tipo', 'SUCURSAL');
    }
  }

  return res.status(200).json({ success: true });
}
