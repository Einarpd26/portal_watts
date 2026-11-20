import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { mensajeDeErrorApi } from '@/utils/apiError';
import type { ConsultaPlanificacion } from '@/types';

type Carga = { consulta: ConsultaPlanificacion | null; error: string | null };

/**
 * Planificación de todas las rutas del alcance del usuario, en solo lectura (CU-10). Se pide una vez, y solo cuando
 * `habilitado` es true: un usuario sin permiso, que está por ser redirigido, no debe disparar el pedido.
 */
export function useConsultaPlanificacion(habilitado: boolean) {
  const [carga, setCarga] = useState<Carga | null>(null);

  useEffect(() => {
    if (!habilitado) return;
    let vigente = true;
    const terminar = (resultado: Carga) => {
      if (vigente) setCarga(resultado);
    };
    void (async () => {
      try {
        const res = await fetch('/api/planificacion/consulta');
        if (!res.ok) {
          terminar({ consulta: null, error: await mensajeDeErrorApi(res, 'No se pudo cargar la planificación.') });
          return;
        }
        terminar({ consulta: (await res.json()) as ConsultaPlanificacion, error: null });
      } catch (err: unknown) {
        logger.error('Error cargando la consulta de planificación:', err);
        terminar({ consulta: null, error: 'No se pudo cargar la planificación.' });
      }
    })();
    return () => {
      vigente = false;
    };
  }, [habilitado]);

  return { consulta: carga?.consulta ?? null, error: carga?.error ?? null, isLoading: habilitado && carga === null };
}
