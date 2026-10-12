import { createAdminClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import type {
  ConflictoRuta,
  ContornoZona,
  ErrorGeometriaRuta,
  PoligonoRuta,
  RutaEvaluacion,
  RutaExportable,
  RutaItem,
  ZonaDeRuta,
} from '@/types';
import type { AlcanceRutas } from '@/utils/rutaScope';
import type { RutaNormalizada } from '@/utils/rutaValidation';

export type RutaError = ErrorGeometriaRuta | 'invasion' | 'cobertura' | 'duplicado' | 'zona_invalida' | 'no_encontrada' | 'error';
export type RutaResultado<T> = { ok: true; data: T } | { ok: false; error: RutaError };

export interface RutaBasica {
  id: number;
  codigo_ruta: string;
  id_zona: number;
  id_sucursal: number;
}

type FilaConflicto = {
  id: number;
  codigo_ruta: string;
  id_zona: number;
  area_m2: number;
  geojson: PoligonoRuta;
  // Solo en las invasiones (ADR-002 D7)
  codigo_zona?: string;
  misma_sucursal?: boolean;
};

type FilaCobertura = {
  id_zona: number;
  codigo_zona: string;
  area_m2: number;
  geojson: PoligonoRuta;
};

// PostgREST devuelve una relación a-uno como objeto o como arreglo según la restricción de unicidad
function primero<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Zonas en las que el solicitante puede operar rutas, según su alcance */
export async function zonasEnAlcance(alcance: AlcanceRutas): Promise<RutaResultado<ZonaDeRuta[]>> {
  if (alcance.tipo === 'denegado') return { ok: true, data: [] };
  const supabase = createAdminClient();
  const columnas = 'id, codigo_zona, zona, id_sucursal, sucursales ( nombre_sucursal )';

  const aZona = (z: {
    id: number;
    codigo_zona: string;
    zona: string;
    id_sucursal: number;
    sucursales: { nombre_sucursal: string } | { nombre_sucursal: string }[] | null;
  }): ZonaDeRuta => ({
    id: z.id,
    codigo_zona: z.codigo_zona,
    zona: z.zona,
    id_sucursal: z.id_sucursal,
    sucursal_nombre: primero(z.sucursales)?.nombre_sucursal ?? '',
  });

  if (alcance.tipo === 'supervisor') {
    const { data, error } = await supabase
      .from('supervisor_zonas')
      .select(`zonas!inner ( ${columnas} )`)
      .eq('id_supervisor', alcance.id_persona);
    if (error) return { ok: false, error: 'error' };
    const zonas = (data ?? []).flatMap((f) => {
      const z = primero(f.zonas);
      return z ? [aZona(z)] : [];
    });
    return { ok: true, data: zonas.sort((a, b) => a.codigo_zona.localeCompare(b.codigo_zona)) };
  }

  let consulta = supabase.from('zonas').select(columnas).order('codigo_zona');
  if (alcance.tipo === 'sucursales') consulta = consulta.in('id_sucursal', alcance.ids);
  const { data, error } = await consulta;
  if (error) return { ok: false, error: 'error' };
  return { ok: true, data: (data ?? []).map(aZona) };
}

/** Rutas de las zonas indicadas, con el polígono simplificado para el mapa (RNF-02) */
export async function listarRutas(idsZona: number[]): Promise<RutaResultado<RutaItem[]>> {
  if (idsZona.length === 0) return { ok: true, data: [] };
  const { data, error } = await createAdminClient().rpc('rutas_listar', { p_ids_zona: idsZona });
  if (error) return { ok: false, error: 'error' };
  return {
    ok: true,
    data: (data ?? []).map((r) => ({ ...r, geojson: r.geojson as unknown as PoligonoRuta })),
  };
}

/** Tolerancia de simplificación del contorno que se dibuja en el mapa (~1 m, como las rutas) */
const TOLERANCIA_MAPA = 0.00001;

/**
 * Contorno de cada zona, derivado de la unión de sus rutas (ADR-002 D6). `completo` lo devuelve
 * sin simplificar, para el respaldo; si no, simplificado para el mapa.
 */
export async function contornosDeZonas(idsZona: number[], completo: boolean): Promise<RutaResultado<ContornoZona[]>> {
  if (idsZona.length === 0) return { ok: true, data: [] };
  const { data, error } = await createAdminClient().rpc('zonas_contorno', {
    p_ids_zona: idsZona,
    p_tolerancia: completo ? 0 : TOLERANCIA_MAPA,
  });
  if (error) return { ok: false, error: 'error' };
  return {
    ok: true,
    data: (data ?? []).map((c) => ({ id_zona: c.id_zona, geojson: c.geojson as unknown as ContornoZona['geojson'] })),
  };
}

/** Rutas con su polígono completo para el respaldo; `idRuta` acota a una sola */
export async function exportarRutas(idsZona: number[], idRuta: number | null): Promise<RutaResultado<RutaExportable[]>> {
  if (idsZona.length === 0) return { ok: true, data: [] };
  const { data, error } = await createAdminClient().rpc('rutas_exportar', {
    p_ids_zona: idsZona,
    p_id_ruta: idRuta ?? undefined,
  });
  if (error) return { ok: false, error: 'error' };
  return { ok: true, data: (data ?? []).map((r) => ({ ...r, geojson: r.geojson as unknown as PoligonoRuta })) };
}

/** Datos mínimos de una ruta con la sucursal de su zona, para decidir el alcance */
export async function obtenerRuta(id: number): Promise<RutaResultado<RutaBasica>> {
  const { data, error } = await createAdminClient()
    .from('rutas')
    .select('id, codigo_ruta, id_zona, zonas!inner ( id_sucursal )')
    .eq('id', id)
    .maybeSingle();
  if (error) return { ok: false, error: 'error' };
  if (!data) return { ok: false, error: 'no_encontrada' };
  const zona = primero(data.zonas);
  if (!zona) return { ok: false, error: 'error' };
  return { ok: true, data: { id: data.id, codigo_ruta: data.codigo_ruta, id_zona: data.id_zona, id_sucursal: zona.id_sucursal } };
}

/**
 * Interpreta los conflictos que devuelve la base. Una ruta ajena al alcance del solicitante
 * se informa sin código ni polígono: basta saber que existe para rechazar el guardado. Una
 * invasión es trasladable si la ruta está en el alcance y en la misma sucursal (ADR-002 D4 y D7).
 */
function interpretarConflictos(
  crudos: unknown,
  idsZonaEnAlcance: Set<number>,
  tipo: ConflictoRuta['tipo']
): ConflictoRuta[] {
  if (!Array.isArray(crudos)) return [];
  return (crudos as FilaConflicto[]).map((c) =>
    idsZonaEnAlcance.has(c.id_zona)
      ? {
          tipo,
          id: c.id,
          codigo_ruta: c.codigo_ruta,
          codigo_zona: c.codigo_zona ?? null,
          area_m2: c.area_m2,
          geojson: c.geojson,
          fuera_de_alcance: false,
          trasladable: tipo === 'invasion' && c.misma_sucursal === true,
        }
      : {
          tipo,
          id: null,
          codigo_ruta: null,
          codigo_zona: null,
          area_m2: c.area_m2,
          geojson: null,
          fuera_de_alcance: true,
          trasladable: false,
        }
  );
}

/**
 * Zonas ajenas cuya envolvente cubriría el polígono. Se informan con su código y su envolvente aunque
 * estén fuera del alcance de quien opera: el supervisor necesita saber a qué zona pedirle el espacio
 * a la Gerencia o al Fiscalizador. `fuera_de_alcance` dice que no podrá modificarla él mismo.
 */
function interpretarCoberturas(crudas: unknown, idsZonaEnAlcance: Set<number>): ConflictoRuta[] {
  if (!Array.isArray(crudas)) return [];
  return (crudas as FilaCobertura[]).map((c) => ({
    tipo: 'cobertura' as const,
    id: null,
    codigo_ruta: null,
    codigo_zona: c.codigo_zona,
    area_m2: c.area_m2,
    geojson: c.geojson,
    fuera_de_alcance: !idsZonaEnAlcance.has(c.id_zona),
    trasladable: false,
  }));
}

/** Superposiciones primero (se resuelven en el polígono), luego invasiones y coberturas de envolvente */
const todosLosConflictos = (crudo: Record<string, unknown>, idsZonaEnAlcance: Set<number>) => [
  ...interpretarConflictos(crudo.conflictos, idsZonaEnAlcance, 'superposicion'),
  ...interpretarConflictos(crudo.invasiones, idsZonaEnAlcance, 'invasion'),
  ...interpretarCoberturas(crudo.coberturas, idsZonaEnAlcance),
];

function interpretarEvaluacion(crudo: Json, idsZonaEnAlcance: Set<number>): RutaEvaluacion | null {
  if (!esObjeto(crudo)) return null;
  if (crudo.ok === true) {
    return {
      ok: true,
      geojson: crudo.geojson as unknown as PoligonoRuta,
      vertices: Number(crudo.vertices),
      area_m2: Number(crudo.area_m2),
      conflictos: todosLosConflictos(crudo, idsZonaEnAlcance),
    };
  }
  const error = crudo.error as ErrorGeometriaRuta;
  return {
    ok: false,
    error,
    detalle: typeof crudo.detalle === 'string' ? crudo.detalle : undefined,
    conflictos: todosLosConflictos(crudo, idsZonaEnAlcance),
  };
}

/**
 * Vista previa de CU-05: normaliza y valida el polígono y busca superposiciones sin guardar nada.
 * Con `idZona` también busca las rutas de otras zonas que su envolvente pasaría a cubrir (D7).
 */
export async function evaluarRuta(
  geojson: string,
  excluirId: number | null,
  idZona: number | null,
  idsZonaEnAlcance: Set<number>
): Promise<RutaResultado<RutaEvaluacion>> {
  const { data, error } = await createAdminClient().rpc('ruta_evaluar', {
    p_geojson: geojson,
    p_excluir_id: excluirId ?? undefined,
    p_id_zona: idZona ?? undefined,
  });
  if (error) return { ok: false, error: 'error' };
  const evaluacion = interpretarEvaluacion(data, idsZonaEnAlcance);
  return evaluacion ? { ok: true, data: evaluacion } : { ok: false, error: 'error' };
}

export type GuardadoRuta =
  | { ok: true; id: number }
  | { ok: false; error: RutaError; detalle?: string; conflictos?: ConflictoRuta[] };

/**
 * Alta (`id` null) o edición de una ruta. La evaluación y la inserción corren en una sola
 * función de base de datos bajo el bloqueo consultivo de superposición, por lo que altas
 * simultáneas se serializan. `geojson` null en una edición conserva el polígono actual.
 */
export async function guardarRuta(
  id: number | null,
  datos: RutaNormalizada & { id_zona: number },
  geojson: string | null,
  idsZonaEnAlcance: Set<number>
): Promise<GuardadoRuta> {
  const { data, error } = await createAdminClient().rpc('ruta_guardar', {
    p_id: id ?? undefined,
    p_id_zona: datos.id_zona,
    p_codigo_ruta: datos.codigo_ruta,
    p_ruta: datos.ruta,
    p_descripcion_ruta: datos.descripcion_ruta ?? undefined,
    p_geojson: geojson ?? undefined,
  });
  if (error || !esObjeto(data)) return { ok: false, error: 'error' };
  if (data.ok === true) return { ok: true, id: Number(data.id) };
  return {
    ok: false,
    error: data.error as RutaError,
    detalle: typeof data.detalle === 'string' ? data.detalle : undefined,
    conflictos: todosLosConflictos(data, idsZonaEnAlcance),
  };
}

export type TrasladoRuta =
  | { ok: true }
  | { ok: false; error: RutaError; conflictos?: ConflictoRuta[] };

/**
 * Traslado de zona (CU-06): actualiza id_zona sin tocar el polígono. La base valida que la
 * envolvente de la zona destino no pase a cubrir rutas de otras zonas y que ninguna envolvente
 * (la de la zona de origen incluida) quede cubriendo la ruta (ADR-002 D7), bajo el mismo bloqueo
 * que el guardado. RN-05 (eliminar planificacion_rutas vigente) se aplica en CU-09 /
 * Ciclo 3 cuando esa tabla exista.
 */
export async function trasladarRuta(
  id: number,
  idZonaDestino: number,
  idsZonaEnAlcance: Set<number>
): Promise<TrasladoRuta> {
  const { data, error } = await createAdminClient().rpc('ruta_trasladar', {
    p_id: id,
    p_id_zona_destino: idZonaDestino,
  });
  if (error || !esObjeto(data)) return { ok: false, error: 'error' };
  if (data.ok === true) return { ok: true };
  return {
    ok: false,
    error: data.error as RutaError,
    conflictos: todosLosConflictos(data, idsZonaEnAlcance),
  };
}
