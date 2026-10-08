// Armado del archivo de respaldo del territorio (CU-05, ADR-002 D6). Sin dependencias de Node.
import type { ContornoZona, RutaExportable } from '@/types';

export interface ColeccionTerritorio {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: Record<string, string | number | null>;
    geometry: ContornoZona['geojson'];
  }>;
}

/**
 * Colección GeoJSON con una entidad por ruta y, si se piden, una por contorno de zona. Cada
 * entidad lleva `tipo` para distinguirlas. La exportación de UNA ruta trae solo esa entidad,
 * así el archivo se puede volver a importar tal cual (un FeatureCollection con una sola ruta).
 */
export function armarColeccionTerritorio(
  rutas: RutaExportable[],
  contornos: ContornoZona[],
  zonasPorId: Map<number, { codigo_zona: string; zona: string }>
): ColeccionTerritorio {
  return {
    type: 'FeatureCollection',
    features: [
      ...contornos.map((c) => ({
        type: 'Feature' as const,
        properties: {
          tipo: 'zona',
          id_zona: c.id_zona,
          codigo_zona: zonasPorId.get(c.id_zona)?.codigo_zona ?? null,
          zona: zonasPorId.get(c.id_zona)?.zona ?? null,
        },
        geometry: c.geojson,
      })),
      ...rutas.map((r) => ({
        type: 'Feature' as const,
        properties: {
          tipo: 'ruta',
          id: r.id,
          codigo_ruta: r.codigo_ruta,
          ruta: r.ruta,
          descripcion_ruta: r.descripcion_ruta,
          id_zona: r.id_zona,
          codigo_zona: r.codigo_zona,
        },
        geometry: r.geojson,
      })),
    ],
  };
}

/** Solo letras, números y guiones: el nombre viaja en la cabecera Content-Disposition */
const limpiar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

/** Nombre del archivo de respaldo: `ruta-R-N1-2026-10-08.geojson`, `zona-ZN-…` o `territorio-…` */
export function nombreArchivoExportacion(
  objetivo: { tipo: 'ruta'; codigo: string } | { tipo: 'zona'; codigo: string } | { tipo: 'todo' },
  fecha: string
): string {
  const base = objetivo.tipo === 'todo' ? 'territorio' : `${objetivo.tipo}-${limpiar(objetivo.codigo)}`;
  return `${base}-${fecha}.geojson`;
}
