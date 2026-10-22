import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { alcanceDeRutas, PERMISO_RUTAS } from '@/utils/rutaScope';
import { zonasEnAlcance, type GuardadoRuta } from '@/lib/rutas';
import type { UserSession, ZonaDeRuta } from '@/types';
import { descripcionSuperposicion, mensajeCobertura, mensajeInvasion, revisionDeZonasAjenas } from '@/utils/invasionZona';
import { mensajeCodigoDuplicado } from '@/utils/rutaValidation';

export interface ContextoRutas {
  caller: UserSession;
  zonas: ZonaDeRuta[];
  idsZona: Set<number>;
}

/** Autentica, exige `rutas:gestionar` y resuelve las zonas en las que el solicitante puede operar */
export async function resolverContextoRutas(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<ContextoRutas | null> {
  const caller = await requireCallerAuth(req, res, PERMISO_RUTAS);
  if (!caller) return null;

  const alcance = alcanceDeRutas(caller);
  if (alcance.tipo === 'denegado') {
    res.status(403).json({ error: 'Sin sucursal asignada' });
    return null;
  }

  const zonas = await zonasEnAlcance(alcance);
  if (!zonas.ok) {
    res.status(500).json({ error: 'No se pudo obtener el territorio.' });
    return null;
  }
  return { caller, zonas: zonas.data, idsZona: new Set(zonas.data.map((z) => z.id)) };
}

/** El cuerpo puede traer el GeoJSON como texto (archivo leído) o como objeto ya interpretado */
export function geoJsonComoTexto(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  return valor === undefined || valor === null ? '' : JSON.stringify(valor);
}

const MENSAJES_GEOMETRIA: Record<string, string> = {
  geojson_invalido: 'El GeoJSON no se pudo interpretar.',
  no_poligono: 'La geometría debe ser de tipo Polygon.',
  geometria_invalida: 'El polígono no es válido (por ejemplo, se cruza a sí mismo).',
  superposicion: 'La ruta se superpone con otra ruta existente.',
  zona_invalida: 'La zona indicada no existe.',
  no_encontrada: 'La ruta no existe.',
};

/** Código de la zona para los mensajes; vacío si no está en el alcance */
export const codigoDeZona = (zonas: ZonaDeRuta[], idZona: number) => zonas.find((z) => z.id === idZona)?.codigo_zona ?? '';

/**
 * Traduce un guardado fallido a su respuesta HTTP (A1 superposición, A2 archivo inválido,
 * invasión de la envolvente de `codigoZona` según ADR-002 D7)
 */
export function responderFalloGuardado(
  res: NextApiResponse,
  fallo: Extract<GuardadoRuta, { ok: false }>,
  codigoZona: string,
  codigoRuta: string
) {
  const mensaje = MENSAJES_GEOMETRIA[fallo.error] ?? 'No se pudo guardar la ruta.';
  switch (fallo.error) {
    case 'superposicion': {
      const conflictos = fallo.conflictos ?? [];
      const con = conflictos.length > 0 ? descripcionSuperposicion(conflictos) : 'otra ruta existente';
      const revision = revisionDeZonasAjenas(conflictos);
      return res.status(409).json({
        error: `La ruta se superpone con ${con}.${revision ? ` ${revision}` : ''}`,
        conflictos,
      });
    }
    case 'invasion':
      return res.status(409).json({
        error: mensajeInvasion(codigoZona, fallo.conflictos ?? []),
        conflictos: fallo.conflictos ?? [],
      });
    case 'cobertura':
      return res.status(409).json({
        error: mensajeCobertura(fallo.conflictos ?? []),
        conflictos: fallo.conflictos ?? [],
      });
    case 'duplicado':
      return res.status(409).json({ error: mensajeCodigoDuplicado(codigoRuta, fallo.codigo_zona_duplicada) });
    case 'no_encontrada':
      return res.status(404).json({ error: mensaje });
    case 'geojson_invalido':
    case 'no_poligono':
    case 'geometria_invalida':
    case 'zona_invalida':
      return res.status(400).json({ error: fallo.detalle ? `${mensaje} ${fallo.detalle}` : mensaje });
    default:
      return res.status(500).json({ error: mensaje });
  }
}
