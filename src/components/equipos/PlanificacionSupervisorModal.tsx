"use client";

import PageLoader from '@/components/ui/PageLoader';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import PlanificacionGrid from '@/components/planificacion/PlanificacionGrid';
import ConmutadorVista, { type VistaPlanificacion } from '@/components/planificacion/ConmutadorVista';
import VistaMapaPlanificacion from '@/components/planificacion/VistaMapaPlanificacion';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useMapaPlanificacion } from '@/hooks/useMapaPlanificacion';
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

export default function PlanificacionSupervisorModal(props: PlanificacionSupervisorModalProps) {
  const { objetivo, onClose } = props;
  useEscapeKey(onClose, objetivo !== null);

  // El contenido se monta de nuevo con cada supervisor: la vista y el mapa no se arrastran de una consulta a otra
  return objetivo ? <ContenidoPlanificacion key={objetivo.id_persona} {...props} objetivo={objetivo} /> : null;
}

function ContenidoPlanificacion({
  objetivo,
  planificacion,
  isLoading,
  error,
  onClose,
}: PlanificacionSupervisorModalProps & { objetivo: EquipoSupervisor }) {
  // Mismo conmutador que en la planificación del supervisor; aquí no hay pincel ni acciones de edición (ADR-004 D5)
  const [vista, setVista] = useState<VistaPlanificacion>('mapa');
  const mapa = useMapaPlanificacion(`/api/admin/equipos/supervisor/${objetivo.id_persona}/mapa`);
  const hayPlanificacion = planificacion !== null && planificacion.slots.length > 0;

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
          <div className="flex items-center gap-2">
            {!objetivo.activo && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                Supervisor inactivo
              </span>
            )}
            {hayPlanificacion && <ConmutadorVista vista={vista} onCambiar={setVista} />}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <PageLoader className="h-48" />
          ) : error ? (
            <p className="text-sm text-primary-600">{error}</p>
          ) : planificacion && planificacion.slots.length === 0 ? (
            <p className="text-sm text-gray-500">Este supervisor todavía no tiene slots.</p>
          ) : (
            planificacion && (
              <>
                <div hidden={vista !== 'mapa'}>
                  <VistaMapaPlanificacion
                    slots={planificacion.slots}
                    visitas={planificacion.visitas}
                    mapa={mapa.mapa}
                    cargando={mapa.isLoading}
                    error={mapa.error}
                    edicion={null}
                    claseAltura="h-96 lg:h-128"
                  />
                </div>
                <div hidden={vista !== 'calendario'}>
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
                </div>
              </>
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
