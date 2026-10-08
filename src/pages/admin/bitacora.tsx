"use client";

import { useEffect, useState, useCallback, type ReactElement } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ACCIONES_BITACORA, formatToUtcString } from '@/utils/bitacoraUtils';
import { cn } from '@/utils/cn';
import { logger } from '@/lib/logger';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { PageWithLayout } from '@/types';

interface BitacoraRow {
  id: number;
  id_persona: number | null;
  auth_user_id: string | null;
  usuario_email: string;
  usuario_rol: string | null;
  modulo: string;
  accion: string;
  descripcion: string;
  direccion_ip: string | null;
  user_agent: string | null;
  detalles_json: Record<string, unknown> | null;
  created_at: string;
}

interface BitacoraApiResponse {
  data: BitacoraRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const MODULOS = ['TODOS', 'AUTENTICACION', 'ACCESOS', 'PERSONAL', 'TERRITORIO', 'SISTEMA'];
const ACCIONES = ['TODAS', ...ACCIONES_BITACORA];

function getModuloBadgeClasses(modulo: string): string {
  switch (modulo) {
    case 'AUTENTICACION':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'ACCESOS':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'PERSONAL':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'TERRITORIO':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'SISTEMA':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    default:
      return 'bg-neutral-50 text-neutral-700 border-neutral-200';
  }
}

function getAccionBadgeClasses(accion: string): string {
  switch (accion) {
    case 'INICIO_SESION':
      return 'bg-emerald-100 text-emerald-800';
    case 'CIERRE_SESION':
      return 'bg-slate-100 text-slate-700';
    case 'LOGIN_FALLIDO':
    case 'LOGIN_RECHAZADO':
      return 'bg-red-100 text-red-800';
    case 'BLOQUEO_TEMPORAL_15M':
    case 'BLOQUEO_TEMPORAL_1H':
    case 'BLOQUEO_PERMANENTE':
    case 'ALERTA_ATAQUE_DISTRIBUIDO':
      return 'bg-orange-100 text-orange-800';
    case 'DESBLOQUEO_CUENTA':
    case 'SOLICITUD_RECUPERACION_PASSWORD':
    case 'RECUPERACION_PASSWORD':
      return 'bg-violet-100 text-violet-800';
    case 'CREAR_PERSONAL':
    case 'INVITAR_USUARIO':
    case 'CREAR_SUCURSAL':
    case 'CREAR_CARGO':
    case 'CREAR_ZONA':
    case 'ASIGNAR_SUPERVISOR_ZONA':
      return 'bg-sky-100 text-sky-800';
    case 'EDITAR_PERSONAL':
    case 'EDITAR_SUCURSAL':
    case 'EDITAR_CARGO':
    case 'EDITAR_ZONA':
    case 'CAMBIO_PASSWORD':
      return 'bg-amber-100 text-amber-800';
    case 'BAJA_PERSONAL':
    case 'REVOCAR_ACCESO':
    case 'ELIMINAR_SUCURSAL':
    case 'ELIMINAR_CARGO':
    case 'ELIMINAR_ZONA':
    case 'QUITAR_SUPERVISOR_ZONA':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

const BitacoraPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [rows, setRows] = useState<BitacoraRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filtros
  const [moduloFiltro, setModuloFiltro] = useState('TODOS');
  const [accionFiltro, setAccionFiltro] = useState('TODAS');
  const [search, setSearch] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Modal de detalles
  const [selectedEvent, setSelectedEvent] = useState<BitacoraRow | null>(null);

  // Esc cierra el detalle del evento, igual que su botón de cerrar
  useEscapeKey(() => setSelectedEvent(null), selectedEvent !== null);

  // Guardia de permisos (bitacora:consultar)
  useEffect(() => {
    if (!authLoading && user && !user.permisos.includes('bitacora:consultar')) {
      router.replace('/dashboard').catch((navErr: unknown) => {
        logger.error('Error redirigiendo usuario sin permisos:', navErr);
      });
    }
  }, [authLoading, user, router]);

  const loadData = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: '20',
      });

      if (moduloFiltro !== 'TODOS') params.set('modulo', moduloFiltro);
      if (accionFiltro !== 'TODAS') params.set('accion', accionFiltro);
      if (search.trim()) params.set('search', search.trim());
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_hasta', fechaHasta);

      const res = await fetch(`/api/admin/bitacora?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Error al consultar los registros de auditoría');
      }

      const json: BitacoraApiResponse = await res.json();
      setRows(json.data);
      setTotal(json.pagination.total);
      setPage(json.pagination.page);
      setTotalPages(json.pagination.totalPages);
    } catch (err: unknown) {
      logger.error('Error cargando bitácora:', err);
      setFetchError('No fue posible cargar los eventos de la bitácora. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [moduloFiltro, accionFiltro, search, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (user?.permisos.includes('bitacora:consultar')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadData(1);
    }
  }, [loadData, user]);

  const handleResetFilters = () => {
    setModuloFiltro('TODOS');
    setAccionFiltro('TODAS');
    setSearch('');
    setFechaDesde('');
    setFechaHasta('');
    setPage(1);
  };

  if (authLoading || !user || !user.permisos.includes('bitacora:consultar')) {
    return null;
  }

  return (
    <div className="min-h-full bg-gray-50 pb-12">
      {/* Encabezado */}
      <header className="px-6 pt-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="m9 14 2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
                Bitácora de Auditoría del Sistema
              </h1>
              <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
                Registro inmutable de transacciones informáticas conforme al estándar UTC 0
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void loadData(page)}
              disabled={loading}
            >
              <svg className={cn("mr-1.5 h-4 w-4", loading && "animate-spin")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              Actualizar
            </Button>
          </div>
        </div>
      </header>

      {/* Banner de cumplimiento UTC 0 */}
      <section className="mx-auto max-w-7xl px-6 pt-5">
        <aside className="rounded-xl border border-blue-200 bg-blue-50/90 p-4 text-blue-900 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800">
              UTC
            </span>
            <div className="text-xs sm:text-sm">
              <strong className="font-semibold text-blue-950">Estándar de Seguridad y Trazabilidad (UTC 0):</strong>
              <span className="ml-1 text-blue-800">
                Todos los eventos se almacenan y muestran en Tiempo Universal Coordinado (UTC 0) según el requerimiento de auditoría de sistemas, evitando desfases de zonas horarias locales y garantizando trazabilidad cronológica absoluta.
              </span>
            </div>
          </div>
        </aside>
      </section>

      {/* Barra de Filtros */}
      <section className="mx-auto max-w-7xl px-6 pt-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Input
                label="Buscar (Email / Detalle)"
                compact
                type="text"
                placeholder="ej. gerencia@..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="modulo-select" className="block text-xs font-semibold text-gray-700">
                Módulo
              </label>
              <select
                id="modulo-select"
                value={moduloFiltro}
                onChange={(e) => setModuloFiltro(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-xs focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 sm:text-sm"
              >
                {MODULOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="accion-select" className="block text-xs font-semibold text-gray-700">
                Acción
              </label>
              <select
                id="accion-select"
                value={accionFiltro}
                onChange={(e) => setAccionFiltro(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-xs focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 sm:text-sm"
              >
                {ACCIONES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fecha-desde" className="block text-xs font-semibold text-gray-700">
                Desde (Fecha UTC)
              </label>
              <input
                id="fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-xs focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="fecha-hasta" className="block text-xs font-semibold text-gray-700">
                Hasta (Fecha UTC)
              </label>
              <input
                id="fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-xs focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-500">
              Total eventos registrados: <strong className="font-semibold text-gray-800">{total}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleResetFilters}
              >
                Limpiar filtros
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void loadData(1)}
              >
                Aplicar filtros
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mensaje de error si falla la carga */}
      {fetchError && (
        <section className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
            {fetchError}
          </div>
        </section>
      )}

      {/* Tabla de Resultados */}
      <main className="mx-auto max-w-7xl px-6 pt-6">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-3 sm:px-6">
                    Fecha y Hora (UTC 0)
                  </th>
                  <th scope="col" className="px-4 py-3 sm:px-6">
                    Módulo
                  </th>
                  <th scope="col" className="px-4 py-3 sm:px-6">
                    Acción
                  </th>
                  <th scope="col" className="px-4 py-3 sm:px-6">
                    Usuario / Rol
                  </th>
                  <th scope="col" className="px-4 py-3 sm:px-6">
                    Descripción
                  </th>
                  <th scope="col" className="px-4 py-3 text-right sm:px-6">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg className="h-6 w-6 animate-spin text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                        </svg>
                        <span>Cargando eventos de bitácora...</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p className="text-sm font-semibold text-gray-700">No se encontraron eventos</p>
                        <p className="text-xs text-gray-400">Prueba ajustando los filtros de búsqueda o fecha.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="transition hover:bg-gray-50/80">
                      {/* Fecha y Hora UTC 0 */}
                      <td className="whitespace-nowrap px-4 py-3.5 sm:px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-gray-900">
                            {formatToUtcString(row.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Módulo */}
                      <td className="whitespace-nowrap px-4 py-3.5 sm:px-6">
                        <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold", getModuloBadgeClasses(row.modulo))}>
                          {row.modulo}
                        </span>
                      </td>

                      {/* Acción */}
                      <td className="whitespace-nowrap px-4 py-3.5 sm:px-6">
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", getAccionBadgeClasses(row.accion))}>
                          {row.accion}
                        </span>
                      </td>

                      {/* Usuario / Rol */}
                      <td className="px-4 py-3.5 sm:px-6">
                        <div className="flex flex-col">
                          <span className="truncate font-medium text-gray-900" title={row.usuario_email}>
                            {row.usuario_email}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {row.usuario_rol ? (
                              <span className="font-mono text-gray-600">{row.usuario_rol}</span>
                            ) : (
                              'Invitado / Anónimo'
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Descripción */}
                      <td className="px-4 py-3.5 text-gray-700 sm:px-6">
                        <p className="line-clamp-2 text-xs sm:text-sm" title={row.descripcion}>
                          {row.descripcion}
                        </p>
                      </td>

                      {/* Botón Ver detalles */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-right sm:px-6">
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(row)}
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 hover:text-gray-900"
                        >
                          Detalles
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 bg-gray-50/50 px-4 py-3 sm:px-6">
            <span className="text-xs text-gray-600">
              Página <strong className="font-semibold text-gray-900">{page}</strong> de{' '}
              <strong className="font-semibold text-gray-900">{totalPages}</strong> ({total} registros en total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => void loadData(page - 1)}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => void loadData(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </footer>
        </div>
      </main>

      {/* Modal de Detalle Completo de Evento */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", getAccionBadgeClasses(selectedEvent.accion))}>
                  {selectedEvent.accion}
                </span>
                <h3 className="mt-2 text-base font-bold text-gray-900">
                  Transacción de Auditoría #{selectedEvent.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar modal"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs sm:text-sm">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Fecha y Hora Oficial (UTC 0)
                </span>
                <span className="font-mono font-semibold text-gray-900">
                  {formatToUtcString(selectedEvent.created_at)}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Módulo y Operación
                </span>
                <span className="font-medium text-gray-800">
                  {selectedEvent.modulo} &bull; {selectedEvent.accion}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Usuario Responsable
                </span>
                <span className="font-medium text-gray-800">
                  {selectedEvent.usuario_email} ({selectedEvent.usuario_rol ?? 'Sin rol asignado'})
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Descripción
                </span>
                <p className="rounded-lg bg-gray-50 p-2.5 text-gray-800">
                  {selectedEvent.descripcion}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Dirección IP
                  </span>
                  <span className="font-mono text-gray-700">
                    {selectedEvent.direccion_ip || 'No capturada'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    ID Persona Vinculada
                  </span>
                  <span className="font-mono text-gray-700">
                    {selectedEvent.id_persona ?? 'Ninguna'}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Agente de Usuario (User-Agent)
                </span>
                <p className="break-all font-mono text-[11px] text-gray-600">
                  {selectedEvent.user_agent || 'Desconocido'}
                </p>
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Metadatos / Contexto JSON
                </span>
                <pre className="mt-1 max-h-48 overflow-auto rounded-xl bg-gray-900 p-3 font-mono text-xs text-emerald-400">
                  {JSON.stringify(selectedEvent.detalles_json ?? {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedEvent(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

BitacoraPage.getLayout = (page: ReactElement) => <AppLayout flush>{page}</AppLayout>;

export default BitacoraPage;
