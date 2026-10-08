"use client";

import Button from '@/components/ui/Button';
import type { ZonaItem } from '@/types';

interface ZonaTableProps {
  zonas: ZonaItem[];
  isLoading: boolean;
  /** Se muestra la columna de sucursal solo cuando el usuario ve más de una */
  mostrarSucursal: boolean;
  onEdit: (zona: ZonaItem) => void;
  onDelete: (zona: ZonaItem) => void;
  onSupervisor: (zona: ZonaItem) => void;
}

function SkeletonRow({ columnas }: { columnas: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: columnas }, (_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
        </td>
      ))}
    </tr>
  );
}

const ENCABEZADO = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500';

export default function ZonaTable({
  zonas,
  isLoading,
  mostrarSucursal,
  onEdit,
  onDelete,
  onSupervisor,
}: ZonaTableProps) {
  const columnas = mostrarSucursal ? 7 : 6;

  return (
    <section className="overflow-hidden rounded-card bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-bold text-gray-900">Zonas</h2>
        <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-semibold text-gray-600">
          {zonas.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className={ENCABEZADO}>Código</th>
              <th className={ENCABEZADO}>Zona</th>
              {mostrarSucursal && <th className={ENCABEZADO}>Sucursal</th>}
              <th className={ENCABEZADO}>Canal</th>
              <th className={ENCABEZADO}>Supervisor</th>
              <th className={ENCABEZADO}>Rutas</th>
              <th className={`${ENCABEZADO} text-right`}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <>
                <SkeletonRow columnas={columnas} />
                <SkeletonRow columnas={columnas} />
                <SkeletonRow columnas={columnas} />
              </>
            ) : zonas.length === 0 ? (
              <tr>
                <td colSpan={columnas} className="px-4 py-12 text-center text-sm text-gray-400">
                  No hay zonas registradas
                </td>
              </tr>
            ) : (
              zonas.map((zona) => {
                const tieneRutas = zona.total_rutas > 0;
                return (
                  <tr key={zona.id} className="transition-colors hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{zona.codigo_zona}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{zona.zona}</p>
                      {zona.descripcion_zona && <p className="text-xs text-gray-500">{zona.descripcion_zona}</p>}
                    </td>
                    {mostrarSucursal && <td className="px-4 py-3 text-gray-600">{zona.sucursal_nombre}</td>}
                    <td className="px-4 py-3 text-gray-600">{zona.canal_venta || '—'}</td>
                    <td className="px-4 py-3">
                      {zona.supervisor ? (
                        <span className="text-gray-900">{zona.supervisor.nombre}</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Sin supervisor
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{zona.total_rutas}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => onSupervisor(zona)}>
                          Supervisor
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => onEdit(zona)}>
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={tieneRutas}
                          title={tieneRutas ? 'No se puede eliminar: la zona tiene rutas asociadas' : 'Eliminar zona'}
                          onClick={() => onDelete(zona)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
