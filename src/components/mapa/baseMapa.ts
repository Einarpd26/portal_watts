import { setWorkerUrl } from 'maplibre-gl';
import type { MapRef } from '@vis.gl/react-maplibre';
import type { MultiPoligonoGeoJson, PoligonoRuta } from '@/types';

// Base común de los mapas de la aplicación: Territorio, importación de rutas y planificación.
// MapLibre 6 no resuelve solo la URL de su worker bajo el empaquetador: se sirve desde public/maplibre/
// (lo copia scripts/copiar-worker-maplibre.mjs) y debe registrarse antes de crear el mapa (ADR-002 §4).
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

// Mapa base de OpenFreeMap (ADR-002 D5); el proveedor definitivo se decide antes de producción
export const ESTILO_BASE = 'https://tiles.openfreemap.org/styles/liberty';

export const VISTA_INICIAL = { longitude: -63.18, latitude: -17.78, zoom: 11 };

/** Caja [oeste, sur, este, norte] */
export type CajaGeografica = [number, number, number, number];

/** Caja que contiene todos los polígonos, o null si no hay ninguno */
export function cajaDe(poligonos: Array<PoligonoRuta | MultiPoligonoGeoJson>): CajaGeografica | null {
  let caja: CajaGeografica | null = null;
  // El anillo exterior basta para la caja; un MultiPolygon aporta el de cada parte
  const anillos = poligonos.flatMap((p) => (p.type === 'Polygon' ? [p.coordinates[0] ?? []] : p.coordinates.map((c) => c[0] ?? [])));
  for (const anillo of anillos) {
    for (const [lon, lat] of anillo) {
      caja = caja
        ? [Math.min(caja[0], lon), Math.min(caja[1], lat), Math.max(caja[2], lon), Math.max(caja[3], lat)]
        : [lon, lat, lon, lat];
    }
  }
  return caja;
}

interface OpcionesEncuadre {
  /** Fracción del lado menor de la vista que queda libre alrededor de la caja */
  margen: number;
  /** Margen mínimo en píxeles */
  margenMinimo: number;
  zoomMaximo: number;
  duracion: number;
}

/** Acerca el mapa a la caja con un margen proporcional a la vista, sin llenar la pantalla con ella */
export function encuadrarEnCaja(mapa: MapRef, caja: CajaGeografica, { margen, margenMinimo, zoomMaximo, duracion }: OpcionesEncuadre) {
  const [oeste, sur, este, norte] = caja;
  const { clientWidth, clientHeight } = mapa.getContainer();
  const padding = Math.max(margenMinimo, Math.round(Math.min(clientWidth, clientHeight) * margen));
  mapa.fitBounds([[oeste, sur], [este, norte]], { padding, duration: duracion, maxZoom: zoomMaximo });
}
