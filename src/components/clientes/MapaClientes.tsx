"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Map, NavigationControl, Popup, Source } from '@vis.gl/react-maplibre';
import type { MapEvent, MapLayerMouseEvent, MapRef } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ESTILO_BASE, VISTA_INICIAL, cajaDe, encuadrarEnCaja } from '@/components/mapa/baseMapa';
import { registrarPines } from '@/components/mapa/pinesClientes';
import { tieneUbicacion } from '@/utils/clientesMapa';
import type { ClienteMapa, ContornoZona, RutaItem } from '@/types';

const COLOR_CONTORNO = '#374151'; // gray-700
const COLOR_RUTA = '#6b7280'; // gray-500
const COLOR_RUTA_ENFOCADA = '#2563eb'; // blue-600: la ruta elegida en los filtros
const MARGEN_ENCUADRE = 0.15;
const ZOOM_MAXIMO_ENCUADRE = 15;
const ZOOM_AL_ELEGIR = 16;

interface MapaClientesProps {
  rutas: RutaItem[];
  contornos: ContornoZona[];
  /** Clientes que pasan los filtros */
  clientes: ClienteMapa[];
  /** Si hay una ruta elegida en los filtros, el mapa se encuadra sobre ella; si no, sobre todo el territorio */
  idRutaEnfoque: number | null;
  seleccionId: number | null;
  onElegir: (idCliente: number | null) => void;
}

interface BajoElCursor {
  id: number;
  longitud: number;
  latitud: number;
}

/**
 * Mapa de clientes (CU-12, ADR-005): cada cliente es un marcador en gota del color de su clase del Pareto, sobre
 * el polígono de su ruta y el contorno de la zona. Una sola fuente de datos; los marcadores son imágenes del
 * mapa elegidas por expresión de estilo, así que escala a miles de clientes.
 */
export function MapaClientes({ rutas, contornos, clientes, idRutaEnfoque, seleccionId, onElegir }: MapaClientesProps) {
  const mapaRef = useRef<MapRef>(null);
  const [bajoElCursor, setBajoElCursor] = useState<BajoElCursor | null>(null);
  // La capa de clientes se monta recién cuando las imágenes de los marcadores ya están en el mapa
  const [pinesListos, setPinesListos] = useState(false);

  const datosRutas = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: rutas.map((r) => ({
        type: 'Feature',
        properties: { id: r.id, codigo: r.codigo_ruta, enfocada: r.id === idRutaEnfoque },
        geometry: r.geojson,
      })),
    }),
    [rutas, idRutaEnfoque]
  );

  const datosContornos = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: contornos.map((c) => ({ type: 'Feature', properties: { id: c.id_zona }, geometry: c.geojson })),
    }),
    [contornos]
  );

  const datosClientes = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: clientes.filter(tieneUbicacion).map((c) => ({
        type: 'Feature',
        properties: { id: c.id, clase: c.clasificacion ?? 'sin', seleccionado: c.id === seleccionId },
        geometry: { type: 'Point', coordinates: [c.longitud as number, c.latitud as number] },
      })),
    }),
    [clientes, seleccionId]
  );

  const caja = useMemo(() => {
    const enfocadas = idRutaEnfoque === null ? rutas : rutas.filter((r) => r.id === idRutaEnfoque);
    const geometrias = enfocadas.length > 0 ? enfocadas.map((r) => r.geojson) : rutas.map((r) => r.geojson);
    return cajaDe(idRutaEnfoque === null ? [...geometrias, ...contornos.map((c) => c.geojson)] : geometrias);
  }, [rutas, contornos, idRutaEnfoque]);

  const encuadrar = useCallback(
    (duracion: number) => {
      const mapa = mapaRef.current;
      if (!caja || !mapa) return;
      encuadrarEnCaja(mapa, caja, { margen: MARGEN_ENCUADRE, margenMinimo: 32, zoomMaximo: ZOOM_MAXIMO_ENCUADRE, duracion });
    },
    [caja]
  );
  useEffect(() => encuadrar(600), [encuadrar]);

  // Al elegir un cliente (p. ej. desde la lista) el mapa lo centra, sin alejar si ya está cerca
  const elegido = useMemo(() => clientes.find((c) => c.id === seleccionId), [clientes, seleccionId]);
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !elegido || !tieneUbicacion(elegido)) return;
    mapa.easeTo({ center: [elegido.longitud as number, elegido.latitud as number], zoom: Math.max(mapa.getZoom(), ZOOM_AL_ELEGIR), duration: 500 });
  }, [elegido]);

  // Si el mapa se monta oculto (ancho 0) el encuadre queda corrido: al hacerse visible se vuelve a encuadrar
  // (en el celular el mapa está oculto mientras se ve la lista: si ya hay un cliente elegido, se vuelve a él)
  const elegidoRef = useRef(elegido);
  useEffect(() => {
    elegidoRef.current = elegido;
  }, [elegido]);
  const anchoAnterior = useRef(0);
  const alRedimensionar = (e: MapEvent) => {
    const ancho = e.target.getContainer().clientWidth;
    if (anchoAnterior.current === 0 && ancho > 0) {
      const alElegido = elegidoRef.current;
      if (alElegido && tieneUbicacion(alElegido)) {
        e.target.jumpTo({ center: [alElegido.longitud as number, alElegido.latitud as number], zoom: Math.max(e.target.getZoom(), ZOOM_AL_ELEGIR) });
      } else {
        encuadrar(0);
      }
    }
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

  const clienteBajoElCursor = bajoElCursor ? clientes.find((c) => c.id === bajoElCursor.id) : undefined;

  return (
    <Map
      ref={mapaRef}
      mapLib={import('maplibre-gl')}
      initialViewState={VISTA_INICIAL}
      mapStyle={ESTILO_BASE}
      interactiveLayerIds={['clientes-puntos']}
      onClick={(e) => onElegir(idDe(e))}
      onMouseMove={alMoverElCursor}
      onMouseLeave={() => setBajoElCursor(null)}
      onLoad={(e) => {
        registrarPines(e.target);
        setPinesListos(true);
        // Si ya hay un cliente elegido (p. ej. desde la lista del celular) el mapa abre sobre él
        const alElegido = elegidoRef.current;
        if (alElegido && tieneUbicacion(alElegido)) e.target.jumpTo({ center: [alElegido.longitud as number, alElegido.latitud as number], zoom: ZOOM_AL_ELEGIR });
        else encuadrar(0);
      }}
      onResize={alRedimensionar}
      cursor={bajoElCursor ? 'pointer' : 'auto'}
    >
      <NavigationControl position="top-left" />

      <Source id="rutas" type="geojson" data={datosRutas}>
        <Layer
          id="rutas-relleno"
          type="fill"
          paint={{ 'fill-color': ['case', ['get', 'enfocada'], COLOR_RUTA_ENFOCADA, COLOR_RUTA], 'fill-opacity': ['case', ['get', 'enfocada'], 0.12, 0.06] }}
        />
        <Layer
          id="rutas-borde"
          type="line"
          paint={{ 'line-color': ['case', ['get', 'enfocada'], COLOR_RUTA_ENFOCADA, COLOR_RUTA], 'line-width': ['case', ['get', 'enfocada'], 2.5, 1] }}
        />
        <Layer
          id="rutas-etiqueta"
          type="symbol"
          layout={{ 'text-field': ['get', 'codigo'], 'text-font': ['Noto Sans Bold'], 'text-size': 11 }}
          paint={{ 'text-color': '#4b5563', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5, 'text-opacity': 0.85 }}
        />
      </Source>

      <Source id="contornos" type="geojson" data={datosContornos}>
        <Layer
          id="contornos-borde"
          type="line"
          paint={{ 'line-color': COLOR_CONTORNO, 'line-width': 3, 'line-dasharray': [4, 2], 'line-opacity': 0.9 }}
        />
      </Source>

      {pinesListos && (
        <Source id="clientes" type="geojson" data={datosClientes}>
          <Layer
            id="clientes-puntos"
            type="symbol"
            layout={{
              'icon-image': ['concat', 'pin-', ['get', 'clase'], ['case', ['get', 'seleccionado'], '-sel', '']],
              'icon-anchor': 'bottom',
              'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.7, 17, 1],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              // El elegido se dibuja encima de sus vecinos
              'symbol-sort-key': ['case', ['get', 'seleccionado'], 1, 0],
            }}
          />
        </Source>
      )}

      {bajoElCursor && clienteBajoElCursor && (
        <Popup
          longitude={bajoElCursor.longitud}
          latitude={bajoElCursor.latitud}
          anchor="bottom"
          offset={38}
          closeButton={false}
          closeOnClick={false}
          maxWidth="none"
          className="popup-ruta"
        >
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-gray-900">{clienteBajoElCursor.nombre_comercial ?? clienteBajoElCursor.nombre_completo}</p>
            <p className="mt-0.5 text-[11px] text-gray-600">
              {clienteBajoElCursor.codigo_cliente} · {clienteBajoElCursor.clasificacion ? `Clase ${clienteBajoElCursor.clasificacion}` : 'No habilitado'}
            </p>
          </div>
        </Popup>
      )}
    </Map>
  );
}
