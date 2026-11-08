"use client";

import Button from '@/components/ui/Button';
import PlanificacionGrid from '@/components/planificacion/PlanificacionGrid';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { EquipoSupervisor, PlanificacionDeSupervisor } from '@/types';

interface PlanificacionSupervisorModalProps {
  /** Supervisor cuya planificación se consulta; null con el modal cerrado */
  objetivo: EquipoSupervisor | null;
  planificacion: PlanificacionDeSupervisor | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

// La grilla es la misma del supervisor pero en modo lectura: ninguna acción está disponible
const SIN_ACCION = () => undefined;

export default function PlanificacionSupervisorModal({
  objetivo,
  planificacion,
  isLoading,
  error,
  onClose,
}: PlanificacionSupervisorModalProps) {
  useEscapeKey(onClose, objetivo !== null);

  if (!objetivo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="planificacion-supervisor-title"
        className="relative flex max-h-full w-full max-w-6xl flex-col rounded-card bg-white p-6 shadow-2xl"
      >
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="planificacion-supervisor-title" className="text-lg font-bold text-gray-900">
              Planificación de {objetivo.nombre}
            </h3>
            <p className="text-sm text-gray-500">
              {objetivo.sucursal_nombre} · Solo lectura. Muestra toda la planificación guardada, también la de rutas
              que ya no son de sus zonas.
            </p>
          </div>
          {!objetivo.activo && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              Supervisor inactivo
            </span>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-gray-400">Cargando planificación...</p>
          ) : error ? (
            <p className="text-sm text-primary-600">{error}</p>
          ) : planificacion && planificacion.slots.length === 0 ? (
            <p className="text-sm text-gray-500">Este supervisor todavía no tiene slots.</p>
          ) : (
            planificacion && (
              <PlanificacionGrid
                slots={planificacion.slots}
                disponibles={[]}
                visitas={planificacion.visitas}
                editMode={false}
                deshabilitado
                onAsignar={SIN_ACCION}
                onRenombrar={SIN_ACCION}
                onEliminar={SIN_ACCION}
                onMover={SIN_ACCION}
                onAgregarVisita={SIN_ACCION}
                onSeleccionarVisita={SIN_ACCION}
                onMoverVisita={SIN_ACCION}
                onReordenar={SIN_ACCION}
              />
            )
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
