"use client";

import { useEffect, useMemo, useRef } from 'react';
import { FullscreenControl, Layer, Map, NavigationControl, Source } from '@vis.gl/react-maplibre';
import type { MapLayerMouseEvent, MapRef } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AtribucionMapa } from '@/components/mapa/AtribucionMapa';
import { ESTILO_BASE, VISTA_INICIAL, cajaDe, encuadrarEnCaja, type CajaGeografica } from '@/components/mapa/baseMapa';
import { COLOR_ESTADO, COLOR_SIN_EVALUAR } from '@/utils/importacionRutas';
import type { EstadoRuta } from '@/utils/rutaInforme';
import type { RutaLoteEntrada } from '@/utils/rutaValidation';

const MARGEN_ENCUADRE = 0.15;

interface MapaImportacionProps {
  rutas: RutaLoteEntrada[];
  /** Estado de cada ruta por su índice en el archivo; vacío mientras no se pidió la vista previa */
  estados: globalThis.Map<number, EstadoRuta>;
  /** Índice (desde 0) de la ruta elegida en la lista */
  seleccionIndice: number | null;
  onSeleccionar: (indice: number | null) => void;
  idPantallaCompleta: string;
}

/** Polígonos del archivo pintados por estado: lo que se creará, actualizará, no cambia o se rechaza */
export function MapaImportacion({ rutas, estados, seleccionIndice, onSeleccionar, idPantallaCompleta }: MapaImportacionProps) {
  const mapaRef = useRef<MapRef>(null);

  const datos = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: rutas.map((r) => {
        const estado = estados.get(r.indice);
        return {
          type: 'Feature',
          properties: {
            indice: r.indice,
            color: estado ? COLOR_ESTADO[estado] : COLOR_SIN_EVALUAR,
            seleccionada: r.indice === seleccionIndice,
          },
          geometry: r.poligono,
        };
      }),
    }),
    [rutas, estados, seleccionIndice]
  );

  const encuadrar = (caja: CajaGeografica | null, duracion: number) => {
    const mapa = mapaRef.current;
    if (!caja || !mapa) return;
    encuadrarEnCaja(mapa, caja, { margen: MARGEN_ENCUADRE, margenMinimo: 32, zoomMaximo: 16, duracion });
  };

  // Al cargar otro archivo se encuadra el conjunto
  useEffect(() => {
    encuadrar(cajaDe(rutas.map((r) => r.poligono)), 600);
  }, [rutas]);

  // Al elegir una ruta de la lista se acerca a ella; al soltarla el mapa se queda donde está
  useEffect(() => {
    if (seleccionIndice === null) return;
    const elegida = rutas.find((r) => r.indice === seleccionIndice);
    if (elegida) encuadrar(cajaDe([elegida.poligono]), 500);
  }, [seleccionIndice, rutas]);

  const alHacerClic = (e: MapLayerMouseEvent) => {
    const indice = e.features?.[0]?.properties?.indice;
    onSeleccionar(typeof indice === 'number' ? indice : null);
  };

  return (
    <Map
      ref={mapaRef}
      mapLib={import('maplibre-gl')}
      initialViewState={VISTA_INICIAL}
      mapStyle={ESTILO_BASE}
      attributionControl={false}
      interactiveLayerIds={['importacion-relleno']}
      onClick={alHacerClic}
      cursor="auto"
    >
      <AtribucionMapa position="bottom-right" />
      <NavigationControl position="bottom-right" showCompass={false} />
      <FullscreenControl position="bottom-right" containerId={idPantallaCompleta} />

      <Source id="importacion" type="geojson" data={datos}>
        <Layer
          id="importacion-relleno"
          type="fill"
          paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['get', 'seleccionada'], 0.55, 0.25] }}
        />
        <Layer
          id="importacion-borde"
          type="line"
          paint={{ 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'seleccionada'], 4, 1.5] }}
        />
      </Source>
    </Map>
  );
}
