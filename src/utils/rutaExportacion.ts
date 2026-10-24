// Armado del archivo de respaldo del territorio (CU-05, ADR-002 D6 y D10). Sin dependencias de Node.
import type { RutaExportable } from '@/types';

export interface ColeccionTerritorio {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: Record<string, string | number | null>;
    geometry: RutaExportable['geojson'];
  }>;
}

type FeatureRuta = ColeccionTerritorio['features'][number];

const featureDeRuta = (r: RutaExportable): FeatureRuta => ({
  type: 'Feature',
  properties: {
    tipo: 'ruta',
    id: r.id,
    codigo_ruta: r.codigo_ruta,
    ruta: r.ruta,
    // CU-16 exige texto: una descripción vacía se omite en vez de ir como null
    ...(r.descripcion_ruta === null ? {} : { descripcion_ruta: r.descripcion_ruta }),
    id_zona: r.id_zona,
    codigo_zona: r.codigo_zona,
  },
  geometry: r.geojson,
});

/**
 * Colección GeoJSON con una entidad por ruta (ADR-002 D10). No lleva contornos de zona: son
 * derivados y se recalculan con las rutas, y el importador los rechazaría. Cada ruta lleva las
 * propiedades que CU-16 lee (`codigo_ruta`, `ruta`, `codigo_zona`, `descripcion_ruta`), así que el
 * archivo se puede volver a importar tal cual.
 */
export function armarColeccionTerritorio(rutas: RutaExportable[]): ColeccionTerritorio {
  return { type: 'FeatureCollection', features: rutas.map(featureDeRuta) };
}

export interface ArchivoRespaldo {
  nombre: string;
  sucursal: string;
  parte: number;
  rutas: number;
  bytes: number;
  contenido: string;
}

export interface LimitesRespaldo {
  maxRutas: number;
  maxBytes: number;
}

// Bytes que suma el envoltorio `{"type":"FeatureCollection","features":[...]}` y cada coma entre rutas
const BYTES_ENVOLTORIO = 64;

const bytesDe = (texto: string) => new TextEncoder().encode(texto).length;

/**
 * Respaldo para reimportar (ADR-002 D10): un archivo por sucursal, partido en tandas que caben en
 * un lote de CU-16 (cantidad de rutas y tamaño). Las rutas conservan el orden recibido y no se
 * parten entre archivos. `prefijo` da el inicio del nombre de cada sucursal.
 */
export function partirRespaldo(
  rutas: Array<RutaExportable & { sucursal: string }>,
  fecha: string,
  limites: LimitesRespaldo,
  prefijo: (sucursal: string) => string
): ArchivoRespaldo[] {
  const porSucursal = new Map<string, RutaExportable[]>();
  for (const { sucursal, ...ruta } of rutas) {
    porSucursal.set(sucursal, [...(porSucursal.get(sucursal) ?? []), ruta]);
  }

  const archivos: ArchivoRespaldo[] = [];
  for (const sucursal of [...porSucursal.keys()].sort((a, b) => a.localeCompare(b, 'es'))) {
    const tandas: RutaExportable[][] = [];
    let actual: RutaExportable[] = [];
    let bytes = BYTES_ENVOLTORIO;
    for (const ruta of porSucursal.get(sucursal) ?? []) {
      const tamano = bytesDe(JSON.stringify(featureDeRuta(ruta))) + 1;
      if (actual.length > 0 && (actual.length >= limites.maxRutas || bytes + tamano > limites.maxBytes)) {
        tandas.push(actual);
        actual = [];
        bytes = BYTES_ENVOLTORIO;
      }
      actual.push(ruta);
      bytes += tamano;
    }
    if (actual.length > 0) tandas.push(actual);

    tandas.forEach((tanda, i) => {
      const contenido = JSON.stringify(armarColeccionTerritorio(tanda));
      archivos.push({
        nombre: `${prefijo(sucursal)}-${fecha}-${i + 1}.geojson`,
        sucursal,
        parte: i + 1,
        rutas: tanda.length,
        bytes: bytesDe(contenido),
        contenido,
      });
    });
  }
  return archivos;
}

/** Solo letras, números y guiones: el nombre viaja en la cabecera Content-Disposition */
export const limpiar = (texto: string) =>
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
