import { createAdminClient } from '@/lib/supabase/server';
import { interpretarResultadoSlot, type ErrorSlot } from '@/utils/slotValidation';
import type { SlotsListado } from '@/types';

export type SlotResultado<T> = { ok: true; data: T } | { ok: false; error: ErrorSlot };

/** Slots del supervisor y los vendedores de su equipo que todavía no ocupan ninguno (CU-08) */
export async function listarSlots(idSupervisor: number): Promise<SlotResultado<Omit<SlotsListado, 'es_supervisor'>>> {
  const db = createAdminClient();
  const [slotsRes, equipoRes] = await Promise.all([
    db
      .from('vendedor_slots')
      .select('id, nombre, orden, id_vendedor')
      .eq('id_supervisor', idSupervisor)
      .order('orden', { ascending: true })
      .order('id', { ascending: true }),
    db.from('supervisor_vendedores').select('id_vendedor').eq('id_supervisor', idSupervisor),
  ]);
  if (slotsRes.error || equipoRes.error) return { ok: false, error: 'error' };

  const slots = slotsRes.data ?? [];
  const idsEquipo = (equipoRes.data ?? []).map((v) => v.id_vendedor);
  const idsPersonas = [...new Set([...idsEquipo, ...slots.flatMap((s) => (s.id_vendedor === null ? [] : [s.id_vendedor]))])];

  const nombres = new Map<number, string>();
  if (idsPersonas.length > 0) {
    const { data, error } = await db.from('personas').select('id, nombres, apellidos').in('id', idsPersonas);
    if (error) return { ok: false, error: 'error' };
    for (const p of data ?? []) nombres.set(p.id, `${p.apellidos}, ${p.nombres}`);
  }

  const ocupados = new Set(slots.flatMap((s) => (s.id_vendedor === null ? [] : [s.id_vendedor])));
  return {
    ok: true,
    data: {
      slots: slots.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        orden: s.orden,
        id_vendedor: s.id_vendedor,
        vendedor_nombre: s.id_vendedor === null ? null : (nombres.get(s.id_vendedor) ?? null),
      })),
      disponibles: idsEquipo
        .filter((id) => !ocupados.has(id))
        .map((id) => ({ id_persona: id, nombre: nombres.get(id) ?? `Persona ${id}` }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    },
  };
}

/** Crea un slot vacío al final del orden del supervisor */
export async function crearSlot(idSupervisor: number, nombre: string | null): Promise<SlotResultado<{ id: number }>> {
  const { data, error } = await createAdminClient().rpc('slot_crear', {
    p_id_supervisor: idSupervisor,
    p_nombre: nombre ?? undefined,
  });
  if (error) return { ok: false, error: 'error' };
  const resultado = interpretarResultadoSlot(data);
  if (!resultado.ok) return resultado;
  return resultado.datos.id === undefined ? { ok: false, error: 'error' } : { ok: true, data: { id: resultado.datos.id } };
}

/** Asigna un vendedor del equipo al slot, o lo deja vacío (idVendedor null) */
export async function asignarVendedorASlot(
  idSlot: number,
  idSupervisor: number,
  idVendedor: number | null
): Promise<SlotResultado<null>> {
  const { data, error } = await createAdminClient().rpc('slot_asignar_vendedor', {
    p_id_slot: idSlot,
    p_id_supervisor: idSupervisor,
    p_id_vendedor: idVendedor ?? undefined,
  });
  if (error) return { ok: false, error: 'error' };
  const resultado = interpretarResultadoSlot(data);
  return resultado.ok ? { ok: true, data: null } : resultado;
}

/** Sube o baja un slot una posición (CU-08 A2) */
export async function moverSlot(
  idSlot: number,
  idSupervisor: number,
  direccion: 'arriba' | 'abajo'
): Promise<SlotResultado<{ movido: boolean }>> {
  const { data, error } = await createAdminClient().rpc('slot_mover', {
    p_id_slot: idSlot,
    p_id_supervisor: idSupervisor,
    p_direccion: direccion,
  });
  if (error) return { ok: false, error: 'error' };
  const resultado = interpretarResultadoSlot(data);
  return resultado.ok ? { ok: true, data: { movido: resultado.datos.movido ?? false } } : resultado;
}

/** Cambia el nombre de un slot propio */
export async function renombrarSlot(idSlot: number, idSupervisor: number, nombre: string): Promise<SlotResultado<null>> {
  const { data, error } = await createAdminClient().rpc('slot_renombrar', {
    p_id_slot: idSlot,
    p_id_supervisor: idSupervisor,
    p_nombre: nombre,
  });
  if (error) return { ok: false, error: 'error' };
  const resultado = interpretarResultadoSlot(data);
  return resultado.ok ? { ok: true, data: null } : resultado;
}

/** Elimina un slot propio; su vendedor queda libre y sigue en el equipo */
export async function eliminarSlot(idSlot: number, idSupervisor: number): Promise<SlotResultado<null>> {
  const { data, error } = await createAdminClient().rpc('slot_eliminar', {
    p_id_slot: idSlot,
    p_id_supervisor: idSupervisor,
  });
  if (error) return { ok: false, error: 'error' };
  const resultado = interpretarResultadoSlot(data);
  return resultado.ok ? { ok: true, data: null } : resultado;
}
