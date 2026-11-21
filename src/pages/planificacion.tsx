"use client";

import PageLoader from '@/components/ui/PageLoader';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useGestionSlots } from '@/hooks/useGestionSlots';
import { useMapaPlanificacion } from '@/hooks/useMapaPlanificacion';
import Button from '@/components/ui/Button';
import AppLayout from '@/components/layout/AppLayout';
import PlanificacionGrid from '@/components/planificacion/PlanificacionGrid';
import ConmutadorVista, { type VistaPlanificacion } from '@/components/planificacion/ConmutadorVista';
import VistaMapaPlanificacion from '@/components/planificacion/VistaMapaPlanificacion';
import BotonModoEdicion from '@/components/planificacion/BotonModoEdicion';
import AvisoModoEdicion from '@/components/planificacion/AvisoModoEdicion';
import LeyendaPlanificacion from '@/components/planificacion/LeyendaPlanificacion';
import ResumenSemana from '@/components/planificacion/ResumenSemana';
import VisitaModal, { type VisitaModalEstado } from '@/components/planificacion/VisitaModal';
import { useToastPosition } from '@/contexts/ToastContext';
import { useAtajoTecla } from '@/hooks/useAtajoTecla';
import { resumirPlanificacion, semanaIso } from '@/utils/planificacionResumen';
import { cn } from '@/utils/cn';
import { logger } from '@/lib/logger';
import type { PageWithLayout } from '@/types';

const PlanificacionPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Los slots son del supervisor: Gerencia tiene el permiso (para otorgar el rol) pero no equipo propio, y consulta
  // la planificación en Equipos y en Consulta
  const puedePlanificar = Boolean(user?.permisos.includes('planificacion:asignar') && user.roles.some((r) => r.codigo === 'SUPERVISOR'));

  useEffect(() => {
    if (!authLoading && user && !puedePlanificar) {
      router.replace('/').catch((navErr: unknown) => {
        logger.error('Error redirigiendo usuario sin permisos:', navErr);
      });
    }
  }, [authLoading, user, puedePlanificar, router]);

  // Los avisos salen por arriba: abajo quedan la hoja de la ficha y el «Deshacer» del mapa
  useToastPosition('top');

  const [editMode, setEditMode] = useState(false);
  // La vista inicial es el Mapa, que es la que ayuda a decidir (ADR-004 D1); el Calendario queda a un clic
  const [vistaElegida, setVistaElegida] = useState<VistaPlanificacion>('mapa');
  const [visitaModal, setVisitaModal] = useState<VisitaModalEstado | null>(null);
  const {
    listado,
    isLoading,
    isSubmitting,
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
    planificarEnMapa,
    quitarDelMapa,
  } = useGestionSlots();
  const { mapa, error: mapaError, isLoading: mapaCargando } = useMapaPlanificacion(
    !isLoading && listado.es_supervisor ? '/api/planificacion/mapa' : null
  );

  // Sin slots no hay nada que pintar: se queda en el Calendario, donde se agrega el primero
  const vista: VistaPlanificacion = listado.slots.length === 0 ? 'calendario' : vistaElegida;

  const resumen = useMemo(() => resumirPlanificacion(listado.slots, listado.visitas), [listado.slots, listado.visitas]);
  // La semana se fija al abrir la pantalla: así el render no depende del reloj
  const [semanaActual] = useState(() => semanaIso(new Date()));

  // La tecla E alterna el modo edición, solo donde ese modo existe (el calendario de un supervisor)
  const puedeEditar = !isLoading && listado.es_supervisor && vista === 'calendario';
  const alternarEdicion = () => setEditMode((v) => !v);
  useAtajoTecla('e', alternarEdicion, puedeEditar);

  // El mapa llena la ventana sin que la página se desplace; el calendario sí crece y se desplaza
  const enMapa = vista === 'mapa';

  const nombreDeSlot = (idSlot: number) => {
    const i = listado.slots.findIndex((s) => s.id === idSlot);
    return listado.slots[i]?.nombre ?? `Slot ${i + 1}`;
  };

  // El modal se cierra al terminar, con éxito o con error: abierto taparía el aviso del resultado
  const cerrarDespues = (accion: Promise<void>) => {
    setVisitaModal(null);
    accion.catch((err: unknown) => logger.error('Error en la accion del modal de visita:', err));
  };

  if (authLoading || !user) return null;
  if (!puedePlanificar) return null;

  return (
    <div className={cn('flex flex-col bg-gray-50', enMapa ? 'min-h-0 flex-1' : 'min-h-full flex-none')}>
      <div className="w-full space-y-4 px-4 pt-4 lg:px-6 lg:pt-6">
        {/* En el celular el conmutador comparte fila con el título y los botones del calendario bajan a su propia fila:
            así el conmutador queda en el mismo lugar en las dos vistas. Desde lg todo va en una sola fila */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="order-1 flex min-h-11 min-w-0 flex-1 items-center gap-3 lg:flex-none">
            <h1 className="truncate text-xl font-extrabold tracking-tight text-gray-900">Planificación de rutas</h1>
            {listado.es_supervisor && vista === 'calendario' && <LeyendaPlanificacion />}
          </div>
          {listado.es_supervisor && vista === 'calendario' && (
            <div className="order-3 flex min-h-11 w-full items-center justify-end gap-2 lg:order-2 lg:ml-auto lg:w-auto">
              {editMode && (
                <Button variant="secondary" onClick={() => void crearSlot()} disabled={isSubmitting || isLoading}>
                  Agregar slot
                </Button>
              )}
              <BotonModoEdicion editMode={editMode} onToggle={alternarEdicion} disabled={isLoading} />
            </div>
          )}
          {listado.es_supervisor && listado.slots.length > 0 && (
            <div className="order-2 flex min-h-11 shrink-0 items-center lg:order-3">
              <ConmutadorVista vista={vista} onCambiar={setVistaElegida} />
            </div>
          )}
        </div>

        {listado.es_supervisor && vista === 'calendario' && editMode && <AvisoModoEdicion />}
      </div>

      <div className={cn('w-full px-4 lg:px-6', enMapa ? 'flex min-h-0 flex-1 flex-col pb-4 pt-4' : 'space-y-4 py-6 lg:py-8')}>
        {isLoading ? (
          <PageLoader etiqueta="Cargando slots..." />
        ) : listado.slots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm font-medium text-gray-500">Todavía no tienes slots</p>
            <p className="mt-1 text-xs text-gray-400">
              Pulsa Editar, agrega el primero y asígnale un vendedor de tu equipo.
            </p>
          </div>
        ) : (
          <>
            {/* El mapa se monta una vez y se conserva oculto en el Calendario: no pierde el encuadre ni vuelve a pedir los polígonos */}
            <div className={cn(enMapa ? 'flex min-h-0 flex-1 flex-col' : 'hidden')}>
              <VistaMapaPlanificacion
                slots={listado.slots}
                visitas={listado.visitas}
                mapa={mapa}
                cargando={mapaCargando}
                error={mapaError}
                edicion={{
                  deshabilitado: isSubmitting,
                  planificar: planificarEnMapa,
                  quitar: quitarDelMapa,
                  cambiarFrecuencia,
                }}
              />
            </div>
            <div className={cn('space-y-4', enMapa && 'hidden')}>
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
            </div>
            {!enMapa && <ResumenSemana semana={semanaActual} resumen={resumen} />}
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

PlanificacionPage.getLayout = (page) => <AppLayout flush fullHeight>{page}</AppLayout>;

export default PlanificacionPage;
