"use client";

import { useEffect } from 'react';
import { AttributionControl, useMap } from '@vis.gl/react-maplibre';

interface AtribucionMapaProps {
  /** Esquina del mapa; se elige la que no choque con otros controles o botones de esa pantalla */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Atribución del mapa (exigida por la licencia ODbL) en el botón «i», plegada al abrir la pantalla.
 * El modo `compact` de MapLibre arranca con el texto abierto y solo lo pliega al arrastrar el mapa;
 * aquí se quita esa apertura inicial una sola vez, cuando el mapa termina de dibujarse.
 * Debe ir como hijo de <Map> con `attributionControl={false}`.
 */
export function AtribucionMapa({ position = 'bottom-right' }: AtribucionMapaProps) {
  const { current: mapa } = useMap();

  useEffect(() => {
    if (!mapa) return;
    const plegar = () => {
      mapa.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
    };
    mapa.once('idle', plegar);
    return () => {
      mapa.off('idle', plegar);
    };
  }, [mapa]);

  return <AttributionControl compact position={position} />;
}
