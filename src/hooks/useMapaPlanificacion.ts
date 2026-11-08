import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { mensajeDeErrorApi } from '@/utils/apiError';
import type { MapaPlanificacion } from '@/types';

type Carga = { url: string; mapa: MapaPlanificacion | null; error: string | null };

/**
 * Polígonos y contornos para planificar o consultar sobre el mapa (ADR-004 D4). Se piden una sola vez por
 * dirección y no se vuelven a pedir cuando cambia la planificación: la geometría no depende de ella.
 * Con `url` null no se pide nada (la vista Mapa todavía no se abrió).
 */
export function useMapaPlanificacion(url: string | null) {
  const [carga, setCarga] = useState<Carga | null>(null);

  useEffect(() => {
    if (!url) return;
    let vigente = true;
    const terminar = (resultado: Omit<Carga, 'url'>) => {
      if (vigente) setCarga({ url, ...resultado });
    };
    void (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          terminar({ mapa: null, error: await mensajeDeErrorApi(res, 'No se pudo cargar el mapa.') });
          return;
        }
        terminar({ mapa: (await res.json()) as MapaPlanificacion, error: null });
      } catch (err: unknown) {
        logger.error('Error cargando el mapa de planificación:', err);
        terminar({ mapa: null, error: 'No se pudo cargar el mapa.' });
      }
    })();
    return () => {
      vigente = false;
    };
  }, [url]);

  // Una respuesta de otra dirección (p. ej. del supervisor anterior) no se muestra
  const actual = url && carga?.url === url ? carga : null;
  return {
    mapa: actual?.mapa ?? null,
    error: actual?.error ?? null,
    isLoading: url !== null && actual === null,
  };
}
