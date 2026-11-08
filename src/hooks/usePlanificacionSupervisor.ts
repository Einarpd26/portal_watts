import { useCallback, useState } from 'react';
import { logger } from '@/lib/logger';
import { mensajeDeErrorApi } from '@/utils/apiError';
import type { EquipoSupervisor, PlanificacionDeSupervisor } from '@/types';

/** Consulta, en solo lectura, de la planificación de un supervisor (Fiscalizador y Gerencia, ADR-003 D10) */
export function usePlanificacionSupervisor() {
  const [objetivo, setObjetivo] = useState<EquipoSupervisor | null>(null);
  const [planificacion, setPlanificacion] = useState<PlanificacionDeSupervisor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abrir = useCallback(async (equipo: EquipoSupervisor) => {
    setObjetivo(equipo);
    setPlanificacion(null);
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/equipos/supervisor/${equipo.id_persona}/planificacion`);
      if (!res.ok) {
        setError(await mensajeDeErrorApi(res, 'No se pudo cargar la planificación.'));
        return;
      }
      setPlanificacion((await res.json()) as PlanificacionDeSupervisor);
    } catch (err: unknown) {
      logger.error('Error cargando la planificación del supervisor:', err);
      setError('No se pudo cargar la planificación.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cerrar = useCallback(() => {
    setObjetivo(null);
    setPlanificacion(null);
    setError(null);
  }, []);

  return { objetivo, planificacion, isLoading, error, abrir, cerrar };
}
