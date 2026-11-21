"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useGestionEquipos } from '@/hooks/useGestionEquipos';
import { usePlanificacionSupervisor } from '@/hooks/usePlanificacionSupervisor';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import AppLayout from '@/components/layout/AppLayout';
import TarjetaEquipo from '@/components/equipos/TarjetaEquipo';
import SeleccionSupervisorModal from '@/components/equipos/SeleccionSupervisorModal';
import PlanificacionSupervisorModal from '@/components/equipos/PlanificacionSupervisorModal';
import { logger } from '@/lib/logger';
import type { EquipoSupervisor, PageWithLayout } from '@/types';

const GestionEquiposPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && !user.permisos.includes('personal:gestionar')) {
      router.replace('/').catch((navErr: unknown) => {
        logger.error('Error redirigiendo usuario sin permisos:', navErr);
      });
    }
  }, [authLoading, user, router]);

  const {
    listado,
    supervisoresActivos,
    isLoading,
    isSubmitting,
    toast,
    clearToast,
    vendedorTarget,
    supervisorSeleccion,
    setSupervisorSeleccion,
    openVendedor,
    openVendedorSinEquipo,
    closeVendedor,
    submitVendedor,
    reemplazoTarget,
    reemplazoSeleccion,
    setReemplazoSeleccion,
    openReemplazo,
    closeReemplazo,
    submitReemplazo,
    zonaTarget,
    zonaSeleccion,
    setZonaSeleccion,
    openZona,
    closeZona,
    submitZona,
  } = useGestionEquipos();

  const {
    objetivo: planificacionObjetivo,
    planificacion,
    isLoading: planificacionCargando,
    error: planificacionError,
    abrir: abrirPlanificacion,
    cerrar: cerrarPlanificacion,
  } = usePlanificacionSupervisor();

  if (authLoading || !user) return null;
  if (!user.permisos.includes('personal:gestionar')) return null;

  const inactivos = listado.equipos.filter((e) => !e.activo);
  const activos = listado.equipos.filter((e) => e.activo);

  const gestionarVendedorDe = (equipo: (typeof listado.equipos)[number], idVendedor: number) => {
    const vendedor = equipo.vendedores.find((v) => v.id_persona === idVendedor);
    if (!vendedor) return;
    openVendedor({
      id_persona: vendedor.id_persona,
      nombre: vendedor.nombre,
      id_sucursal: vendedor.id_sucursal,
      id_supervisor_actual: equipo.id_persona,
    });
  };

  const tarjetaDe = (equipo: EquipoSupervisor) => (
    <TarjetaEquipo
      key={equipo.id_persona}
      equipo={equipo}
      mostrarSucursal={listado.alcance_global}
      onGestionarVendedor={(id) => gestionarVendedorDe(equipo, id)}
      onReemplazar={openReemplazo}
      onVerPlanificacion={() => void abrirPlanificacion(equipo)}
    />
  );

  return (
    <div className="min-h-full bg-gray-50">
      <header className="px-6 pt-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Equipos de supervisores</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Quién está a cargo de cada vendedor. Cada vendedor pertenece a un solo equipo, de su misma sucursal.
          </p>
        </div>
      </header>

      {toast && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <Alert state={toast.type === 'success' ? 'success' : 'error'} onClose={clearToast}>
            {toast.message}
          </Alert>
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {isLoading ? (
          <p className="text-sm text-gray-400">Cargando equipos...</p>
        ) : (
          <>
            {inactivos.length > 0 && (
              <section aria-labelledby="titulo-inactivos" className="space-y-3">
                <h2 id="titulo-inactivos" className="text-sm font-bold uppercase tracking-wider text-amber-800">
                  Equipos esperando reemplazo ({inactivos.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {inactivos.map(tarjetaDe)}
                </div>
              </section>
            )}

            <section aria-labelledby="titulo-zonas" className="space-y-3">
              <h2 id="titulo-zonas" className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Zonas sin supervisor ({listado.zonas_sin_supervisor.length})
              </h2>
              {listado.zonas_sin_supervisor.length === 0 ? (
                <p className="text-sm text-gray-400">Todas las zonas tienen supervisor.</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-2xl border border-amber-200 bg-white shadow-sm">
                  {listado.zonas_sin_supervisor.map((z) => (
                    <li key={z.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <span className="text-sm text-gray-800">
                        {z.codigo_zona} — {z.zona}
                        <span className="ml-2 text-xs text-gray-400">
                          {listado.alcance_global && `${z.sucursal_nombre} · `}
                          {z.total_rutas} {z.total_rutas === 1 ? 'ruta' : 'rutas'}
                        </span>
                      </span>
                      <Button size="sm" onClick={() => openZona(z)}>
                        Asignar supervisor
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="titulo-sin-supervisor" className="space-y-3">
              <h2 id="titulo-sin-supervisor" className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Vendedores sin supervisor ({listado.sin_supervisor.length})
              </h2>
              {listado.sin_supervisor.length === 0 ? (
                <p className="text-sm text-gray-400">Todos los vendedores vigentes tienen supervisor.</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
                  {listado.sin_supervisor.map((v) => (
                    <li key={v.id_persona} className="flex items-center justify-between gap-3 px-5 py-3">
                      <span className="text-sm text-gray-800">
                        {v.nombre}
                        {listado.alcance_global && <span className="ml-2 text-xs text-gray-400">{v.sucursal_nombre}</span>}
                      </span>
                      <Button size="sm" onClick={() => openVendedorSinEquipo(v)}>
                        Asignar supervisor
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="titulo-activos" className="space-y-3">
              <h2 id="titulo-activos" className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Supervisores activos ({activos.length})
              </h2>
              {activos.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No hay supervisores con acceso. Otorga el rol Supervisor desde Accesos.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {activos.map(tarjetaDe)}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <SeleccionSupervisorModal
        open={vendedorTarget !== null}
        titulo="Supervisor del vendedor"
        descripcion={
          vendedorTarget && (
            <>
              {vendedorTarget.nombre}. Si cambia de supervisor, su slot anterior queda vacío y conserva las rutas
              planificadas.
            </>
          )
        }
        candidatos={supervisoresActivos}
        idSucursal={vendedorTarget?.id_sucursal ?? 0}
        etiquetaSinSupervisor="Sin supervisor"
        seleccion={supervisorSeleccion}
        onSeleccion={setSupervisorSeleccion}
        seleccionInicial={vendedorTarget?.id_supervisor_actual ?? null}
        textoConfirmar="Guardar"
        isSubmitting={isSubmitting}
        onConfirm={() => void submitVendedor()}
        onCancel={closeVendedor}
      />

      <SeleccionSupervisorModal
        open={zonaTarget !== null}
        titulo="Supervisor de la zona"
        descripcion={
          zonaTarget && (
            <>
              {zonaTarget.codigo_zona} — {zonaTarget.zona}. Quien la reciba verá la planificación de sus rutas que ya
              estuviera en sus slots.
            </>
          )
        }
        candidatos={supervisoresActivos}
        idSucursal={zonaTarget?.id_sucursal ?? 0}
        seleccion={zonaSeleccion}
        onSeleccion={setZonaSeleccion}
        textoConfirmar="Asignar"
        isSubmitting={isSubmitting}
        onConfirm={() => void submitZona()}
        onCancel={closeZona}
      />

      <SeleccionSupervisorModal
        open={reemplazoTarget !== null}
        titulo="Reemplazar supervisor"
        descripcion={
          reemplazoTarget && (
            <>
              Los {reemplazoTarget.vendedores.length} vendedores y los {reemplazoTarget.total_slots} slots de{' '}
              {reemplazoTarget.nombre} pasan al supervisor que elijas, con su planificación. Las zonas se asignan aparte
              en «Zonas sin supervisor».
            </>
          )
        }
        candidatos={supervisoresActivos}
        idSucursal={reemplazoTarget?.id_sucursal ?? 0}
        excluirId={reemplazoTarget?.id_persona ?? null}
        seleccion={reemplazoSeleccion}
        onSeleccion={setReemplazoSeleccion}
        textoConfirmar="Reemplazar"
        isSubmitting={isSubmitting}
        onConfirm={() => void submitReemplazo()}
        onCancel={closeReemplazo}
      />

      <PlanificacionSupervisorModal
        objetivo={planificacionObjetivo}
        planificacion={planificacion}
        isLoading={planificacionCargando}
        error={planificacionError}
        onClose={cerrarPlanificacion}
      />
    </div>
  );
};

GestionEquiposPage.getLayout = (page) => <AppLayout flush>{page}</AppLayout>;

export default GestionEquiposPage;
