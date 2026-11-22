"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Map, NavigationControl, Popup, Source } from '@vis.gl/react-maplibre';
import type { MapEvent, MapLayerMouseEvent, MapRef } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AtribucionMapa } from '@/components/mapa/AtribucionMapa';
import { ESTILO_BASE, VISTA_INICIAL, cajaDe, encuadrarEnCaja } from '@/components/mapa/baseMapa';
import { COLOR_TRAMO, tramoDe } from '@/utils/coberturaRutas';
import type { ContornoZona, RutaCobertura } from '@/types';

const COLOR_CONTORNO = '#374151'; // gray-700
const MARGEN_ENCUADRE = 0.15;
const ZOOM_MAXIMO_ENCUADRE = 14;

interface MapaCoberturaProps {
  /** Rutas que pasan los filtros */
  rutas: RutaCobertura[];
  contornos: ContornoZona[];
  seleccionId: number | null;
  onElegir: (idRuta: number | null) => void;
}

interface BajoElCursor {
  id: number;
  longitud: number;
  latitud: number;
}

/**
 * Mapa de la cobertura (CU-13): cada ruta se pinta según su porcentaje (rojo, ámbar o verde) y lleva la cifra
 * en la etiqueta, para que el color no sea el único canal.
 */
export function MapaCobertura({ rutas, contornos, seleccionId, onElegir }: MapaCoberturaProps) {
  const mapaRef = useRef<MapRef>(null);
  const [bajoElCursor, setBajoElCursor] = useState<BajoElCursor | null>(null);

  const datosRutas = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: rutas.map((r) => ({
        type: 'Feature',
        properties: {
          id: r.id,
          color: COLOR_TRAMO[tramoDe(r.porcentaje)],
          etiqueta: `${r.codigo_ruta}\n${Math.round(r.porcentaje)} %`,
          seleccionada: r.id === seleccionId,
        },
        geometry: r.geojson,
      })),
    }),
    [rutas, seleccionId]
  );

  const datosContornos = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: contornos.map((c) => ({ type: 'Feature', properties: { id: c.id_zona }, geometry: c.geojson })),
    }),
    [contornos]
  );

  // El encuadre abarca las rutas que dejan los filtros y los contornos de sus zonas: con un supervisor elegido, solo sus zonas
  const caja = useMemo(() => {
    const zonasVisibles = new Set(rutas.map((r) => r.id_zona));
    return cajaDe([...rutas.map((r) => r.geojson), ...contornos.filter((c) => zonasVisibles.has(c.id_zona)).map((c) => c.geojson)]);
  }, [rutas, contornos]);
  const encuadrar = useCallback(
    (duracion: number) => {
      const mapa = mapaRef.current;
      if (!caja || !mapa) return;
      encuadrarEnCaja(mapa, caja, { margen: MARGEN_ENCUADRE, margenMinimo: 32, zoomMaximo: ZOOM_MAXIMO_ENCUADRE, duracion });
    },
    [caja]
  );
  useEffect(() => encuadrar(600), [encuadrar]);

  // Al elegir una ruta (p. ej. desde la lista) el mapa se encuadra sobre ella; al soltarla, vuelve a mostrar todas
  const cajaElegida = useMemo(() => {
    const elegida = rutas.find((r) => r.id === seleccionId);
    return elegida ? cajaDe([elegida.geojson]) : null;
  }, [rutas, seleccionId]);
  const cajaElegidaRef = useRef(cajaElegida);
  useEffect(() => {
    cajaElegidaRef.current = cajaElegida;
    const mapa = mapaRef.current;
    if (mapa && cajaElegida) encuadrarEnCaja(mapa, cajaElegida, { margen: MARGEN_ENCUADRE, margenMinimo: 32, zoomMaximo: ZOOM_MAXIMO_ENCUADRE, duracion: 500 });
  }, [cajaElegida]);

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
    setBajoElCursor((previo) => (previo?.id === id ? previo : { id, longitud: e.lngLat.lng, latitud: e.lngLat.lat }));
  };

  const rutaBajoElCursor = bajoElCursor ? rutas.find((r) => r.id === bajoElCursor.id) : undefined;

  return (
    <Map
      ref={mapaRef}
      mapLib={import('maplibre-gl')}
      initialViewState={VISTA_INICIAL}
      mapStyle={ESTILO_BASE}
      attributionControl={false}
      interactiveLayerIds={['cobertura-relleno']}
      onClick={(e) => onElegir(idDe(e))}
      onMouseMove={alMoverElCursor}
      onMouseLeave={() => setBajoElCursor(null)}
      onLoad={() => {
        // Si ya hay una ruta elegida (p. ej. desde la lista del celular) el mapa abre sobre ella
        const mapa = mapaRef.current;
        if (mapa && cajaElegidaRef.current) encuadrarEnCaja(mapa, cajaElegidaRef.current, { margen: MARGEN_ENCUADRE, margenMinimo: 32, zoomMaximo: ZOOM_MAXIMO_ENCUADRE, duracion: 0 });
        else encuadrar(0);
      }}
      onResize={alRedimensionar}
      cursor={bajoElCursor ? 'pointer' : 'auto'}
    >
      <AtribucionMapa position="top-right" />
      <NavigationControl position="top-left" />

      <Source id="rutas" type="geojson" data={datosRutas}>
        <Layer id="cobertura-relleno" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['get', 'seleccionada'], 0.7, 0.45] }} />
        <Layer
          id="cobertura-borde"
          type="line"
          paint={{ 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'seleccionada'], 4, 1.5] }}
        />
        <Layer
          id="cobertura-etiqueta"
          type="symbol"
          layout={{ 'text-field': ['get', 'etiqueta'], 'text-font': ['Noto Sans Bold'], 'text-size': 12 }}
          paint={{ 'text-color': '#111827', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 }}
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
            <p className="mt-0.5 text-[11px] text-gray-600">
              {rutaBajoElCursor.clientes_atendidos} de {rutaBajoElCursor.clientes_habilitados} clientes atendidos · {rutaBajoElCursor.porcentaje} %
            </p>
          </div>
        </Popup>
      )}
    </Map>
  );
}
