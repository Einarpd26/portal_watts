import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { mensajeDeErrorApi } from '@/utils/apiError';
import type { ComprasCliente } from '@/types';

type Carga = { idCliente: number; datos: ComprasCliente | null; error: string | null };

/** Ticket promedio y últimas compras del cliente elegido; se piden al elegirlo y se descartan si elige otro */
export function useComprasCliente(idCliente: number | null) {
  const [carga, setCarga] = useState<Carga | null>(null);

  useEffect(() => {
    if (idCliente === null) return;
    let vigente = true;
    const terminar = (resultado: Carga) => {
      if (vigente) setCarga(resultado);
    };
    void (async () => {
      try {
        const res = await fetch(`/api/clientes/${idCliente}/compras`);
        if (!res.ok) {
          terminar({ idCliente, datos: null, error: await mensajeDeErrorApi(res, 'No se pudo cargar el historial de compras.') });
          return;
        }
        terminar({ idCliente, datos: (await res.json()) as ComprasCliente, error: null });
      } catch (err: unknown) {
        logger.error('Error cargando las compras del cliente:', err);
        terminar({ idCliente, datos: null, error: 'No se pudo cargar el historial de compras.' });
      }
    })();
    return () => {
      vigente = false;
    };
  }, [idCliente]);

  const actual = carga !== null && carga.idCliente === idCliente ? carga : null;
  return { compras: actual?.datos ?? null, error: actual?.error ?? null, isLoading: idCliente !== null && actual === null };
}
