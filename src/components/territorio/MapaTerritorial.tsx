"use client";

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { setWorkerUrl } from 'maplibre-gl';
import { FullscreenControl, Layer, Map, NavigationControl, Source } from '@vis.gl/react-maplibre';
import type { MapEvent, MapLayerMouseEvent, MapRef } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CapaDibujo } from '@/components/territorio/CapaDibujo';
import type { Posicion } from '@/utils/ajusteVertices';
import { COLOR_CONFLICTO, COLOR_INVALIDO, COLOR_PROPUESTA, PALETA_ZONAS } from '@/utils/coloresTerritorio';
import type { ConflictoRuta, ContornoZona, PoligonoRuta, RutaItem } from '@/types';

// MapLibre 6 no resuelve solo la URL de su worker bajo el empaquetador: se sirve desde public/maplibre/
// (lo copia scripts/copiar-worker-maplibre.mjs) y debe registrarse antes de crear el mapa (ADR-002 §4).
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

// Mapa base de OpenFreeMap (ADR-002 D5); el proveedor definitivo se decide antes de producción
const ESTILO_BASE = 'https://tiles.openfreemap.org/styles/liberty';

const VISTA_INICIAL = { longitude: -63.18, latitude: -17.78, zoom: 11 };

interface MapaTerritorialProps {
  rutas: RutaItem[];
  seleccionId: number | null;
  onSeleccionar: (id: number | null) => void;
  /** Polígono importado aún sin confirmar (vista previa) */
  vistaPrevia: PoligonoRuta | null;
  /** La vista previa no es guardable: se pinta en rojo */
  vistaPreviaInvalida: boolean;
  /** Rutas existentes con las que se superpone la propuesta (A1) */
  conflictos: ConflictoRuta[];
  /** Contorno de cada zona, derivado de sus rutas (ADR-002 D6) */
  contornos: ContornoZona[];
  /** Color de cada zona: sus rutas y su contorno se pintan con él */
  coloresZona: globalThis.Map<number, string>;
  /** Elemento que pasa a pantalla completa (incluye las capas flotantes sobre el mapa) */
  idPantallaCompleta: string;
  /** Dibujo o edición del polígono en curso; null si no se está dibujando */
  dibujo: {
    clave: number;
    poligonoInicial: PoligonoRuta | null;
    verticesVecinos: Posicion[];
    onCambio: (poligono: PoligonoRuta) => void;
  } | null;
}

type Coleccion = GeoJSON.FeatureCollection<GeoJSON.Polygon, Record<string, unknown>>;

const coleccion = (poligonos: Array<{ poligono: PoligonoRuta; propiedades: Record<string, unknown> }>): Coleccion => ({
  type: 'FeatureCollection',
  features: poligonos.map(({ poligono, propiedades }) => ({
    type: 'Feature',
    properties: propiedades,
    geometry: poligono,
  })),
});

/** Caja [oeste, sur, este, norte] que contiene todos los polígonos, o null si no hay ninguno */
function cajaDe(poligonos: PoligonoRuta[]): [number, number, number, number] | null {
  let caja: [number, number, number, number] | null = null;
  for (const p of poligonos) {
    for (const [lon, lat] of p.coordinates[0] ?? []) {
      caja = caja
        ? [Math.min(caja[0], lon), Math.min(caja[1], lat), Math.max(caja[2], lon), Math.max(caja[3], lat)]
        : [lon, lat, lon, lat];
    }
  }
  return caja;
}

export function MapaTerritorial({
  rutas,
  seleccionId,
  onSeleccionar,
  vistaPrevia,
  vistaPreviaInvalida,
  conflictos,
  contornos,
  coloresZona,
  idPantallaCompleta,
  dibujo,
}: MapaTerritorialProps) {
  const colorDe = useCallback((idZona: number) => coloresZona.get(idZona) ?? PALETA_ZONAS[0], [coloresZona]);

  const mapaRef = useRef<MapRef>(null);

  const datosRutas = useMemo(
    () =>
      coleccion(
        rutas.map((r) => ({
          poligono: r.geojson,
          propiedades: { id: r.id, color: colorDe(r.id_zona), seleccionada: r.id === seleccionId },
        }))
      ),
    [rutas, seleccionId, colorDe]
  );
  const datosConflictos = useMemo(
    () =>
      coleccion(
        conflictos.flatMap((c) => (c.geojson ? [{ poligono: c.geojson, propiedades: { id: c.id } }] : []))
      ),
    [conflictos]
  );
  const datosContornos = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: contornos.map((c) => ({ type: 'Feature', properties: { color: colorDe(c.id_zona) }, geometry: c.geojson })),
    }),
    [contornos, colorDe]
  );
  const datosVistaPrevia = useMemo(
    () => coleccion(vistaPrevia ? [{ poligono: vistaPrevia, propiedades: {} }] : []),
    [vistaPrevia]
  );

  // Encuadre: la vista previa manda mientras exista; si no, la ruta elegida o el conjunto
  // Mientras se dibuja solo se encuadra al empezar: re-encuadrar en cada vértice molestaría
  const poligonoDibujo = dibujo?.poligonoInicial ?? null;
  const dibujando = dibujo !== null;
  const cajaEncuadre = useMemo(() => {
    if (dibujando) return poligonoDibujo ? cajaDe([poligonoDibujo]) : null;
    if (vistaPrevia) return cajaDe([vistaPrevia, ...conflictos.flatMap((c) => (c.geojson ? [c.geojson] : []))]);
    const elegida = rutas.find((r) => r.id === seleccionId);
    return cajaDe(elegida ? [elegida.geojson] : rutas.map((r) => r.geojson));
  }, [dibujando, poligonoDibujo, vistaPrevia, conflictos, rutas, seleccionId]);

  // Al salir del dibujo o de una previsualización (Descartar, Guardar) el mapa se queda donde
  // está: el usuario venía trabajando en esa área y un salto de vista lo desorienta
  const modo = dibujando ? 'dibujo' : vistaPrevia ? 'previsualizacion' : 'normal';
  const modoAnterior = useRef(modo);
  const encuadrar = useCallback(
    (duracion: number) => {
      if (!cajaEncuadre) return;
      const [oeste, sur, este, norte] = cajaEncuadre;
      mapaRef.current?.fitBounds([[oeste, sur], [este, norte]], { padding: 48, duration: duracion, maxZoom: 16 });
    },
    [cajaEncuadre]
  );
  useEffect(() => {
    const veniaEditando = modoAnterior.current !== 'normal';
    modoAnterior.current = modo;
    if (modo === 'normal' && veniaEditando) return;
    encuadrar(600);
  }, [encuadrar, modo]);

  // En pantallas angostas el mapa puede montarse oculto (ancho 0): el encuadre calculado así
  // queda corrido, así que al hacerse visible se vuelve a encuadrar
  const anchoAnterior = useRef(0);
  const alRedimensionar = (e: MapEvent) => {
    const ancho = e.target.getContainer().clientWidth;
    if (anchoAnterior.current === 0 && ancho > 0) encuadrar(0);
    anchoAnterior.current = ancho;
  };

  const alHacerClic = (e: MapLayerMouseEvent) => {
    const id = e.features?.[0]?.properties?.id;
    onSeleccionar(typeof id === 'number' ? id : null);
  };

  return (
    <Map
      ref={mapaRef}
      mapLib={import('maplibre-gl')}
      initialViewState={VISTA_INICIAL}
      mapStyle={ESTILO_BASE}
      // Mientras se dibuja, los clics son del dibujo y no seleccionan rutas
      interactiveLayerIds={dibujo ? [] : ['rutas-relleno']}
      onClick={alHacerClic}
      onResize={alRedimensionar}
      cursor="auto"
    >
      {/* Arriba quedan la leyenda y las herramientas; los controles del mapa van abajo a la derecha */}
      <NavigationControl position="bottom-right" showCompass={false} />
      <FullscreenControl position="bottom-right" containerId={idPantallaCompleta} />

      <Source id="contornos" type="geojson" data={datosContornos}>
        <Layer
          id="contornos-borde"
          type="line"
          paint={{ 'line-color': ['get', 'color'], 'line-width': 2.5, 'line-dasharray': [4, 2], 'line-opacity': 0.9 }}
        />
      </Source>

      <Source id="rutas" type="geojson" data={datosRutas}>
        <Layer
          id="rutas-relleno"
          type="fill"
          paint={{
            'fill-color': ['get', 'color'],
            'fill-opacity': ['case', ['get', 'seleccionada'], 0.45, 0.12],
          }}
        />
        <Layer
          id="rutas-borde"
          type="line"
          paint={{
            'line-color': ['get', 'color'],
            'line-width': ['case', ['get', 'seleccionada'], 3, 2],
            'line-opacity': ['case', ['get', 'seleccionada'], 1, 0.8],
          }}
        />
      </Source>

      <Source id="conflictos" type="geojson" data={datosConflictos}>
        <Layer id="conflictos-relleno" type="fill" paint={{ 'fill-color': COLOR_CONFLICTO, 'fill-opacity': 0.45 }} />
        <Layer id="conflictos-borde" type="line" paint={{ 'line-color': COLOR_CONFLICTO, 'line-width': 3 }} />
      </Source>

      <Source id="vista-previa" type="geojson" data={datosVistaPrevia}>
        <Layer
          id="vista-previa-relleno"
          type="fill"
          paint={{ 'fill-color': vistaPreviaInvalida ? COLOR_INVALIDO : COLOR_PROPUESTA, 'fill-opacity': 0.3 }}
        />
        <Layer
          id="vista-previa-borde"
          type="line"
          paint={{
            'line-color': vistaPreviaInvalida ? COLOR_INVALIDO : COLOR_PROPUESTA,
            'line-width': 3,
            'line-dasharray': [2, 1],
          }}
        />
      </Source>

      {dibujo && (
        <CapaDibujo
          key={dibujo.clave}
          poligonoInicial={dibujo.poligonoInicial}
          verticesVecinos={dibujo.verticesVecinos}
          onCambio={dibujo.onCambio}
        />
      )}
    </Map>
  );
}
