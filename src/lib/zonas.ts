import { createAdminClient } from '@/lib/supabase/server';
import { PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION } from '@/lib/pgErrors';
import type { SupervisorCandidato, ZonaItem } from '@/types';
import type { ZonaNormalizada } from '@/utils/zonaValidation';

export type ZonaError =
  | 'duplicado'
  | 'en_uso'
  | 'sucursal_invalida'
  | 'no_encontrada'
  | 'supervisor_invalido'
  | 'error';
export type ZonaResultado<T> = { ok: true; data: T } | { ok: false; error: ZonaError };

export interface ZonaBasica {
  id: number;
  codigo_zona: string;
  zona: string;
  id_sucursal: number;
}

type CamposEditables = Pick<ZonaNormalizada, 'codigo_zona' | 'zona' | 'descripcion_zona' | 'canal_venta'>;

// PostgREST devuelve una relación a-uno como objeto o como arreglo según la restricción de unicidad
function primero<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

const nombreCompleto = (p: { nombres: string; apellidos: string } | null) =>
  p ? `${p.apellidos}, ${p.nombres}` : '';

/** Zonas con su sucursal, su supervisor y la cantidad de rutas. `idSucursal` acota el alcance. */
export async function listarZonas(idSucursal: number | null): Promise<ZonaResultado<ZonaItem[]>> {
  const supabase = createAdminClient();

  let consulta = supabase
    .from('zonas')
    .select(
      `id, codigo_zona, zona, descripcion_zona, canal_venta, id_sucursal,
       sucursales ( nombre_sucursal ),
       supervisor_zonas ( id_supervisor, personas ( nombres, apellidos ) )`
    )
    .order('codigo_zona');
  if (idSucursal !== null) consulta = consulta.eq('id_sucursal', idSucursal);

  const [zonas, rutas] = await Promise.all([consulta, supabase.from('rutas').select('id_zona')]);
  if (zonas.error || rutas.error) return { ok: false, error: 'error' };

  const rutasPorZona = new Map<number, number>();
  for (const r of rutas.data ?? []) {
    rutasPorZona.set(r.id_zona, (rutasPorZona.get(r.id_zona) ?? 0) + 1);
  }

  const data = (zonas.data ?? []).map((z): ZonaItem => {
    const sucursal = primero(z.sucursales);
    const asignacion = primero(z.supervisor_zonas);
    const persona = primero(asignacion?.personas);
    return {
      id: z.id,
      codigo_zona: z.codigo_zona,
      zona: z.zona,
      descripcion_zona: z.descripcion_zona,
      canal_venta: z.canal_venta,
      id_sucursal: z.id_sucursal,
      sucursal_nombre: sucursal?.nombre_sucursal ?? '',
      supervisor: asignacion ? { id_persona: asignacion.id_supervisor, nombre: nombreCompleto(persona) } : null,
      total_rutas: rutasPorZona.get(z.id) ?? 0,
    };
  });
  return { ok: true, data };
}

/** Sucursales visibles para el solicitante (todas con alcance global, solo la propia con alcance de sucursal) */
export async function listarSucursales(
  idSucursal: number | null
): Promise<ZonaResultado<Array<{ id: number; nombre: string }>>> {
  let consulta = createAdminClient().from('sucursales').select('id, nombre_sucursal').order('nombre_sucursal');
  if (idSucursal !== null) consulta = consulta.eq('id', idSucursal);
  const { data, error } = await consulta;
  if (error) return { ok: false, error: 'error' };
  return { ok: true, data: (data ?? []).map((s) => ({ id: s.id, nombre: s.nombre_sucursal })) };
}

export async function obtenerZona(id: number): Promise<ZonaResultado<ZonaBasica>> {
  const { data, error } = await createAdminClient()
    .from('zonas')
    .select('id, codigo_zona, zona, id_sucursal')
    .eq('id', id)
    .maybeSingle();
  if (error) return { ok: false, error: 'error' };
  if (!data) return { ok: false, error: 'no_encontrada' };
  return { ok: true, data };
}

/**
 * Candidatos a supervisar zonas: colaboradores con el rol de acceso Supervisor y sin baja.
 * El permiso nunca se deriva del cargo (ADR-001 §D), por eso se parte del rol y no del cargo.
 */
export async function listarSupervisores(idSucursal: number | null): Promise<ZonaResultado<SupervisorCandidato[]>> {
  let consulta = createAdminClient()
    .from('usuario_roles')
    .select('id_persona, id_sucursal, roles!inner ( codigo ), personas!inner ( nombres, apellidos, fecha_baja )')
    .eq('roles.codigo', 'SUPERVISOR')
    .is('personas.fecha_baja', null)
    .not('id_sucursal', 'is', null);
  if (idSucursal !== null) consulta = consulta.eq('id_sucursal', idSucursal);

  const { data, error } = await consulta;
  if (error) return { ok: false, error: 'error' };

  const vistos = new Set<string>();
  const candidatos: SupervisorCandidato[] = [];
  for (const fila of data ?? []) {
    const clave = `${fila.id_persona}:${fila.id_sucursal}`;
    if (vistos.has(clave) || fila.id_sucursal === null) continue;
    vistos.add(clave);
    candidatos.push({
      id_persona: fila.id_persona,
      id_sucursal: fila.id_sucursal,
      nombre: nombreCompleto(primero(fila.personas)),
    });
  }
  candidatos.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { ok: true, data: candidatos };
}

export async function crearZona(
  datos: CamposEditables & { id_sucursal: number }
): Promise<ZonaResultado<ZonaBasica>> {
  const { data, error } = await createAdminClient()
    .from('zonas')
    .insert(datos)
    .select('id, codigo_zona, zona, id_sucursal')
    .single();
  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) return { ok: false, error: 'duplicado' };
    // En un alta, la violación de la clave foránea indica que la sucursal no existe
    if (error.code === PG_FOREIGN_KEY_VIOLATION) return { ok: false, error: 'sucursal_invalida' };
    return { ok: false, error: 'error' };
  }
  return { ok: true, data };
}

export async function actualizarZona(id: number, datos: CamposEditables): Promise<ZonaResultado<ZonaBasica>> {
  const { data, error } = await createAdminClient()
    .from('zonas')
    .update(datos)
    .eq('id', id)
    .select('id, codigo_zona, zona, id_sucursal')
    .maybeSingle();
  if (error) return { ok: false, error: error.code === PG_UNIQUE_VIOLATION ? 'duplicado' : 'error' };
  if (!data) return { ok: false, error: 'no_encontrada' };
  return { ok: true, data };
}

export type CambioSucursalError =
  | 'duplicado'
  | 'sucursal_invalida'
  | 'no_encontrada'
  | 'con_rutas'
  | 'con_supervisor'
  | 'error';

/**
 * Corrige la sucursal de la zona junto con sus datos (CU-04 A4). La función de base de datos
 * verifica que no tenga rutas ni supervisor y cambia la sucursal con la fila bloqueada, así que el
 * resultado es atómico. Quién puede invocarla se decide antes, en la API.
 */
export async function cambiarSucursalZona(
  id: number,
  idSucursal: number,
  datos: CamposEditables
): Promise<{ ok: true; data: { anterior: number } } | { ok: false; error: CambioSucursalError }> {
  const { data, error } = await createAdminClient().rpc('zona_cambiar_sucursal', {
    p_id: id,
    p_id_sucursal: idSucursal,
    p_codigo_zona: datos.codigo_zona,
    p_zona: datos.zona,
    p_descripcion_zona: datos.descripcion_zona ?? undefined,
    p_canal_venta: datos.canal_venta ?? undefined,
  });
  if (error || data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'error' };
  }
  if (data.ok === true) {
    return { ok: true, data: { anterior: Number(data.id_sucursal_anterior) } };
  }
  return { ok: false, error: data.error as CambioSucursalError };
}

export async function eliminarZona(id: number): Promise<ZonaResultado<null>> {
  const { data, error } = await createAdminClient().from('zonas').delete().eq('id', id).select('id');
  if (error) return { ok: false, error: error.code === PG_FOREIGN_KEY_VIOLATION ? 'en_uso' : 'error' };
  if (!data || data.length === 0) return { ok: false, error: 'no_encontrada' };
  return { ok: true, data: null };
}

/** Supervisor vigente de la zona (para auditar el cambio), o null si no tiene */
async function supervisorActual(idZona: number): Promise<number | null> {
  const { data } = await createAdminClient()
    .from('supervisor_zonas')
    .select('id_supervisor')
    .eq('id_zona', idZona)
    .maybeSingle();
  return data?.id_supervisor ?? null;
}

/**
 * Asigna o cambia el supervisor de la zona (CU-07): como máximo uno por zona. Debe ser un
 * supervisor con acceso en la sucursal de la zona y sin baja.
 */
export async function asignarSupervisor(
  zona: ZonaBasica,
  idPersona: number
): Promise<ZonaResultado<{ anterior: number | null }>> {
  const candidatos = await listarSupervisores(zona.id_sucursal);
  if (!candidatos.ok) return candidatos;
  if (!candidatos.data.some((c) => c.id_persona === idPersona)) {
    return { ok: false, error: 'supervisor_invalido' };
  }

  const anterior = await supervisorActual(zona.id);
  const { error } = await createAdminClient()
    .from('supervisor_zonas')
    .upsert({ id_zona: zona.id, id_supervisor: idPersona }, { onConflict: 'id_zona' });
  if (error) return { ok: false, error: 'error' };
  return { ok: true, data: { anterior } };
}

/** Deja la zona sin supervisor (CU-07 A1). Es idempotente: si no tenía, no falla. */
export async function quitarSupervisor(idZona: number): Promise<ZonaResultado<{ anterior: number | null }>> {
  const anterior = await supervisorActual(idZona);
  const { error } = await createAdminClient().from('supervisor_zonas').delete().eq('id_zona', idZona);
  if (error) return { ok: false, error: 'error' };
  return { ok: true, data: { anterior } };
}
