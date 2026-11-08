import { createAdminClient } from '@/lib/supabase/server';
import { primero } from '@/utils/postgrest';
import { interpretarResultadoSlot, type ErrorSlot } from '@/utils/slotValidation';
import type { Frecuencia, RutaPlanificable, SlotItem, SlotsListado, VisitaPlanificada } from '@/types';
import type { DiaKey } from '@/utils/diasSemana';

export type SlotResultado<T> = { ok: true; data: T } | { ok: false; error: ErrorSlot };

type Db = ReturnType<typeof createAdminClient>;
type FilaSlot = { id: number; nombre: string | null; orden: number; id_vendedor: number | null };

/** Slots del supervisor en su orden. Devuelve la consulta sin esperarla, para usarla dentro de un Promise.all */
const consultaSlots = (db: Db, idSupervisor: number) =>
  db
    .from('vendedor_slots')
    .select('id, nombre, orden, id_vendedor')
    .eq('id_supervisor', idSupervisor)
    .order('orden', { ascending: true })
    .order('id', { ascending: true });

const idsVendedorDe = (slots: readonly FilaSlot[]) => slots.flatMap((s) => (s.id_vendedor === null ? [] : [s.id_vendedor]));

/** «Apellidos, Nombres» de cada persona, o null si la consulta falla */
async function nombresDePersonas(db: Db, ids: readonly number[]): Promise<Map<number, string> | null> {
  const nombres = new Map<number, string>();
  if (ids.length === 0) return nombres;
  const { data, error } = await db.from('personas').select('id, nombres, apellidos').in('id', ids);
  if (error) return null;
  for (const p of data ?? []) nombres.set(p.id, `${p.apellidos}, ${p.nombres}`);
  return nombres;
}

/**
 * Slots del supervisor con sus visitas, los vendedores de su equipo que todavía no ocupan ninguno
 * (CU-08) y las rutas de sus zonas. Las visitas de rutas que ya no son de sus zonas se ocultan: la
 * planificación se conserva, pero el supervisor que perdió la zona deja de verla (RN-05).
 */
export async function listarSlots(idSupervisor: number): Promise<SlotResultado<Omit<SlotsListado, 'es_supervisor'>>> {
  const db = createAdminClient();
  const [slotsRes, equipoRes, zonasRes] = await Promise.all([
    consultaSlots(db, idSupervisor),
    db.from('supervisor_vendedores').select('id_vendedor').eq('id_supervisor', idSupervisor),
    db.from('supervisor_zonas').select('id_zona').eq('id_supervisor', idSupervisor),
  ]);
  if (slotsRes.error || equipoRes.error || zonasRes.error) return { ok: false, error: 'error' };

  const slots = slotsRes.data ?? [];
  const idsEquipo = (equipoRes.data ?? []).map((v) => v.id_vendedor);
  const nombres = await nombresDePersonas(db, [...new Set([...idsEquipo, ...idsVendedorDe(slots)])]);
  if (!nombres) return { ok: false, error: 'error' };

  // Rutas de las zonas que supervisa hoy y sus visitas planificadas
  const idsZona = (zonasRes.data ?? []).map((z) => z.id_zona);
  let rutas: RutaPlanificable[] = [];
  let visitas: VisitaPlanificada[] = [];
  if (idsZona.length > 0) {
    const { data, error } = await db
      .from('rutas')
      .select('id, codigo_ruta, ruta, zonas!inner ( codigo_zona )')
      .in('id_zona', idsZona)
      .order('codigo_ruta', { ascending: true });
    if (error) return { ok: false, error: 'error' };
    rutas = (data ?? []).map((r) => ({
      id: r.id,
      codigo_ruta: r.codigo_ruta,
      ruta: r.ruta,
      codigo_zona: primero(r.zonas)?.codigo_zona ?? '',
    }));

    const idsSlot = slots.map((s) => s.id);
    if (idsSlot.length > 0 && rutas.length > 0) {
      const porId = new Map(rutas.map((r) => [r.id, r]));
      const visitasRes = await db
        .from('planificacion_rutas')
        .select('id, id_vendedor_slot, id_ruta, dia_semana, frecuencia')
        .in('id_vendedor_slot', idsSlot)
        .in('id_ruta', rutas.map((r) => r.id))
        .order('id', { ascending: true });
      if (visitasRes.error) return { ok: false, error: 'error' };
      visitas = (visitasRes.data ?? []).flatMap((v) => {
        const ruta = porId.get(v.id_ruta);
        return ruta
          ? [{
              id: v.id,
              id_slot: v.id_vendedor_slot,
              id_ruta: v.id_ruta,
              codigo_ruta: ruta.codigo_ruta,
              ruta: ruta.ruta,
              dia: v.dia_semana as DiaKey,
              frecuencia: v.frecuencia as Frecuencia,
            }]
          : [];
      });
    }
  }

  const ocupados = new Set(idsVendedorDe(slots));
  return {
    ok: true,
    data: {
      slots: slots.map((s) => aSlotItem(s, nombres)),
      visitas,
      rutas,
      disponibles: idsEquipo
        .filter((id) => !ocupados.has(id))
        .map((id) => ({ id_persona: id, nombre: nombres.get(id) ?? `Persona ${id}` }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    },
  };
}

function aSlotItem(s: FilaSlot, nombres: ReadonlyMap<number, string>): SlotItem {
  return {
    id: s.id,
    nombre: s.nombre,
    orden: s.orden,
    id_vendedor: s.id_vendedor,
    vendedor_nombre: s.id_vendedor === null ? null : (nombres.get(s.id_vendedor) ?? null),
  };
}

/**
 * Slots de un supervisor con TODA su planificación guardada, para que el Fiscalizador y Gerencia la revisen
 * en solo lectura (ADR-003 D10). A diferencia de listarSlots, no oculta las visitas de rutas que ya no son de
 * sus zonas: un supervisor retirado no tiene zonas y su planificación se conserva hasta el reemplazo (D6).
 */
export async function consultarPlanificacion(idSupervisor: number): Promise<SlotResultado<Pick<SlotsListado, 'slots' | 'visitas'>>> {
  const db = createAdminClient();
  const slotsRes = await consultaSlots(db, idSupervisor);
  if (slotsRes.error) return { ok: false, error: 'error' };
  const slots = slotsRes.data ?? [];

  const nombres = await nombresDePersonas(db, [...new Set(idsVendedorDe(slots))]);
  if (!nombres) return { ok: false, error: 'error' };

  let visitas: VisitaPlanificada[] = [];
  if (slots.length > 0) {
    const visitasRes = await db
      .from('planificacion_rutas')
      .select('id, id_vendedor_slot, id_ruta, dia_semana, frecuencia, rutas!inner ( codigo_ruta, ruta )')
      .in('id_vendedor_slot', slots.map((s) => s.id))
      .order('id', { ascending: true });
    if (visitasRes.error) return { ok: false, error: 'error' };
    visitas = (visitasRes.data ?? []).map((v) => ({
      id: v.id,
      id_slot: v.id_vendedor_slot,
      id_ruta: v.id_ruta,
      codigo_ruta: primero(v.rutas)?.codigo_ruta ?? '',
      ruta: primero(v.rutas)?.ruta ?? '',
      dia: v.dia_semana as DiaKey,
      frecuencia: v.frecuencia as Frecuencia,
    }));
  }

  return { ok: true, data: { slots: slots.map((s) => aSlotItem(s, nombres)), visitas } };
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

/** Guarda el orden completo de los slots del supervisor (arrastre de filas, CU-08 A2) */
export async function reordenarSlots(idSupervisor: number, ids: number[]): Promise<SlotResultado<null>> {
  const { data, error } = await createAdminClient().rpc('slot_reordenar', {
    p_id_supervisor: idSupervisor,
    p_ids: ids,
  });
  if (error) return { ok: false, error: 'error' };
  const resultado = interpretarResultadoSlot(data);
  return resultado.ok ? { ok: true, data: null } : resultado;
}
