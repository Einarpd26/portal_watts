import { createAdminClient } from '@/lib/supabase/server';
import { interpretarResultadoVisita, type ErrorVisita } from '@/utils/visitaValidation';
import type { DiaKey } from '@/utils/diasSemana';
import type { Frecuencia } from '@/types';

export type VisitaResultado<T> = { ok: true; data: T } | { ok: false; error: ErrorVisita };

/** Planifica una ruta de las zonas del supervisor en uno de sus slots (CU-09, RN-05) */
export async function agregarVisita(
  idSupervisor: number,
  idSlot: number,
  idRuta: number,
  dia: DiaKey,
  frecuencia: Frecuencia
): Promise<VisitaResultado<{ id: number }>> {
  const { data, error } = await createAdminClient().rpc('planificacion_agregar', {
    p_id_slot: idSlot,
    p_id_supervisor: idSupervisor,
    p_id_ruta: idRuta,
    p_dia: dia,
    p_frecuencia: frecuencia,
  });
  if (error) return { ok: false, error: 'error' };
  const resultado = interpretarResultadoVisita(data);
  if (!resultado.ok) return resultado;
  return resultado.id === undefined ? { ok: false, error: 'error' } : { ok: true, data: { id: resultado.id } };
}

/** Cambia la frecuencia de una visita propia */
export async function cambiarFrecuenciaVisita(
  idSupervisor: number,
  idVisita: number,
  frecuencia: Frecuencia
): Promise<VisitaResultado<null>> {
  const { data, error } = await createAdminClient().rpc('planificacion_cambiar_frecuencia', {
    p_id: idVisita,
    p_id_supervisor: idSupervisor,
    p_frecuencia: frecuencia,
  });
  if (error) return { ok: false, error: 'error' };
  const resultado = interpretarResultadoVisita(data);
  return resultado.ok ? { ok: true, data: null } : resultado;
}

/** Quita una visita propia */
export async function quitarVisita(idSupervisor: number, idVisita: number): Promise<VisitaResultado<null>> {
  const { data, error } = await createAdminClient().rpc('planificacion_quitar', {
    p_id: idVisita,
    p_id_supervisor: idSupervisor,
  });
  if (error) return { ok: false, error: 'error' };
  const resultado = interpretarResultadoVisita(data);
  return resultado.ok ? { ok: true, data: null } : resultado;
}

/** Mueve una visita propia a otro slot y día (arrastre en la grilla); conserva su frecuencia */
export async function moverVisita(
  idSupervisor: number,
  idVisita: number,
  idSlotDestino: number,
  diaDestino: DiaKey
): Promise<VisitaResultado<null>> {
  const { data, error } = await createAdminClient().rpc('planificacion_mover', {
    p_id: idVisita,
    p_id_supervisor: idSupervisor,
    p_id_slot_destino: idSlotDestino,
    p_dia_destino: diaDestino,
  });
  if (error) return { ok: false, error: 'error' };
  const resultado = interpretarResultadoVisita(data);
  return resultado.ok ? { ok: true, data: null } : resultado;
}
