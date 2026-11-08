import { createAdminClient } from '@/lib/supabase/server';
import { primero } from '@/utils/postgrest';
import { listarZonas } from '@/lib/zonas';
import { consultarPlanificacion } from '@/lib/slots';
import { alcanceDeListado, type AlcanceSolicitante } from '@/utils/sucursalScope';
import { interpretarResultadoEquipo, type ErrorEquipo } from '@/utils/equipoValidation';
import type { EquipoSupervisor, EquiposListado, PlanificacionDeSupervisor, VendedorSinEquipo } from '@/types';

export type EquipoResultado<T> = { ok: true; data: T } | { ok: false; error: ErrorEquipo };

/** Cargo laboral que identifica a un vendedor (el mismo que usa la función de base de datos) */
const CARGO_VENDEDOR = 'Vendedor';

type Persona = { nombres: string; apellidos: string } | null;

const nombreCompleto = (p: Persona) => (p ? `${p.apellidos}, ${p.nombres}` : '');

/** Sucursal del solicitante para las funciones de base de datos: NULL = alcance global */
export function sucursalDeAlcance(solicitante: AlcanceSolicitante): number | null | 'denegado' {
  const alcance = alcanceDeListado(solicitante);
  if (alcance.tipo === 'denegado') return 'denegado';
  return alcance.tipo === 'global' ? null : alcance.id_sucursal;
}

/**
 * Equipos de los supervisores (CU-08, ADR-003): los supervisores activos con sus vendedores, los
 * supervisores inactivos que conservan equipo o slots (esperan un reemplazo) y los vendedores
 * vigentes sin supervisor. Un alcance SUCURSAL solo ve su sede.
 */
export async function listarEquipos(solicitante: AlcanceSolicitante): Promise<EquipoResultado<EquiposListado>> {
  const alcance = alcanceDeListado(solicitante);
  if (alcance.tipo === 'denegado') {
    return { ok: true, data: { equipos: [], sin_supervisor: [], zonas_sin_supervisor: [], alcance_global: false } };
  }
  const enAlcance = (idSucursal: number) => alcance.tipo === 'global' || idSucursal === alcance.id_sucursal;

  const db = createAdminClient();
  const [rolesRes, vinculosRes, slotsRes, vendedoresRes] = await Promise.all([
    db
      .from('usuario_roles')
      .select('id_persona, id_sucursal, roles!inner ( codigo ), personas!inner ( nombres, apellidos, fecha_baja ), sucursales ( nombre_sucursal )')
      .eq('roles.codigo', 'SUPERVISOR')
      .not('id_sucursal', 'is', null),
    db.from('supervisor_vendedores').select('id_supervisor, id_vendedor'),
    db.from('vendedor_slots').select('id_supervisor, id_vendedor'),
    db
      .from('asignaciones_laborales')
      .select('id_persona, id_sucursal, cargos!inner ( nombre_cargo ), personas!inner ( nombres, apellidos, fecha_baja ), sucursales ( nombre_sucursal )')
      .eq('estado', 'activo')
      .eq('cargos.nombre_cargo', CARGO_VENDEDOR)
      .is('personas.fecha_baja', null),
  ]);
  if (rolesRes.error || vinculosRes.error || slotsRes.error || vendedoresRes.error) {
    return { ok: false, error: 'error' };
  }

  // Zonas sin supervisor: al retirarse un supervisor quedan así (CU-07 A4) hasta que se asignen a otro
  const zonasRes = await listarZonas(alcance.tipo === 'sucursal' ? alcance.id_sucursal : null);
  if (!zonasRes.ok) return { ok: false, error: 'error' };
  const zonasSinSupervisor = zonasRes.data
    .filter((z) => z.supervisor === null)
    .map((z) => ({
      id: z.id,
      codigo_zona: z.codigo_zona,
      zona: z.zona,
      id_sucursal: z.id_sucursal,
      sucursal_nombre: z.sucursal_nombre,
      total_rutas: z.total_rutas,
    }));

  const vinculos = vinculosRes.data ?? [];
  const slots = slotsRes.data ?? [];

  // Vendedores vigentes por persona
  const vendedores = new Map<number, { nombre: string; id_sucursal: number; sucursal_nombre: string }>();
  for (const fila of vendedoresRes.data ?? []) {
    vendedores.set(fila.id_persona, {
      nombre: nombreCompleto(primero(fila.personas)),
      id_sucursal: fila.id_sucursal,
      sucursal_nombre: primero(fila.sucursales)?.nombre_sucursal ?? '',
    });
  }

  // Supervisores activos: rol SUPERVISOR y sin baja. Se toman de todas las sedes para no confundir
  // a uno activo de otra sede con un supervisor retirado.
  const activos = new Map<number, EquipoSupervisor>();
  for (const fila of rolesRes.data ?? []) {
    const persona = primero(fila.personas);
    if (!persona || persona.fecha_baja !== null || fila.id_sucursal === null) continue;
    if (activos.has(fila.id_persona)) continue;
    activos.set(fila.id_persona, {
      id_persona: fila.id_persona,
      nombre: nombreCompleto(persona),
      id_sucursal: fila.id_sucursal,
      sucursal_nombre: primero(fila.sucursales)?.nombre_sucursal ?? '',
      activo: true,
      vendedores: [],
      total_slots: 0,
    });
  }

  // Supervisores inactivos con equipo o slots: se resuelve su nombre y su última sucursal
  const idsInactivos = [
    ...new Set([...vinculos.map((v) => v.id_supervisor), ...slots.map((s) => s.id_supervisor)]),
  ].filter((id) => !activos.has(id));

  const inactivos = new Map<number, EquipoSupervisor>();
  if (idsInactivos.length > 0) {
    const { data, error } = await db
      .from('asignaciones_laborales')
      .select('id_persona, id_sucursal, fecha_inicio, personas!inner ( nombres, apellidos ), sucursales ( nombre_sucursal )')
      .in('id_persona', idsInactivos)
      .order('fecha_inicio', { ascending: false });
    if (error) return { ok: false, error: 'error' };
    for (const fila of data ?? []) {
      if (inactivos.has(fila.id_persona)) continue; // la más reciente primero
      inactivos.set(fila.id_persona, {
        id_persona: fila.id_persona,
        nombre: nombreCompleto(primero(fila.personas)),
        id_sucursal: fila.id_sucursal,
        sucursal_nombre: primero(fila.sucursales)?.nombre_sucursal ?? '',
        activo: false,
        vendedores: [],
        total_slots: 0,
      });
    }
  }

  const todos = new Map<number, EquipoSupervisor>([...activos, ...inactivos]);
  const enEquipo = new Set<number>();
  for (const v of vinculos) {
    enEquipo.add(v.id_vendedor);
    const equipo = todos.get(v.id_supervisor);
    if (!equipo) continue;
    const ficha = vendedores.get(v.id_vendedor);
    equipo.vendedores.push({
      id_persona: v.id_vendedor,
      nombre: ficha?.nombre ?? `Persona ${v.id_vendedor}`,
      id_sucursal: ficha?.id_sucursal ?? equipo.id_sucursal,
      tiene_slot: slots.some((s) => s.id_vendedor === v.id_vendedor),
    });
  }
  for (const s of slots) {
    const equipo = todos.get(s.id_supervisor);
    if (equipo) equipo.total_slots += 1;
  }

  const equipos = [...todos.values()]
    // Un supervisor inactivo solo aparece si conserva algo que reemplazar
    .filter((e) => e.activo || e.vendedores.length > 0 || e.total_slots > 0)
    .filter((e) => enAlcance(e.id_sucursal))
    .sort((a, b) => Number(a.activo) - Number(b.activo) || a.nombre.localeCompare(b.nombre));
  for (const e of equipos) e.vendedores.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const sinSupervisor: VendedorSinEquipo[] = [...vendedores]
    .filter(([id, v]) => !enEquipo.has(id) && enAlcance(v.id_sucursal))
    .map(([id, v]) => ({ id_persona: id, nombre: v.nombre, id_sucursal: v.id_sucursal, sucursal_nombre: v.sucursal_nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return {
    ok: true,
    data: {
      equipos,
      sin_supervisor: sinSupervisor,
      zonas_sin_supervisor: zonasSinSupervisor,
      alcance_global: alcance.tipo === 'global',
    },
  };
}

/**
 * Planificación de un supervisor, en solo lectura, para el Fiscalizador (su sucursal) y Gerencia (global)
 * (ADR-003 D10). El alcance sale de la misma lista de equipos de la pantalla Equipos: quien no ve a un
 * supervisor ahí tampoco puede consultar su planificación.
 */
export async function planificacionDeSupervisor(
  solicitante: AlcanceSolicitante,
  idSupervisor: number
): Promise<EquipoResultado<PlanificacionDeSupervisor>> {
  const equipos = await listarEquipos(solicitante);
  if (!equipos.ok) return equipos;
  const equipo = equipos.data.equipos.find((e) => e.id_persona === idSupervisor);
  if (!equipo) return { ok: false, error: 'no_encontrado' };

  const planificacion = await consultarPlanificacion(idSupervisor);
  if (!planificacion.ok) return { ok: false, error: 'error' };
  return {
    ok: true,
    data: {
      supervisor: {
        id_persona: equipo.id_persona,
        nombre: equipo.nombre,
        sucursal_nombre: equipo.sucursal_nombre,
        activo: equipo.activo,
      },
      ...planificacion.data,
    },
  };
}

/**
 * Si la persona, como supervisor, tiene vendedores a cargo o slots (CU-08 A6, ADR-003 D6). Mientras los
 * tenga no puede cambiar de sucursal: primero se lo reemplaza.
 */
export async function supervisorTieneEquipo(idPersona: number): Promise<EquipoResultado<boolean>> {
  const db = createAdminClient();
  const [vinculos, slots] = await Promise.all([
    db.from('supervisor_vendedores').select('id_vendedor', { count: 'exact', head: true }).eq('id_supervisor', idPersona),
    db.from('vendedor_slots').select('id', { count: 'exact', head: true }).eq('id_supervisor', idPersona),
  ]);
  if (vinculos.error || slots.error) return { ok: false, error: 'error' };
  return { ok: true, data: (vinculos.count ?? 0) > 0 || (slots.count ?? 0) > 0 };
}

/** Asigna, cambia (idSupervisor) o quita (null) el supervisor de un vendedor (ADR-003 D3 y D4) */
export async function asignarVendedorAEquipo(
  idVendedor: number,
  idSupervisor: number | null,
  idSucursalAlcance: number | null
): Promise<EquipoResultado<{ anterior: number | null; slots_liberados: number }>> {
  const { data, error } = await createAdminClient().rpc('equipo_asignar_vendedor', {
    p_id_vendedor: idVendedor,
    p_id_supervisor: idSupervisor ?? undefined,
    p_id_sucursal_alcance: idSucursalAlcance ?? undefined,
  });
  if (error) return { ok: false, error: 'error' };
  const resultado = interpretarResultadoEquipo(data);
  if (!resultado.ok) return { ok: false, error: resultado.error };
  return {
    ok: true,
    data: { anterior: resultado.datos.anterior ?? null, slots_liberados: resultado.datos.slots_liberados ?? 0 },
  };
}

/** Traspasa el equipo y los slots de un supervisor inactivo a uno nuevo (ADR-003 D6) */
export async function reemplazarSupervisor(
  idInactivo: number,
  idNuevo: number,
  idSucursalAlcance: number | null
): Promise<EquipoResultado<{ vendedores: number; slots: number }>> {
  const { data, error } = await createAdminClient().rpc('supervisor_reemplazar', {
    p_id_inactivo: idInactivo,
    p_id_nuevo: idNuevo,
    p_id_sucursal_alcance: idSucursalAlcance ?? undefined,
  });
  if (error) return { ok: false, error: 'error' };
  const resultado = interpretarResultadoEquipo(data);
  if (!resultado.ok) return { ok: false, error: resultado.error };
  return { ok: true, data: { vendedores: resultado.datos.vendedores ?? 0, slots: resultado.datos.slots ?? 0 } };
}
