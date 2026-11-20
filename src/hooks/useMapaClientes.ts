import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { mensajeDeErrorApi } from '@/utils/apiError';
import type { MapaClientes } from '@/types';

type Carga = { mapa: MapaClientes | null; error: string | null };

/** Clientes clasificados y rutas del alcance del usuario, para el mapa de CU-12 (se piden una sola vez) */
export function useMapaClientes() {
  const [carga, setCarga] = useState<Carga | null>(null);

  useEffect(() => {
    let vigente = true;
    const terminar = (resultado: Carga) => {
      if (vigente) setCarga(resultado);
    };
    void (async () => {
      try {
        const res = await fetch('/api/clientes/mapa');
        if (!res.ok) {
          terminar({ mapa: null, error: await mensajeDeErrorApi(res, 'No se pudo cargar el mapa de clientes.') });
          return;
        }
        terminar({ mapa: (await res.json()) as MapaClientes, error: null });
      } catch (err: unknown) {
        logger.error('Error cargando el mapa de clientes:', err);
        terminar({ mapa: null, error: 'No se pudo cargar el mapa de clientes.' });
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  return { mapa: carga?.mapa ?? null, error: carga?.error ?? null, isLoading: carga === null };
}
