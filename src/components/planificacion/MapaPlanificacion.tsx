"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Map, NavigationControl, Popup, Source } from '@vis.gl/react-maplibre';
import type { MapEvent, MapLayerMouseEvent, MapRef } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AtribucionMapa } from '@/components/mapa/AtribucionMapa';
import { ESTILO_BASE, VISTA_INICIAL, cajaDe, encuadrarEnCaja } from '@/components/mapa/baseMapa';
import { COLOR_DUPLICADA, type PropiedadesRutaEnMapa } from '@/utils/planificacionMapa';
import type { ContornoZona, RutaItem } from '@/types';

// Trazo de los límites de cada zona del supervisor: gris oscuro y punteado, sin competir con los colores de los slots
const COLOR_CONTORNO = '#374151'; // gray-700
const MARGEN_ENCUADRE = 0.15;
const ZOOM_MAXIMO_ENCUADRE = 14;

interface MapaPlanificacionProps {
  rutas: RutaItem[];
  contornos: ContornoZona[];
  /** Cómo se pinta cada ruta; se busca por id */
  propiedades: PropiedadesRutaEnMapa[];
  /** Una línea por visita de cada ruta, para el tooltip */
  descripciones: ReadonlyMap<number, string[]>;
  seleccionId: number | null;
  /** Clic sobre una ruta, o sobre el mapa vacío (null) */
  onClickRuta: (idRuta: number | null) => void;
}

interface RutaBajoElCursor {
  id: number;
  longitud: number;
  latitud: number;
}

/**
 * Mapa de la planificación (ADR-004 D3): cada ruta se pinta del color del slot que la cubre, con trazo
 * naranja si está duplicada, sobre el contorno de las zonas. Una sola fuente de datos y colores resueltos
 * por expresiones de estilo, para no recrear capas en cada cambio.
 */
export function MapaPlanificacion({ rutas, contornos, propiedades, descripciones, seleccionId, onClickRuta }: MapaPlanificacionProps) {
  const mapaRef = useRef<MapRef>(null);
  const [bajoElCursor, setBajoElCursor] = useState<RutaBajoElCursor | null>(null);

  const datosRutas = useMemo<GeoJSON.FeatureCollection>(() => {
    const porId = new globalThis.Map(propiedades.map((p) => [p.id, p]));
    return {
      type: 'FeatureCollection',
      features: rutas.map((r) => ({
        type: 'Feature',
        properties: { ...porId.get(r.id), seleccionada: r.id === seleccionId },
        geometry: r.geojson,
      })),
    };
  }, [rutas, propiedades, seleccionId]);

  const datosContornos = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: contornos.map((c) => ({ type: 'Feature', properties: { id: c.id_zona }, geometry: c.geojson })),
    }),
    [contornos]
  );

  // El mapa se encuadra sobre todo el territorio del supervisor cuando llegan los polígonos
  const caja = useMemo(() => cajaDe([...rutas.map((r) => r.geojson), ...contornos.map((c) => c.geojson)]), [rutas, contornos]);
  const encuadrar = useCallback(
    (duracion: number) => {
      const mapa = mapaRef.current;
      if (!caja || !mapa) return;
      encuadrarEnCaja(mapa, caja, { margen: MARGEN_ENCUADRE, margenMinimo: 32, zoomMaximo: ZOOM_MAXIMO_ENCUADRE, duracion });
    },
    [caja]
  );
  useEffect(() => encuadrar(600), [encuadrar]);

  // El mapa se monta oculto al abrir la vista Calendario (ancho 0): el encuadre calculado así queda
  // corrido, así que al hacerse visible se vuelve a encuadrar
  const anchoAnterior = useRef(0);
  const alRedimensionar = (e: MapEvent) => {
    const ancho = e.target.getContainer().clientWidth;
    if (anchoAnterior.current === 0 && ancho > 0) encuadrar(0);
    anchoAnterior.current = ancho;
  };

  const idDe = (e: MapLayerMouseEvent) => {
    const id = e.features?.[0]?.properties?.id;
    return typeof id === 'number' ? id : null;
  };

  const alMoverElCursor = (e: MapLayerMouseEvent) => {
    const id = idDe(e);
    if (id === null) return setBajoElCursor(null);
    // El tooltip queda donde entró el cursor: moverlo con cada píxel lo haría temblar
    setBajoElCursor((previa) => (previa?.id === id ? previa : { id, longitud: e.lngLat.lng, latitud: e.lngLat.lat }));
  };

  const rutaBajoElCursor = bajoElCursor ? rutas.find((r) => r.id === bajoElCursor.id) : undefined;
  const lineasTooltip = bajoElCursor ? descripciones.get(bajoElCursor.id) : undefined;

  return (
    <Map
      ref={mapaRef}
      mapLib={import('maplibre-gl')}
      initialViewState={VISTA_INICIAL}
      mapStyle={ESTILO_BASE}
      attributionControl={false}
      interactiveLayerIds={['rutas-relleno']}
      onClick={(e) => onClickRuta(idDe(e))}
      onMouseMove={alMoverElCursor}
      onMouseLeave={() => setBajoElCursor(null)}
      onLoad={() => encuadrar(0)}
      onResize={alRedimensionar}
      cursor={bajoElCursor ? 'pointer' : 'auto'}
    >
      <AtribucionMapa position="bottom-left" />
      <NavigationControl position="top-left" showCompass={false} />

      <Source id="rutas" type="geojson" data={datosRutas}>
        <Layer
          id="rutas-relleno"
          type="fill"
          paint={{
            'fill-color': ['get', 'color'],
            'fill-opacity': [
              'case',
              ['get', 'seleccionada'],
              0.7,
              ['match', ['get', 'estado'], 'del_dia', 0.5, 'otro_dia', 0.2, 0.15],
            ],
          }}
        />
        <Layer
          id="rutas-borde"
          type="line"
          paint={{
            'line-color': ['case', ['get', 'duplicada'], COLOR_DUPLICADA, ['get', 'color']],
            'line-width': ['case', ['get', 'duplicada'], 4, ['get', 'seleccionada'], 3, 1.5],
          }}
        />
        <Layer
          id="rutas-etiqueta"
          type="symbol"
          layout={{
            'text-field': ['get', 'etiqueta'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 11,
          }}
          paint={{
            'text-color': '#111827',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
            'text-opacity': ['match', ['get', 'estado'], 'otro_dia', 0.7, 1],
          }}
        />
      </Source>

      <Source id="contornos" type="geojson" data={datosContornos}>
        <Layer
          id="contornos-borde"
          type="line"
          paint={{ 'line-color': COLOR_CONTORNO, 'line-width': 3, 'line-dasharray': [4, 2], 'line-opacity': 0.9 }}
        />
      </Source>

      {bajoElCursor && rutaBajoElCursor && (
        <Popup
          longitude={bajoElCursor.longitud}
          latitude={bajoElCursor.latitud}
          anchor="bottom"
          offset={12}
          closeButton={false}
          closeOnClick={false}
          maxWidth="none"
          className="popup-ruta"
        >
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-gray-900">
              {rutaBajoElCursor.codigo_ruta} — {rutaBajoElCursor.ruta}
            </p>
            {lineasTooltip && lineasTooltip.length > 0 ? (
              <ul className="mt-0.5 text-[11px] text-gray-600">
                {lineasTooltip.map((linea) => (
                  <li key={linea}>{linea}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-0.5 text-[11px] text-gray-400">Sin planificar</p>
            )}
          </div>
        </Popup>
      )}
    </Map>
  );
}
