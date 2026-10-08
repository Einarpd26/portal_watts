"use client";

import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-maplibre';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  ValidateNotSelfIntersecting,
  type GeoJSONStoreFeatures,
  type SnapToCustom,
} from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import { verticeMasCercano, type Posicion } from '@/utils/ajusteVertices';
import { COLOR_PROPUESTA } from '@/utils/coloresTerritorio';
import { logger } from '@/lib/logger';
import type { PoligonoRuta } from '@/types';

// Terra Draw recibe colores hexadecimales, no clases de Tailwind: el verde de la propuesta y blanco
const COLOR_DIBUJO = COLOR_PROPUESTA;
const COLOR_PUNTO = '#ffffff';

interface CapaDibujoProps {
  /** Polígono a editar (geometría completa); null para dibujar uno nuevo */
  poligonoInicial: PoligonoRuta | null;
  /** Vértices de las rutas vecinas a los que se pega el cursor */
  verticesVecinos: Posicion[];
  /** Se llama al cerrar el polígono y tras cada edición terminada */
  onCambio: (poligono: PoligonoRuta) => void;
}

// Espera tras el último cambio de geometría antes de validar, si no llega el evento `finish`
const ESPERA_CAMBIO_MS = 500;

// Un polígono que se cruza a sí mismo se rechaza al soltar, no mientras se mueve el cursor
const validarAlTerminar = (feature: GeoJSONStoreFeatures, contexto: { updateType: string }) =>
  contexto.updateType === 'provisional' ? { valid: true } : ValidateNotSelfIntersecting(feature);

/**
 * Dibujo y edición del polígono de una ruta con Terra Draw (ADR-002 D6). Debe montarse dentro de
 * <Map>. Para empezar de cero, el padre la vuelve a montar cambiando su `key`.
 */
export function CapaDibujo({ poligonoInicial, verticesVecinos, onCambio }: CapaDibujoProps) {
  const { current: mapaRef } = useMap();

  // Las props cambian sin reiniciar Terra Draw: se leen desde refs
  const onCambioRef = useRef(onCambio);
  const verticesRef = useRef(verticesVecinos);
  useEffect(() => {
    onCambioRef.current = onCambio;
    verticesRef.current = verticesVecinos;
  }, [onCambio, verticesVecinos]);

  // El polígono inicial solo cuenta al montar (para reiniciar, el padre cambia la key)
  const inicialRef = useRef(poligonoInicial);

  useEffect(() => {
    const mapa = mapaRef?.getMap();
    if (!mapa) return;

    const ajuste: SnapToCustom = (evento, contexto) =>
      verticeMasCercano({ x: evento.containerX, y: evento.containerY }, verticesRef.current, contexto.project);

    const estiloPoligono = {
      fillColor: COLOR_DIBUJO,
      fillOpacity: 0.25,
      outlineColor: COLOR_DIBUJO,
      outlineWidth: 3,
      closingPointColor: COLOR_PUNTO,
      closingPointOutlineColor: COLOR_DIBUJO,
      snappingPointColor: COLOR_DIBUJO,
    } as const;

    const dibujo = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map: mapa }),
      modes: [
        new TerraDrawPolygonMode({
          snapping: { toCustom: ajuste },
          validation: validarAlTerminar,
          // Esc lo maneja el panel (cancela toda la edición); Enter cierra el polígono
          keyEvents: { cancel: null, finish: 'Enter' },
          styles: estiloPoligono,
        }),
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                validation: validarAlTerminar,
                coordinates: { draggable: true, midpoints: true, deletable: true, snappable: { toCustom: ajuste } },
              },
            },
          },
          styles: {
            selectedPolygonColor: COLOR_DIBUJO,
            selectedPolygonOutlineColor: COLOR_DIBUJO,
            selectionPointColor: COLOR_PUNTO,
            selectionPointOutlineColor: COLOR_DIBUJO,
            midPointColor: COLOR_DIBUJO,
          },
        }),
      ],
    });

    let pendiente: ReturnType<typeof setTimeout> | null = null;
    const emitir = (id: string | number) => {
      if (pendiente) clearTimeout(pendiente);
      pendiente = null;
      const feature = dibujo.getSnapshotFeature(id);
      if (feature?.geometry.type === 'Polygon') {
        onCambioRef.current({ type: 'Polygon', coordinates: feature.geometry.coordinates });
      }
    };

    // Respaldo de `finish`: si el vértice se suelta sobre un control del mapa (por ejemplo, el
    // zoom), Terra Draw no recibe el fin del arrastre, pero la geometría ya cambió. Sin esto, el
    // mapa mostraría un polígono y se guardaría otro.
    dibujo.on('change', (ids, tipo, contexto) => {
      if (tipo !== 'update' || contexto?.target === 'properties') return;
      const id = ids.find((i) => dibujo.getSnapshotFeature(i)?.geometry.type === 'Polygon');
      if (id === undefined || dibujo.getModeState() === 'drawing') return;
      if (pendiente) clearTimeout(pendiente);
      pendiente = setTimeout(() => emitir(id), ESPERA_CAMBIO_MS);
    });

    dibujo.on('finish', (id, contexto) => {
      emitir(id);
      // Una ruta es un solo polígono: al cerrarlo se pasa a editar sus vértices
      if (contexto.mode === 'polygon' && contexto.action === 'draw') {
        dibujo.setMode('select');
        dibujo.selectFeature(id);
      }
    });

    dibujo.on('ready', () => {
      const inicial = inicialRef.current;
      if (!inicial) {
        dibujo.setMode('polygon');
        return;
      }
      const id = crypto.randomUUID();
      const resultado = dibujo.addFeatures([
        { id, type: 'Feature', geometry: inicial, properties: { mode: 'polygon' } },
      ]);
      if (!resultado[0]?.valid) {
        logger.error('Terra Draw rechazó el polígono a editar:', resultado[0]?.reason);
        dibujo.setMode('polygon');
        return;
      }
      dibujo.setMode('select');
      dibujo.selectFeature(id);
    });

    dibujo.start();
    return () => {
      if (pendiente) clearTimeout(pendiente);
      dibujo.stop();
    };
  }, [mapaRef]);

  return null;
}
