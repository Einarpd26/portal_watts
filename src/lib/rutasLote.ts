import { createAdminClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import type { ResultadoDeLote } from '@/utils/rutaInforme';
import type { RutaLoteEntrada } from '@/utils/rutaValidation';

/** Resultado de una ruta tal como lo devuelve `ruta_lote_procesar` */
export type ResultadoSql = ResultadoDeLote & {
  id?: number;
  /** Polígono que tenía una ruta actualizada, para poder revertir el cambio */
  geojson_anterior?: unknown;
};

export type LoteSql =
  | { ok: true; resultados: ResultadoSql[] }
  | { ok: false; error: 'sucursal_invalida' | 'lote_invalido' | 'error' };

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Importación por lote (CU-16): recorre las rutas en el orden del archivo con las reglas de CU-05 y
 * deja cada una en su propia subtransacción. Sin `confirmar` no guarda nada: devuelve lo que haría.
 * `idsZona` son las zonas en las que quien opera puede trabajar; las demás se rechazan.
 */
export async function procesarLote(
  idSucursal: number,
  rutas: RutaLoteEntrada[],
  idsZona: number[],
  confirmar: boolean
): Promise<LoteSql> {
  const items = rutas.map((r) => ({
    indice: r.indice,
    codigo_ruta: r.codigo_ruta,
    ruta: r.ruta,
    descripcion_ruta: r.descripcion_ruta,
    codigo_zona: r.codigo_zona,
    poligono: r.poligono,
  }));

  const { data, error } = await createAdminClient().rpc('ruta_lote_procesar', {
    p_id_sucursal: idSucursal,
    p_items: items as unknown as Json,
    p_ids_zona: idsZona,
    p_confirmar: confirmar,
  });
  if (error || !esObjeto(data)) return { ok: false, error: 'error' };
  if (data.ok === true && Array.isArray(data.resultados)) return { ok: true, resultados: data.resultados as unknown as ResultadoSql[] };
  return { ok: false, error: data.error === 'sucursal_invalida' || data.error === 'lote_invalido' ? data.error : 'error' };
}
