"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useGestionSlots } from '@/hooks/useGestionSlots';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import AppLayout from '@/components/layout/AppLayout';
import PlanificacionGrid from '@/components/planificacion/PlanificacionGrid';
import VisitaModal, { type VisitaModalEstado } from '@/components/planificacion/VisitaModal';
import { logger } from '@/lib/logger';
import type { PageWithLayout } from '@/types';

const PlanificacionPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && !user.permisos.includes('planificacion:asignar')) {
      router.replace('/dashboard').catch((navErr: unknown) => {
        logger.error('Error redirigiendo usuario sin permisos:', navErr);
      });
    }
  }, [authLoading, user, router]);

  const [editMode, setEditMode] = useState(false);
  const [visitaModal, setVisitaModal] = useState<VisitaModalEstado | null>(null);
  const {
    listado,
    isLoading,
    isSubmitting,
    toast,
    clearToast,
    crearSlot,
    asignarVendedor,
    renombrarSlot,
    eliminarSlot,
    moverSlot,
    agregarVisita,
    cambiarFrecuencia,
    quitarVisita,
    moverVisita,
    reordenarSlots,
  } = useGestionSlots();

  const nombreDeSlot = (idSlot: number) => {
    const i = listado.slots.findIndex((s) => s.id === idSlot);
    return listado.slots[i]?.nombre ?? `Slot ${i + 1}`;
  };

  // El modal se cierra al terminar, con éxito o con error: abierto taparía el aviso del resultado
  const cerrarDespues = (accion: Promise<void>) => {
    setVisitaModal(null);
    void accion;
  };

  if (authLoading || !user) return null;
  if (!user.permisos.includes('planificacion:asignar')) return null;

  return (
    <div className="min-h-full bg-gray-50">
      <header className="px-6 pt-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Planificación</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Cada fila es un slot de tu equipo y cada columna, un día de visita. El slot y sus rutas se conservan
              aunque cambie el vendedor.
            </p>
          </div>
          {listado.es_supervisor && (
            <div className="flex gap-2">
              {editMode && (
                <Button variant="secondary" onClick={() => void crearSlot()} disabled={isSubmitting || isLoading}>
                  Agregar slot
                </Button>
              )}
              <Button onClick={() => setEditMode((v) => !v)} variant={editMode ? 'primary' : 'secondary'} disabled={isLoading}>
                {editMode ? 'Listo' : 'Editar'}
              </Button>
            </div>
          )}
        </div>
      </header>

      {toast && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <Alert state={toast.type === 'success' ? 'success' : 'error'} onClose={clearToast}>
            {toast.message}
          </Alert>
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        {isLoading ? (
          <p className="text-sm text-gray-400">Cargando slots...</p>
        ) : !listado.es_supervisor ? (
          <p className="text-sm text-gray-500">
            Los slots son de cada supervisor. Para administrar quién integra un equipo, usa Equipos.
          </p>
        ) : listado.slots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm font-medium text-gray-500">Todavía no tienes slots</p>
            <p className="mt-1 text-xs text-gray-400">
              Pulsa Editar, agrega el primero y asígnale un vendedor de tu equipo.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500">
              {listado.disponibles.length === 0
                ? 'Todos los vendedores de tu equipo tienen slot.'
                : `${listado.disponibles.length} ${listado.disponibles.length === 1 ? 'vendedor de tu equipo no tiene' : 'vendedores de tu equipo no tienen'} slot.`}
            </p>
            <PlanificacionGrid
              slots={listado.slots}
              disponibles={listado.disponibles}
              visitas={listado.visitas}
              editMode={editMode}
              deshabilitado={isSubmitting}
              onAsignar={(id, idVendedor) => void asignarVendedor(id, idVendedor)}
              onRenombrar={(id, nombre) => void renombrarSlot(id, nombre)}
              onEliminar={(id) => void eliminarSlot(id)}
              onMover={(id, direccion) => void moverSlot(id, direccion)}
              onAgregarVisita={(idSlot, dia) => setVisitaModal({ tipo: 'agregar', idSlot, dia, nombreSlot: nombreDeSlot(idSlot) })}
              onReordenar={(ids) => void reordenarSlots(ids)}
              onMoverVisita={(idVisita, idSlot, dia) => void moverVisita(idVisita, idSlot, dia)}
              onSeleccionarVisita={(visita) => setVisitaModal({ tipo: 'editar', visita, nombreSlot: nombreDeSlot(visita.id_slot) })}
            />
          </>
        )}
      </div>

      <VisitaModal
        estado={visitaModal}
        rutas={listado.rutas}
        visitas={listado.visitas}
        isSubmitting={isSubmitting}
        onAgregar={(idSlot, idRuta, dia, frecuencia) => cerrarDespues(agregarVisita(idSlot, idRuta, dia, frecuencia))}
        onCambiarFrecuencia={(id, frecuencia) => cerrarDespues(cambiarFrecuencia(id, frecuencia))}
        onQuitar={(id) => cerrarDespues(quitarVisita(id))}
        onCancel={() => setVisitaModal(null)}
      />
    </div>
  );
};

PlanificacionPage.getLayout = (page) => <AppLayout flush>{page}</AppLayout>;

export default PlanificacionPage;
