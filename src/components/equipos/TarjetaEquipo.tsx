"use client";

import Button from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { EquipoSupervisor } from '@/types';

interface TarjetaEquipoProps {
  equipo: EquipoSupervisor;
  mostrarSucursal: boolean;
  onGestionarVendedor: (idVendedor: number) => void;
  onReemplazar: (equipo: EquipoSupervisor) => void;
}

export default function TarjetaEquipo({ equipo, mostrarSucursal, onGestionarVendedor, onReemplazar }: TarjetaEquipoProps) {
  return (
    <article
      className={cn(
        'rounded-2xl border bg-white p-5 shadow-sm',
        equipo.activo ? 'border-gray-200' : 'border-amber-300 bg-amber-50/40'
      )}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">{equipo.nombre}</h3>
          <p className="text-xs text-gray-500">
            {mostrarSucursal && `${equipo.sucursal_nombre} · `}
            {equipo.vendedores.length} {equipo.vendedores.length === 1 ? 'vendedor' : 'vendedores'} · {equipo.total_slots}{' '}
            {equipo.total_slots === 1 ? 'slot' : 'slots'}
          </p>
        </div>
        {equipo.activo ? (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Activo</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              Supervisor inactivo
            </span>
            <Button size="sm" onClick={() => onReemplazar(equipo)}>
              Reemplazar supervisor
            </Button>
          </div>
        )}
      </header>

      {!equipo.activo && (
        <p className="mb-3 text-xs text-amber-800">
          Perdió el acceso o tiene baja. Sus slots y su planificación se conservan hasta que se lo reemplace.
        </p>
      )}

      {equipo.vendedores.length === 0 ? (
        <p className="text-sm text-gray-400">Sin vendedores asignados.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {equipo.vendedores.map((v) => (
            <li key={v.id_persona} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-gray-800">
                {v.nombre}
                {!v.tiene_slot && <span className="ml-2 text-xs text-gray-400">sin slot</span>}
              </span>
              <Button variant="secondary" size="sm" onClick={() => onGestionarVendedor(v.id_persona)}>
                Cambiar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
