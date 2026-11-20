import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { mensajeDeErrorApi } from '@/utils/apiError';
import type { CoberturaListado } from '@/types';

type Carga = { cobertura: CoberturaListado | null; error: string | null };

/**
 * Cobertura de las rutas del alcance del usuario (CU-13). Se pide una vez: el dato se recalcula cada noche. Solo se
 * pide cuando `habilitado` es true: el Vendedor no consulta la cobertura y recibiría un 403.
 */
export function useCobertura(habilitado: boolean) {
  const [carga, setCarga] = useState<Carga | null>(null);

  useEffect(() => {
    if (!habilitado) return;
    let vigente = true;
    const terminar = (resultado: Carga) => {
      if (vigente) setCarga(resultado);
    };
    void (async () => {
      try {
        const res = await fetch('/api/cobertura');
        if (!res.ok) {
          terminar({ cobertura: null, error: await mensajeDeErrorApi(res, 'No se pudo cargar la cobertura.') });
          return;
        }
        terminar({ cobertura: (await res.json()) as CoberturaListado, error: null });
      } catch (err: unknown) {
        logger.error('Error cargando la cobertura de rutas:', err);
        terminar({ cobertura: null, error: 'No se pudo cargar la cobertura.' });
      }
    })();
    return () => {
      vigente = false;
    };
  }, [habilitado]);

  return { cobertura: carga?.cobertura ?? null, error: carga?.error ?? null, isLoading: habilitado && carga === null };
}
